import { and, asc, count, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";

import { colaboradores, itens } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { condicaoDeBusca, ORDEM_DO_CODIGO } from "@/lib/itens/consultas";
import { consultaDeItens, juntarItemETipo, type ItemComTipo } from "@/lib/itens/servico";
import { ITENS_POR_PAGINA } from "@/lib/itens/valores";

/**
 * As regras dos colaboradores (as pessoas que usam os equipamentos).
 * Recebem o banco como parâmetro, para poderem ser testadas com um banco em memória.
 */

export type Colaborador = typeof colaboradores.$inferSelect;

/**
 * A chave que impede nomes repetidos: espaços colapsados e tudo em minúsculas,
 * inclusive as letras acentuadas. "JOÃO LIMA" = "joão lima"; "Joao" ≠ "João".
 */
export function chaveDoNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

const NOME_REPETIDO = "Já existe um colaborador com este nome.";

async function nomeJaExiste(db: Banco, chave: string, ignorarId?: number): Promise<boolean> {
  const [linha] = await db
    .select({ id: colaboradores.id })
    .from(colaboradores)
    .where(ignorarId ? and(eq(colaboradores.chave, chave), ne(colaboradores.id, ignorarId)) : eq(colaboradores.chave, chave));
  return Boolean(linha);
}

export async function criarColaborador(
  db: Banco,
  nome: string,
): Promise<{ criado: true; colaborador: Colaborador } | { criado: false; erro: string }> {
  const chave = chaveDoNome(nome);
  if (await nomeJaExiste(db, chave)) return { criado: false, erro: NOME_REPETIDO };
  const [colaborador] = await db.insert(colaboradores).values({ nome, chave }).onConflictDoNothing().returning();
  // Se outra aba cadastrou o mesmo nome no mesmo instante, o banco segura.
  return colaborador ? { criado: true, colaborador } : { criado: false, erro: NOME_REPETIDO };
}

/** Renomear muda o nome em todos os itens da pessoa, porque eles apontam para ela. */
export async function editarColaborador(
  db: Banco,
  id: number,
  nome: string,
): Promise<{ salvo: true } | { salvo: false; erro: string } | { salvo: false; naoEncontrado: true }> {
  const chave = chaveDoNome(nome);
  if (await nomeJaExiste(db, chave, id)) return { salvo: false, erro: NOME_REPETIDO };
  const [salvo] = await db
    .update(colaboradores)
    .set({ nome, chave, atualizadoEm: sql`now()` })
    .where(eq(colaboradores.id, id))
    .returning({ id: colaboradores.id });
  return salvo ? { salvo: true } : { salvo: false, naoEncontrado: true };
}

/** Só exclui quem não tem nenhum item, nem descartado. */
export async function excluirColaborador(
  db: Banco,
  id: number,
): Promise<{ excluido: true; nome: string } | { excluido: false; motivo: "tem_itens" | "nao_encontrado"; nome?: string }> {
  const [pessoa] = await db.select().from(colaboradores).where(eq(colaboradores.id, id));
  if (!pessoa) return { excluido: false, motivo: "nao_encontrado" };
  const [{ total }] = await db.select({ total: count() }).from(itens).where(eq(itens.usuarioId, id));
  if (total > 0) return { excluido: false, motivo: "tem_itens", nome: pessoa.nome };
  await db.delete(colaboradores).where(eq(colaboradores.id, id));
  return { excluido: true, nome: pessoa.nome };
}

// Quantos itens a pessoa tem, sem os descartados.
const ITENS_ATIVOS = sql<number>`count(${itens.id}) filter (where ${itens.status} <> 'descartado')`.mapWith(Number);
const TODOS_OS_ITENS = sql<number>`count(${itens.id})`.mapWith(Number);

function escaparBusca(termo: string): string {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** A lista de colaboradores: busca por parte do nome, ordem alfabética, 50 por página. */
export async function listarColaboradores(db: Banco, filtros: { busca?: string; pagina: number }) {
  const onde = filtros.busca ? ilike(colaboradores.nome, `%${escaparBusca(filtros.busca.trim())}%`) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(colaboradores).where(onde);
  const paginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const pagina = Math.min(filtros.pagina, paginas);

  const linhas = await db
    .select({ id: colaboradores.id, nome: colaboradores.nome, itens: ITENS_ATIVOS })
    .from(colaboradores)
    .leftJoin(itens, eq(itens.usuarioId, colaboradores.id))
    .where(onde)
    .groupBy(colaboradores.id)
    .orderBy(asc(colaboradores.chave))
    .limit(ITENS_POR_PAGINA)
    .offset((pagina - 1) * ITENS_POR_PAGINA);

  return { colaboradores: linhas, total, pagina, paginas };
}

/** Quantos colaboradores existem (para o "12 pessoas" do cabeçalho). */
export async function totalDeColaboradores(db: Banco): Promise<number> {
  const [{ total }] = await db.select({ total: count() }).from(colaboradores);
  return total;
}

/** Uma pessoa, com quantos itens ela tem (sem os descartados) e no total. */
export async function obterColaborador(db: Banco, id: number) {
  const [linha] = await db
    .select({ id: colaboradores.id, nome: colaboradores.nome, itensAtivos: ITENS_ATIVOS, totalDeItens: TODOS_OS_ITENS })
    .from(colaboradores)
    .leftJoin(itens, eq(itens.usuarioId, colaboradores.id))
    .where(eq(colaboradores.id, id))
    .groupBy(colaboradores.id);
  return linha ?? null;
}

/** Todas as pessoas, para a lista "Usuário" do formulário de item. */
export async function listarParaEscolha(db: Banco): Promise<Array<{ id: number; nome: string }>> {
  return db.select({ id: colaboradores.id, nome: colaboradores.nome }).from(colaboradores).orderBy(asc(colaboradores.chave));
}

/** Os itens com a pessoa, sem os descartados, em ordem de código. */
export async function itensDaPessoa(db: Banco, id: number): Promise<ItemComTipo[]> {
  const linhas = await consultaDeItens(db)
    .where(and(eq(itens.usuarioId, id), ne(itens.status, "descartado")))
    .orderBy(...ORDEM_DO_CODIGO);
  return linhas.map(juntarItemETipo);
}

/** "Também com João Lima": até 5 outros itens da mesma pessoa, sem os descartados. */
export async function tambemCom(db: Banco, usuarioId: number, exceto: number) {
  const onde = and(eq(itens.usuarioId, usuarioId), ne(itens.status, "descartado"), ne(itens.id, exceto));
  const [{ total }] = await db.select({ total: count() }).from(itens).where(onde);
  const linhas = await consultaDeItens(db).where(onde).orderBy(...ORDEM_DO_CODIGO).limit(5);
  return { itens: linhas.map(juntarItemETipo), total };
}

// ─── Vincular e devolver (pela página da pessoa) ───────────────────────────

/** Ao receber uma pessoa, um item em estoque passa para "Em uso" (como no formulário). */
const STATUS_AO_VINCULAR = sql`case when ${itens.status} = 'em_estoque' then 'em_uso'::status_do_item else ${itens.status} end`;
/** Ao sair da pessoa, um item em uso volta para "Em estoque". */
const STATUS_AO_DEVOLVER = sql`case when ${itens.status} = 'em_uso' then 'em_estoque'::status_do_item else ${itens.status} end`;

/**
 * Os itens que podem ir para a pessoa: todos menos os descartados e os que
 * já estão com ela. Os sem usuário vêm primeiro. No máximo 50 por vez.
 */
export async function itensParaVincular(db: Banco, pessoaId: number, termo: string): Promise<ItemComTipo[]> {
  const condicoes = [
    ne(itens.status, "descartado"),
    or(isNull(itens.usuarioId), ne(itens.usuarioId, pessoaId)),
    termo.trim() ? condicaoDeBusca(termo) : undefined,
  ];
  const linhas = await consultaDeItens(db)
    .where(and(...condicoes))
    .orderBy(sql`${itens.usuarioId} is not null`, ...ORDEM_DO_CODIGO)
    .limit(50);
  return linhas.map(juntarItemETipo);
}

/** Passa os itens escolhidos para a pessoa (inclusive os que estavam com outra). */
export async function vincularItens(
  db: Banco,
  pessoaId: number,
  ids: number[],
): Promise<{ ok: true; nome: string; codigos: string[] } | { ok: false; motivo: "pessoa_nao_encontrada" }> {
  return db.transaction(async (tx) => {
    const [pessoa] = await tx.select({ nome: colaboradores.nome }).from(colaboradores).where(eq(colaboradores.id, pessoaId));
    if (!pessoa) return { ok: false as const, motivo: "pessoa_nao_encontrada" as const };
    if (!ids.length) return { ok: true as const, nome: pessoa.nome, codigos: [] };

    const alterados = await tx
      .update(itens)
      .set({ usuarioId: pessoaId, status: STATUS_AO_VINCULAR, atualizadoEm: sql`now()` })
      .where(and(inArray(itens.id, ids), ne(itens.status, "descartado")))
      .returning({ codigo: itens.codigo });
    return { ok: true as const, nome: pessoa.nome, codigos: alterados.map((a) => a.codigo).sort() };
  });
}

/** Tira o item da pessoa. Se estava em uso, volta para o estoque. */
export async function devolverItem(
  db: Banco,
  pessoaId: number,
  itemId: number,
): Promise<{ codigo: string; voltouAoEstoque: boolean } | null> {
  const [item] = await db
    .update(itens)
    .set({ usuarioId: null, status: STATUS_AO_DEVOLVER, atualizadoEm: sql`now()` })
    .where(and(eq(itens.id, itemId), eq(itens.usuarioId, pessoaId)))
    .returning({ codigo: itens.codigo, status: itens.status });
  return item ? { codigo: item.codigo, voltouAoEstoque: item.status === "em_estoque" } : null;
}
