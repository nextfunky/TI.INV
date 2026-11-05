import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";

import { itens, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { plural } from "@/lib/texto/plural";

import { CAMPOS_ITEM_COM_TIPO, juntarItemETipo, type ItemComTipo } from "./servico";
import {
  CATEGORIAS,
  ITENS_POR_PAGINA,
  MAXIMO_NA_BUSCA,
  NOME_DA_CATEGORIA,
  STATUS,
  type Categoria,
  type Status,
} from "./valores";

export type FiltrosDoInventario = {
  categoria?: Categoria;
  status?: Status;
  pagina: number;
};

/** Lê os filtros do endereço (?categoria=periferico&status=em_uso&pagina=2), ignorando valores inválidos. */
export function lerFiltros(parametros: Record<string, string | string[] | undefined>): FiltrosDoInventario {
  const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const categoria = texto(parametros.categoria);
  const status = texto(parametros.status);
  const pagina = Number(texto(parametros.pagina));
  return {
    categoria: (CATEGORIAS as readonly string[]).includes(categoria ?? "") ? (categoria as Categoria) : undefined,
    status: (STATUS as readonly string[]).includes(status ?? "") ? (status as Status) : undefined,
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Monta o endereço do Inventário com os filtros. Mudar um filtro volta para a página 1. */
export function enderecoDoInventario(filtros: Partial<FiltrosDoInventario>): string {
  const p = new URLSearchParams();
  if (filtros.categoria) p.set("categoria", filtros.categoria);
  if (filtros.status) p.set("status", filtros.status);
  if (filtros.pagina && filtros.pagina > 1) p.set("pagina", String(filtros.pagina));
  const consulta = p.toString();
  return consulta ? `/inventario?${consulta}` : "/inventario";
}

// Ordena pelo código: primeiro as letras, depois o número (DSK0002 antes de DSK0010 e de DSK10000).
const ORDEM_DO_CODIGO = [
  sql`regexp_replace(${itens.codigo}, '[0-9]+$', '')`,
  sql`(regexp_replace(${itens.codigo}, '^[A-Z]+', ''))::integer`,
];

/** Totais sem os descartados: "8 itens · 3 computadores, 5 periféricos". */
export async function totaisDoInventario(db: Banco) {
  const linhas = await db
    .select({ categoria: tiposDeItem.categoria, total: count() })
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .where(ne(itens.status, "descartado"))
    .groupBy(tiposDeItem.categoria);

  const porCategoria = Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<Categoria, number>;
  for (const l of linhas) porCategoria[l.categoria] = l.total;
  const total = CATEGORIAS.reduce((soma, c) => soma + porCategoria[c], 0);
  return { total, porCategoria };
}

/** "3 computadores, 5 periféricos" (as categorias com zero ficam de fora). */
export function textoPorCategoria(porCategoria: Record<Categoria, number>, separador = ", "): string {
  return CATEGORIAS.filter((c) => porCategoria[c] > 0)
    .map((c) =>
      plural(porCategoria[c], NOME_DA_CATEGORIA[c].singular.toLocaleLowerCase("pt-BR"), NOME_DA_CATEGORIA[c].plural),
    )
    .join(separador);
}

/** O resumo no topo do Inventário. */
export function resumoDoInventario(
  totais: { total: number; porCategoria: Record<Categoria, number> },
  mostrando: number,
  filtrado: boolean,
): string {
  if (filtrado) return `Mostrando ${mostrando} de ${plural(totais.total, "item", "itens")}`;
  if (totais.total === 0) return "Nenhum item cadastrado";
  return `${plural(totais.total, "item", "itens")} · ${textoPorCategoria(totais.porCategoria)}`;
}

/** A lista do Inventário: filtrada, em ordem de código, 50 por página. */
export async function listarItens(db: Banco, filtros: FiltrosDoInventario) {
  const condicoes: SQL[] = [];
  if (filtros.categoria) condicoes.push(eq(tiposDeItem.categoria, filtros.categoria));
  // Sem filtro de status, os descartados ficam de fora.
  condicoes.push(filtros.status ? eq(itens.status, filtros.status) : ne(itens.status, "descartado"));
  const onde = and(...condicoes);

  const [{ total }] = await db
    .select({ total: count() })
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .where(onde);

  const paginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const pagina = Math.min(filtros.pagina, paginas);

  const linhas = await db
    .select(CAMPOS_ITEM_COM_TIPO)
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .where(onde)
    .orderBy(...ORDEM_DO_CODIGO)
    .limit(ITENS_POR_PAGINA)
    .offset((pagina - 1) * ITENS_POR_PAGINA);

  return { itens: linhas.map(juntarItemETipo), total, pagina, paginas };
}

function escaparBusca(termo: string): string {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Busca rápida ("Editar item" e Ctrl+K): código, hostname, nº de série,
 * marca, modelo e tipo. Inclui os descartados. Sem texto: os atualizados
 * por último. No máximo 8.
 */
export async function buscarItens(db: Banco, termo: string): Promise<ItemComTipo[]> {
  const texto = termo.trim();
  const consulta = db
    .select(CAMPOS_ITEM_COM_TIPO)
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .$dynamic();

  if (texto) {
    const padrao = `%${escaparBusca(texto)}%`;
    consulta.where(
      or(
        ilike(itens.codigo, padrao),
        ilike(itens.hostname, padrao),
        ilike(itens.numeroSerie, padrao),
        ilike(itens.marca, padrao),
        ilike(itens.modelo, padrao),
        ilike(sql`concat_ws(' ', ${itens.marca}, ${itens.modelo})`, padrao),
        ilike(tiposDeItem.nome, padrao),
      ),
    );
  }

  const linhas = await consulta.orderBy(desc(itens.atualizadoEm), asc(itens.id)).limit(MAXIMO_NA_BUSCA);
  return linhas.map(juntarItemETipo);
}
