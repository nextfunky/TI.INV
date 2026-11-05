import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";

import { colaboradores, itens, locais, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { plural } from "@/lib/texto/plural";

import type { FiltrosDoInventario } from "./filtros";
import { comOsDeDentro } from "@/lib/locais/arvore";

import { consultaDeItens, juntarItemETipo, LOCAL_ATUAL, type ItemComTipo } from "./servico";
import { CATEGORIAS, ITENS_POR_PAGINA, MAXIMO_NA_BUSCA, NOME_DA_CATEGORIA, type Categoria } from "./valores";

export { enderecoDoInventario, lerFiltros, temFiltro, type FiltrosDoInventario } from "./filtros";

// Ordena pelo código: primeiro as letras, depois o número (DSK0002 antes de DSK0010 e de DSK10000).
export const ORDEM_DO_CODIGO = [
  sql`regexp_replace(${itens.codigo}, '[0-9]+$', '')`,
  sql`(regexp_replace(${itens.codigo}, '^[A-Z]+', ''))::integer`,
];

function escaparBusca(termo: string): string {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Procura o texto no código, hostname, nº de série, marca, modelo, tipo e
 * no nome de quem usa. Sem diferença de maiúsculas, por parte do texto.
 */
export function condicaoDeBusca(termo: string): SQL | undefined {
  const padrao = `%${escaparBusca(termo.trim())}%`;
  return or(
    ilike(itens.codigo, padrao),
    ilike(itens.hostname, padrao),
    ilike(itens.numeroSerie, padrao),
    ilike(itens.marca, padrao),
    ilike(itens.modelo, padrao),
    ilike(sql`concat_ws(' ', ${itens.marca}, ${itens.modelo})`, padrao),
    ilike(tiposDeItem.nome, padrao),
    ilike(colaboradores.nome, padrao),
  );
}

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

/**
 * "18 computadores, 30 periféricos, 4 de impressão" (as categorias com zero ficam de fora).
 * Com `maximo`, mostra só as maiores e junta o resto: "81 de telefonia · 30 periféricos · mais 5 categorias".
 */
export function textoPorCategoria(porCategoria: Record<Categoria, number>, separador = ", ", maximo?: number): string {
  let categorias = CATEGORIAS.filter((c) => porCategoria[c] > 0);
  let resto = 0;
  if (maximo && categorias.length > maximo) {
    categorias = [...categorias].sort((a, b) => porCategoria[b] - porCategoria[a]);
    resto = categorias.length - maximo;
    categorias = categorias.slice(0, maximo);
  }
  const partes = categorias.map((c) => plural(porCategoria[c], ...NOME_DA_CATEGORIA[c].contagem));
  if (resto) partes.push(`mais ${plural(resto, "categoria", "categorias")}`);
  return partes.join(separador);
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
  const condicoes: Array<SQL | undefined> = [];
  if (filtros.busca) condicoes.push(condicaoDeBusca(filtros.busca));
  if (filtros.categoria) condicoes.push(eq(tiposDeItem.categoria, filtros.categoria));
  if (filtros.tipo) condicoes.push(eq(itens.tipoId, filtros.tipo));
  if (filtros.condicao) condicoes.push(eq(itens.condicao, filtros.condicao));
  if (filtros.pessoa) condicoes.push(eq(itens.usuarioId, filtros.pessoa));
  // O local atual (o da pessoa ou o do item), incluindo os locais de dentro.
  if (filtros.local === "sem") condicoes.push(sql`${LOCAL_ATUAL} is null`);
  else if (filtros.local) {
    const arvore = await db.select({ id: locais.id, nome: locais.nome, paiId: locais.paiId }).from(locais);
    condicoes.push(inArray(LOCAL_ATUAL, comOsDeDentro(arvore, filtros.local)));
  }
  // Sem filtro de status, os descartados ficam de fora.
  condicoes.push(filtros.status ? eq(itens.status, filtros.status) : ne(itens.status, "descartado"));
  const onde = and(...condicoes);

  const [{ total }] = await db
    .select({ total: count() })
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .leftJoin(colaboradores, eq(colaboradores.id, itens.usuarioId))
    .leftJoin(locais, eq(locais.id, LOCAL_ATUAL))
    .where(onde);

  const paginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const pagina = Math.min(filtros.pagina, paginas);

  const linhas = await consultaDeItens(db)
    .where(onde)
    .orderBy(...ORDEM_DO_CODIGO)
    .limit(ITENS_POR_PAGINA)
    .offset((pagina - 1) * ITENS_POR_PAGINA);

  return { itens: linhas.map(juntarItemETipo), total, pagina, paginas };
}

/**
 * Busca rápida ("Editar item" e Ctrl+K). Inclui os descartados.
 * Sem texto: os atualizados por último. No máximo 8.
 */
export async function buscarItens(db: Banco, termo: string): Promise<ItemComTipo[]> {
  const consulta = consultaDeItens(db);
  if (termo.trim()) consulta.where(condicaoDeBusca(termo));
  const linhas = await consulta.orderBy(desc(itens.atualizadoEm), asc(itens.id)).limit(MAXIMO_NA_BUSCA);
  return linhas.map(juntarItemETipo);
}
