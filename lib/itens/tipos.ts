import { asc, count, eq, sql } from "drizzle-orm";

import { itens, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";

import type { DadosDoTipo } from "./regras";
import type { Categoria } from "./valores";

export type TipoDeItem = typeof tiposDeItem.$inferSelect;

export type TipoComContagem = TipoDeItem & {
  /** Itens do tipo, sem os descartados. */
  itensAtivos: number;
  /** Itens descartados do tipo. */
  itensDescartados: number;
};

const ORDEM_DA_CATEGORIA = sql`case ${tiposDeItem.categoria} when 'computador' then 0 when 'periferico' then 1 else 2 end`;

/** Todos os tipos, agrupados por categoria e em ordem alfabética. */
export async function listarTipos(db: Banco): Promise<TipoDeItem[]> {
  return db.select().from(tiposDeItem).orderBy(ORDEM_DA_CATEGORIA, asc(tiposDeItem.nome));
}

/** Os tipos com quantos itens cada um tem. */
export async function listarTiposComContagem(db: Banco): Promise<TipoComContagem[]> {
  const linhas = await db
    .select({
      tipo: tiposDeItem,
      itensAtivos: sql<number>`count(${itens.id}) filter (where ${itens.status} <> 'descartado')`.mapWith(Number),
      itensDescartados: sql<number>`count(${itens.id}) filter (where ${itens.status} = 'descartado')`.mapWith(Number),
    })
    .from(tiposDeItem)
    .leftJoin(itens, eq(itens.tipoId, tiposDeItem.id))
    .groupBy(tiposDeItem.id)
    .orderBy(ORDEM_DA_CATEGORIA, asc(tiposDeItem.nome));
  return linhas.map((l) => ({ ...l.tipo, itensAtivos: l.itensAtivos, itensDescartados: l.itensDescartados }));
}

export async function obterTipo(db: Banco, id: number): Promise<TipoComContagem | null> {
  const todos = await listarTiposComContagem(db);
  return todos.find((t) => t.id === id) ?? null;
}

async function quantidadeDeItens(db: Banco, tipoId: number): Promise<number> {
  const [linha] = await db.select({ total: count() }).from(itens).where(eq(itens.tipoId, tipoId));
  return linha?.total ?? 0;
}

/**
 * A categoria só pode mudar quando nada se perde: deixar de ser Computador
 * apagaria os dados de hardware dos itens, então só é possível sem itens.
 */
export function podeMudarCategoria(atual: Categoria, nova: Categoria, temItens: boolean): boolean {
  if (atual === nova) return true;
  if (atual === "computador") return !temItens;
  return true;
}

type ErrosDoTipo = Partial<Record<"nome" | "categoria" | "prefixo", string>>;

async function nomeJaExiste(db: Banco, nome: string, ignorarId?: number): Promise<boolean> {
  const chave = nome.toLocaleLowerCase("pt-BR");
  const todos = await db.select({ id: tiposDeItem.id, nome: tiposDeItem.nome }).from(tiposDeItem);
  return todos.some((t) => t.id !== ignorarId && t.nome.toLocaleLowerCase("pt-BR") === chave);
}

export async function criarTipo(
  db: Banco,
  dados: DadosDoTipo & { prefixo: string },
): Promise<{ criado: true; tipo: TipoDeItem } | { criado: false; erros: ErrosDoTipo }> {
  const erros: ErrosDoTipo = {};
  if (await nomeJaExiste(db, dados.nome)) erros.nome = "Já existe um tipo com este nome.";
  const [mesmoPrefixo] = await db
    .select({ id: tiposDeItem.id })
    .from(tiposDeItem)
    .where(eq(tiposDeItem.prefixo, dados.prefixo));
  if (mesmoPrefixo) erros.prefixo = "Já existe um tipo com este prefixo.";
  if (Object.keys(erros).length) return { criado: false, erros };

  const [tipo] = await db
    .insert(tiposDeItem)
    .values({ nome: dados.nome, categoria: dados.categoria, prefixo: dados.prefixo })
    .returning();
  return { criado: true, tipo };
}

/** Muda o nome e a categoria. O prefixo nunca muda depois de criado. */
export async function editarTipo(
  db: Banco,
  id: number,
  dados: DadosDoTipo,
): Promise<{ salvo: true } | { salvo: false; erros: ErrosDoTipo } | { salvo: false; naoEncontrado: true }> {
  const [atual] = await db.select().from(tiposDeItem).where(eq(tiposDeItem.id, id));
  if (!atual) return { salvo: false, naoEncontrado: true };

  const erros: ErrosDoTipo = {};
  if (await nomeJaExiste(db, dados.nome, id)) erros.nome = "Já existe um tipo com este nome.";
  const temItens = (await quantidadeDeItens(db, id)) > 0;
  if (!podeMudarCategoria(atual.categoria, dados.categoria, temItens)) {
    erros.categoria = "Este tipo tem itens com dados de computador. Ele só deixa de ser Computador sem itens.";
  }
  if (Object.keys(erros).length) return { salvo: false, erros };

  await db
    .update(tiposDeItem)
    .set({ nome: dados.nome, categoria: dados.categoria })
    .where(eq(tiposDeItem.id, id));
  return { salvo: true };
}

/** Só exclui tipos sem nenhum item (nem descartados). */
export async function excluirTipo(
  db: Banco,
  id: number,
): Promise<{ excluido: true; nome: string } | { excluido: false; motivo: "tem_itens" | "nao_encontrado" }> {
  const [atual] = await db.select().from(tiposDeItem).where(eq(tiposDeItem.id, id));
  if (!atual) return { excluido: false, motivo: "nao_encontrado" };
  if ((await quantidadeDeItens(db, id)) > 0) return { excluido: false, motivo: "tem_itens" };
  await db.delete(tiposDeItem).where(eq(tiposDeItem.id, id));
  return { excluido: true, nome: atual.nome };
}
