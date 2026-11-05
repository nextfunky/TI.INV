import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  abrirSessao,
  alterarSenha,
  conferirCredenciais,
  conferirSessao,
  contaExiste,
  criarConta,
  DURACAO_DA_SESSAO_MS,
  encerrarSessao,
} from "@/lib/auth/servico";
import { contas, sessoes } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";

import { criarBancoDeTeste } from "./banco-de-teste";

let db: Banco;
let fechar: () => Promise<void>;

beforeAll(async () => {
  ({ db, fechar } = await criarBancoDeTeste());
});

// Cada teste começa com o banco vazio.
beforeEach(async () => {
  await db.execute(sql`truncate table sessoes, contas`);
});

afterAll(async () => {
  await fechar();
});

const CONTA = { usuario: "pedro.martins", senha: "senha-forte-1" };

describe("conta única", () => {
  it("começa sem conta e passa a ter uma depois de criada", async () => {
    expect(await contaExiste(db)).toBe(false);
    const resultado = await criarConta(db, CONTA);
    expect(resultado).toEqual({ criada: true, contaId: 1 });
    expect(await contaExiste(db)).toBe(true);
  });

  it("não cria uma segunda conta", async () => {
    await criarConta(db, CONTA);
    expect(await criarConta(db, { usuario: "outra.pessoa", senha: "outra-senha-1" })).toEqual({
      criada: false,
    });
    const linhas = await db.select().from(contas);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].usuario).toBe("pedro.martins");
  });

  it("o banco recusa uma segunda conta mesmo sem passar pelas regras", async () => {
    await criarConta(db, CONTA);
    await expect(
      db.execute(sql`insert into contas (id, usuario, senha_hash) values (2, 'x', 'y')`),
    ).rejects.toThrow();
  });

  it("guarda a senha com hash forte, nunca o texto", async () => {
    await criarConta(db, CONTA);
    const [conta] = await db.select().from(contas);
    expect(conta.senhaHash).not.toContain(CONTA.senha);
    expect(conta.senhaHash.startsWith("$argon2id$")).toBe(true);
  });
});

describe("login", () => {
  beforeEach(async () => {
    await criarConta(db, CONTA);
  });

  it("aceita usuário e senha certos", async () => {
    expect(await conferirCredenciais(db, "pedro.martins", "senha-forte-1")).toBe(1);
  });

  it("recusa a senha errada", async () => {
    expect(await conferirCredenciais(db, "pedro.martins", "senha-errada")).toBeNull();
  });

  it("recusa um usuário que não existe", async () => {
    expect(await conferirCredenciais(db, "ninguem", "senha-forte-1")).toBeNull();
  });
});

describe("sessões", () => {
  beforeEach(async () => {
    await criarConta(db, CONTA);
  });

  it("uma sessão aberta vale e diz de quem é", async () => {
    const { token } = await abrirSessao(db, 1);
    expect(await conferirSessao(db, token)).toMatchObject({ contaId: 1, usuario: "pedro.martins" });
  });

  it("o banco guarda só o resumo do token, não o token", async () => {
    const { token } = await abrirSessao(db, 1);
    const [linha] = await db.select().from(sessoes);
    expect(linha.id).not.toBe(token);
    expect(linha.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("um token inventado não vale", async () => {
    await abrirSessao(db, 1);
    expect(await conferirSessao(db, "token-inventado")).toBeNull();
  });

  it("a sessão vence depois de 30 dias", async () => {
    const agora = new Date("2026-11-05T12:00:00Z");
    const { token, expiraEm } = await abrirSessao(db, 1, agora);
    expect(expiraEm.getTime() - agora.getTime()).toBe(DURACAO_DA_SESSAO_MS);
    expect(await conferirSessao(db, token, new Date(expiraEm.getTime() - 1000))).not.toBeNull();
    expect(await conferirSessao(db, token, expiraEm)).toBeNull();
  });

  it("sair encerra a sessão", async () => {
    const { token } = await abrirSessao(db, 1);
    await encerrarSessao(db, token);
    expect(await conferirSessao(db, token)).toBeNull();
  });

  it("abrir uma sessão apaga as vencidas", async () => {
    const antes = new Date("2026-01-01T00:00:00Z");
    await abrirSessao(db, 1, antes);
    await abrirSessao(db, 1, new Date(antes.getTime() + DURACAO_DA_SESSAO_MS + 1));
    expect(await db.select().from(sessoes)).toHaveLength(1);
  });
});

describe("alterar senha", () => {
  beforeEach(async () => {
    await criarConta(db, CONTA);
  });

  it("recusa quando a senha atual está errada", async () => {
    const { token } = await abrirSessao(db, 1);
    const sessao = (await conferirSessao(db, token))!;
    expect(await alterarSenha(db, sessao, { senhaAtual: "errada", novaSenha: "nova-senha-2" })).toEqual({
      alterada: false,
      motivo: "senha_atual_incorreta",
    });
    expect(await conferirCredenciais(db, "pedro.martins", "senha-forte-1")).toBe(1);
  });

  it("troca a senha, mantém esta sessão e encerra as outras", async () => {
    const esta = await abrirSessao(db, 1);
    const outra = await abrirSessao(db, 1);
    const sessao = (await conferirSessao(db, esta.token))!;

    expect(
      await alterarSenha(db, sessao, { senhaAtual: "senha-forte-1", novaSenha: "nova-senha-2" }),
    ).toEqual({ alterada: true });

    expect(await conferirCredenciais(db, "pedro.martins", "senha-forte-1")).toBeNull();
    expect(await conferirCredenciais(db, "pedro.martins", "nova-senha-2")).toBe(1);
    expect(await conferirSessao(db, esta.token)).not.toBeNull();
    expect(await conferirSessao(db, outra.token)).toBeNull();
  });
});
