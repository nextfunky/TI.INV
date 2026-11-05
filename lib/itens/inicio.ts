import { and, asc, between, count, desc, eq, isNotNull, ne } from "drizzle-orm";

import { itens, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { somarDias } from "@/lib/texto/data";

import { totaisDoInventario } from "./consultas";
import { CAMPOS_ITEM_COM_TIPO, juntarItemETipo } from "./servico";
import { DIAS_PARA_AVISAR_GARANTIA, type Status } from "./valores";

/** Tudo o que o Início mostra. Os descartados nunca contam nos totais. */
export async function painelDoInicio(db: Banco, hoje: string) {
  const totais = await totaisDoInventario(db);

  const porStatus = await db
    .select({ status: itens.status, total: count() })
    .from(itens)
    .groupBy(itens.status);
  const quantidade = (s: Status) => porStatus.find((l) => l.status === s)?.total ?? 0;

  const emManutencao = await db
    .select(CAMPOS_ITEM_COM_TIPO)
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .where(eq(itens.status, "em_manutencao"))
    .orderBy(desc(itens.atualizadoEm))
    .limit(3);

  // Garantias que vencem de hoje até daqui a 60 dias, da mais próxima para a mais distante.
  const garantias = await db
    .select(CAMPOS_ITEM_COM_TIPO)
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .where(
      and(
        ne(itens.status, "descartado"),
        isNotNull(itens.garantiaAte),
        between(itens.garantiaAte, hoje, somarDias(hoje, DIAS_PARA_AVISAR_GARANTIA)),
      ),
    )
    .orderBy(asc(itens.garantiaAte), asc(itens.codigo))
    .limit(5);

  const recentes = await db
    .select(CAMPOS_ITEM_COM_TIPO)
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .orderBy(desc(itens.atualizadoEm), desc(itens.id))
    .limit(5);

  return {
    total: totais.total,
    porCategoria: totais.porCategoria,
    emUso: quantidade("em_uso"),
    emEstoque: quantidade("em_estoque"),
    emManutencao: quantidade("em_manutencao"),
    itensEmManutencao: emManutencao.map(juntarItemETipo),
    garantias: garantias.map(juntarItemETipo),
    recentes: recentes.map(juntarItemETipo),
  };
}
