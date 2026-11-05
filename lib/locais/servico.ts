import { and, count, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";

import { colaboradores, itens, locais } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { condicaoDeBusca, ORDEM_DO_CODIGO } from "@/lib/itens/consultas";
import { consultaDeItens, juntarItemETipo, type ItemComTipo } from "@/lib/itens/servico";

import { comOsDeDentro, compararCaminhos, montarCaminhos, nivelDoCaminho, podeFicarDentro, SEPARADOR } from "./arvore";

/**
 * As regras dos locais. Recebem o banco como parâmetro, para poderem ser
 * testadas com um banco em memória.
 */

export type Local = typeof locais.$inferSelect;
export type LocalNaLista = Local & { nivel: number };

/** Todos os locais, em ordem de caminho, com o nível de cada um. */
export async function listarLocais(db: Banco): Promise<LocalNaLista[]> {
  const todos = await db.select().from(locais);
  return todos
    .map((l) => ({ ...l, nivel: nivelDoCaminho(l.caminho) }))
    .sort((a, b) => compararCaminhos(a.caminho, b.caminho));
}

export async function obterLocal(db: Banco, id: number): Promise<Local | null> {
  const [local] = await db.select().from(locais).where(eq(locais.id, id));
  return local ?? null;
}

/** Os ids do local e de todos os que estão dentro dele. */
export async function idsComOsDeDentro(db: Banco, id: number): Promise<number[]> {
  const todos = await db.select({ id: locais.id, nome: locais.nome, paiId: locais.paiId }).from(locais);
  return comOsDeDentro(todos, id);
}

/** Refaz o caminho de todos os locais (depois de renomear ou mover). */
async function recalcularCaminhos(tx: Banco) {
  const todos = await tx.select().from(locais);
  const caminhos = montarCaminhos(todos);
  for (const l of todos) {
    const novo = caminhos.get(l.id)!;
    if (novo !== l.caminho) {
      await tx.update(locais).set({ caminho: novo, atualizadoEm: sql`now()` }).where(eq(locais.id, l.id));
    }
  }
}

type ErrosDoLocal = Partial<Record<"nome" | "paiId", string>>;
const NOME_REPETIDO = "Já existe um local com este nome aqui.";

async function nomeRepetidoNoPai(tx: Banco, nome: string, paiId: number | null, ignorarId?: number) {
  const irmaos = await tx
    .select({ id: locais.id, nome: locais.nome })
    .from(locais)
    .where(paiId === null ? isNull(locais.paiId) : eq(locais.paiId, paiId));
  const chave = nome.toLocaleLowerCase("pt-BR");
  return irmaos.some((i) => i.id !== ignorarId && i.nome.toLocaleLowerCase("pt-BR") === chave);
}

export async function criarLocal(
  db: Banco,
  dados: { nome: string; paiId: number | null },
): Promise<{ criado: true; local: Local } | { criado: false; erros: ErrosDoLocal }> {
  return db.transaction(async (tx) => {
    let caminho = dados.nome;
    if (dados.paiId !== null) {
      const pai = await obterLocal(tx, dados.paiId);
      if (!pai) return { criado: false as const, erros: { paiId: "Escolha um local da lista." } };
      caminho = `${pai.caminho}${SEPARADOR}${dados.nome}`;
    }
    if (await nomeRepetidoNoPai(tx, dados.nome, dados.paiId)) return { criado: false as const, erros: { nome: NOME_REPETIDO } };

    const [local] = await tx.insert(locais).values({ nome: dados.nome, paiId: dados.paiId, caminho }).returning();
    return { criado: true as const, local };
  });
}

/** Renomear ou mover atualiza o caminho de todos os locais de dentro. */
export async function editarLocal(
  db: Banco,
  id: number,
  dados: { nome: string; paiId: number | null },
): Promise<{ salvo: true; local: Local } | { salvo: false; erros: ErrosDoLocal } | { salvo: false; naoEncontrado: true }> {
  return db.transaction(async (tx) => {
    const atual = await obterLocal(tx, id);
    if (!atual) return { salvo: false as const, naoEncontrado: true as const };

    if (dados.paiId !== null) {
      const todos = await tx.select({ id: locais.id, nome: locais.nome, paiId: locais.paiId }).from(locais);
      if (!todos.some((l) => l.id === dados.paiId)) return { salvo: false as const, erros: { paiId: "Escolha um local da lista." } };
      if (!podeFicarDentro(todos, id, dados.paiId)) {
        return { salvo: false as const, erros: { paiId: "Um local não pode ficar dentro dele mesmo." } };
      }
    }
    if (await nomeRepetidoNoPai(tx, dados.nome, dados.paiId, id)) return { salvo: false as const, erros: { nome: NOME_REPETIDO } };

    await tx.update(locais).set({ nome: dados.nome, paiId: dados.paiId, atualizadoEm: sql`now()` }).where(eq(locais.id, id));
    await recalcularCaminhos(tx);
    return { salvo: true as const, local: (await obterLocal(tx, id))! };
  });
}

/** O que há diretamente no local (para saber se ele pode ser excluído). */
async function conteudoDireto(db: Banco, id: number) {
  const [[{ filhos }], [{ pessoas }], [{ itensNoLocal }]] = await Promise.all([
    db.select({ filhos: count() }).from(locais).where(eq(locais.paiId, id)),
    db.select({ pessoas: count() }).from(colaboradores).where(eq(colaboradores.localId, id)),
    db.select({ itensNoLocal: count() }).from(itens).where(eq(itens.localId, id)),
  ]);
  return { filhos, pessoas, itens: itensNoLocal };
}

/** Só exclui um local sem outros locais dentro, sem pessoas e sem itens (nem descartados). */
export async function excluirLocal(
  db: Banco,
  id: number,
): Promise<{ excluido: true; caminho: string } | { excluido: false; motivo: "nao_vazio" | "nao_encontrado"; caminho?: string }> {
  const local = await obterLocal(db, id);
  if (!local) return { excluido: false, motivo: "nao_encontrado" };
  const conteudo = await conteudoDireto(db, id);
  if (conteudo.filhos || conteudo.pessoas || conteudo.itens) return { excluido: false, motivo: "nao_vazio", caminho: local.caminho };
  await db.delete(locais).where(eq(locais.id, id));
  return { excluido: true, caminho: local.caminho };
}

export type ContagemDoLocal = {
  /** Pessoas no local e nos de dentro. */
  pessoas: number;
  /** Itens sem usuário (sem os descartados) no local e nos de dentro. */
  itensSemUsuario: number;
  /** Nada dentro: nem locais, nem pessoas, nem itens (contando descartados). */
  vazio: boolean;
};

/** As contagens da tela de Locais, sempre somando os locais de dentro. */
export async function contagensDosLocais(db: Banco): Promise<Map<number, ContagemDoLocal>> {
  const todos = await db.select({ id: locais.id, nome: locais.nome, paiId: locais.paiId }).from(locais);
  const pessoas = await db
    .select({ localId: colaboradores.localId, total: count() })
    .from(colaboradores)
    .where(sql`${colaboradores.localId} is not null`)
    .groupBy(colaboradores.localId);
  const itensPorLocal = await db
    .select({
      localId: itens.localId,
      ativos: sql<number>`count(*) filter (where ${itens.status} <> 'descartado')`.mapWith(Number),
      todos: count(),
    })
    .from(itens)
    .where(sql`${itens.localId} is not null`)
    .groupBy(itens.localId);

  const direto = new Map<number, { pessoas: number; ativos: number; todos: number }>();
  for (const l of todos) direto.set(l.id, { pessoas: 0, ativos: 0, todos: 0 });
  for (const p of pessoas) if (p.localId !== null) direto.get(p.localId)!.pessoas = p.total;
  for (const i of itensPorLocal) if (i.localId !== null) Object.assign(direto.get(i.localId)!, { ativos: i.ativos, todos: i.todos });
  const temFilho = new Set(todos.filter((l) => l.paiId !== null).map((l) => l.paiId!));

  const resultado = new Map<number, ContagemDoLocal>();
  for (const l of todos) {
    const ids = comOsDeDentro(todos, l.id);
    const d = direto.get(l.id)!;
    resultado.set(l.id, {
      pessoas: ids.reduce((s, id) => s + direto.get(id)!.pessoas, 0),
      itensSemUsuario: ids.reduce((s, id) => s + direto.get(id)!.ativos, 0),
      vazio: !temFilho.has(l.id) && d.pessoas === 0 && d.todos === 0,
    });
  }
  return resultado;
}

// ─── Página do local ──────────────────────────────────────────────────────

/** As pessoas no local e nos de dentro, com o caminho de cada uma e quantos itens têm. */
export async function pessoasDoLocal(db: Banco, id: number) {
  const ids = await idsComOsDeDentro(db, id);
  return db
    .select({
      id: colaboradores.id,
      nome: colaboradores.nome,
      localId: colaboradores.localId,
      caminho: locais.caminho,
      itens: sql<number>`(select count(*) from ${itens} where ${itens.usuarioId} = ${colaboradores.id} and ${itens.status} <> 'descartado')`.mapWith(Number),
    })
    .from(colaboradores)
    .innerJoin(locais, eq(locais.id, colaboradores.localId))
    .where(inArray(colaboradores.localId, ids))
    .orderBy(colaboradores.chave);
}

/** Os itens sem usuário (sem os descartados) no local e nos de dentro. */
export async function itensSemUsuarioDoLocal(db: Banco, id: number): Promise<ItemComTipo[]> {
  const ids = await idsComOsDeDentro(db, id);
  const linhas = await consultaDeItens(db)
    .where(and(isNull(itens.usuarioId), inArray(itens.localId, ids), ne(itens.status, "descartado")))
    .orderBy(...ORDEM_DO_CODIGO);
  return linhas.map(juntarItemETipo);
}

function escaparBusca(termo: string): string {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** "Trazer pessoas": quem ainda não está neste local (os sem local vêm primeiro). */
export async function pessoasParaTrazer(db: Banco, localId: number, termo: string) {
  const busca = termo.trim() ? ilike(colaboradores.nome, `%${escaparBusca(termo.trim())}%`) : undefined;
  return db
    .select({ id: colaboradores.id, nome: colaboradores.nome, caminho: locais.caminho })
    .from(colaboradores)
    .leftJoin(locais, eq(locais.id, colaboradores.localId))
    .where(and(or(isNull(colaboradores.localId), ne(colaboradores.localId, localId)), busca))
    .orderBy(sql`${colaboradores.localId} is not null`, colaboradores.chave)
    .limit(50);
}

/** "Trazer itens": os itens sem usuário que ainda não estão neste local (sem os descartados). */
export async function itensParaTrazer(db: Banco, localId: number, termo: string): Promise<ItemComTipo[]> {
  const linhas = await consultaDeItens(db)
    .where(
      and(
        isNull(itens.usuarioId),
        ne(itens.status, "descartado"),
        or(isNull(itens.localId), ne(itens.localId, localId)),
        termo.trim() ? condicaoDeBusca(termo) : undefined,
      ),
    )
    .orderBy(sql`${itens.localId} is not null`, ...ORDEM_DO_CODIGO)
    .limit(50);
  return linhas.map(juntarItemETipo);
}

/** Coloca as pessoas escolhidas neste local (os itens delas vão junto). */
export async function trazerPessoas(db: Banco, localId: number, ids: number[]): Promise<number | null> {
  if (!(await obterLocal(db, localId))) return null;
  if (!ids.length) return 0;
  const movidas = await db
    .update(colaboradores)
    .set({ localId, atualizadoEm: sql`now()` })
    .where(inArray(colaboradores.id, ids))
    .returning({ id: colaboradores.id });
  return movidas.length;
}

/** Coloca os itens sem usuário escolhidos neste local. */
export async function trazerItens(db: Banco, localId: number, ids: number[]): Promise<number | null> {
  if (!(await obterLocal(db, localId))) return null;
  if (!ids.length) return 0;
  const movidos = await db
    .update(itens)
    .set({ localId, atualizadoEm: sql`now()` })
    .where(and(inArray(itens.id, ids), isNull(itens.usuarioId), ne(itens.status, "descartado")))
    .returning({ id: itens.id });
  return movidos.length;
}
