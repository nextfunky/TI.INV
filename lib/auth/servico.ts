import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, lte, ne, sql } from "drizzle-orm";

import { contas, sessoes } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";

import { gastarTempoDeVerificacao, gerarHashDaSenha, senhaConfere } from "./senha";

/**
 * As regras da conta e das sessões. Não dependem do Next: recebem o banco
 * como parâmetro, o que permite testá-las com um banco em memória.
 */

export const DURACAO_DA_SESSAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export type SessaoValida = {
  sessaoId: string;
  contaId: number;
  usuario: string;
};

function idDaSessao(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function contaExiste(db: Banco): Promise<boolean> {
  const [linha] = await db.select({ id: contas.id }).from(contas).limit(1);
  return Boolean(linha);
}

/**
 * Cria a conta única. Se ela já existir (inclusive se duas pessoas
 * tentarem ao mesmo tempo), nada é gravado e o resultado diz isso.
 */
export async function criarConta(
  db: Banco,
  dados: { usuario: string; senha: string },
): Promise<{ criada: true; contaId: number } | { criada: false }> {
  const senhaHash = await gerarHashDaSenha(dados.senha);
  const [linha] = await db
    .insert(contas)
    .values({ id: 1, usuario: dados.usuario, senhaHash })
    .onConflictDoNothing()
    .returning({ id: contas.id });
  return linha ? { criada: true, contaId: linha.id } : { criada: false };
}

/** Confere usuário e senha. Devolve o id da conta ou null. */
export async function conferirCredenciais(
  db: Banco,
  usuario: string,
  senha: string,
): Promise<number | null> {
  const [conta] = await db
    .select({ id: contas.id, senhaHash: contas.senhaHash })
    .from(contas)
    .where(eq(contas.usuario, usuario))
    .limit(1);

  if (!conta) {
    await gastarTempoDeVerificacao(senha);
    return null;
  }
  return (await senhaConfere(conta.senhaHash, senha)) ? conta.id : null;
}

/** Abre uma sessão nova e devolve o token que vai no cookie. */
export async function abrirSessao(
  db: Banco,
  contaId: number,
  agora = new Date(),
): Promise<{ token: string; expiraEm: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(agora.getTime() + DURACAO_DA_SESSAO_MS);

  // Aproveita para limpar as sessões vencidas.
  await db.delete(sessoes).where(lte(sessoes.expiraEm, agora));
  await db.insert(sessoes).values({ id: idDaSessao(token), contaId, expiraEm });

  return { token, expiraEm };
}

/** Confere o token do cookie. Devolve a sessão ou null se ela não vale mais. */
export async function conferirSessao(
  db: Banco,
  token: string,
  agora = new Date(),
): Promise<SessaoValida | null> {
  const [linha] = await db
    .select({ sessaoId: sessoes.id, contaId: contas.id, usuario: contas.usuario })
    .from(sessoes)
    .innerJoin(contas, eq(contas.id, sessoes.contaId))
    .where(and(eq(sessoes.id, idDaSessao(token)), gt(sessoes.expiraEm, agora)))
    .limit(1);
  return linha ?? null;
}

export async function encerrarSessao(db: Banco, token: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.id, idDaSessao(token)));
}

/**
 * Troca a senha. Encerra as outras sessões abertas, para que quem tinha a
 * senha antiga precise entrar de novo. A sessão atual continua.
 */
export async function alterarSenha(
  db: Banco,
  sessao: SessaoValida,
  dados: { senhaAtual: string; novaSenha: string },
): Promise<{ alterada: true } | { alterada: false; motivo: "senha_atual_incorreta" }> {
  const [conta] = await db
    .select({ senhaHash: contas.senhaHash })
    .from(contas)
    .where(eq(contas.id, sessao.contaId))
    .limit(1);

  if (!conta || !(await senhaConfere(conta.senhaHash, dados.senhaAtual))) {
    return { alterada: false, motivo: "senha_atual_incorreta" };
  }

  const senhaHash = await gerarHashDaSenha(dados.novaSenha);
  await db.transaction(async (tx) => {
    await tx
      .update(contas)
      .set({ senhaHash, atualizadoEm: sql`now()` })
      .where(eq(contas.id, sessao.contaId));
    await tx
      .delete(sessoes)
      .where(and(eq(sessoes.contaId, sessao.contaId), ne(sessoes.id, sessao.sessaoId)));
  });

  return { alterada: true };
}
