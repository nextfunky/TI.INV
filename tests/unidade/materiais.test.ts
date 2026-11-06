import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { criarColaborador, excluirColaborador } from "@/lib/colaboradores/servico";
import type { Banco } from "@/lib/db/tipos";
import { criarLocal } from "@/lib/locais/servico";
import { lerFiltrosDosMateriais, enderecoDosMateriais } from "@/lib/materiais/filtros";
import { regrasDaEntrada, regrasDaSaida, regrasDoAjuste, regrasDoNovoMaterial } from "@/lib/materiais/regras";
import {
  ajustarContagem,
  criarMaterial,
  editarMaterial,
  excluirMaterial,
  listarMateriais,
  materiaisDaPessoa,
  movimentosDoMaterial,
  obterMaterial,
  registrarEntrada,
  registrarSaida,
  resumoDosMateriais,
} from "@/lib/materiais/servico";
import type { Grupo } from "@/lib/materiais/valores";

import { criarBancoDeTeste } from "./banco-de-teste";

let db: Banco;
let fechar: () => Promise<void>;

beforeAll(async () => {
  ({ db, fechar } = await criarBancoDeTeste());
});

afterAll(async () => {
  await fechar();
});

beforeEach(async () => {
  await db.execute(sql`truncate table historico_de_itens, movimentos_de_material, materiais, itens, colaboradores, locais restart identity`);
});

async function material(nome: string, quantidade = 0, extra: { grupo?: Grupo; localId?: number | null; marcaModelo?: string } = {}) {
  const r = await criarMaterial(db, {
    nome,
    marcaModelo: extra.marcaModelo ?? null,
    grupo: extra.grupo ?? "cabos",
    localId: extra.localId ?? null,
    condicao: null,
    observacoes: null,
    quantidade,
  });
  if (!r.criado) throw new Error(JSON.stringify(r.erros));
  return r.material.id;
}

async function pessoa(nome: string) {
  const r = await criarColaborador(db, nome);
  if (!r.criado) throw new Error(r.erro);
  return r.colaborador.id;
}

const saldo = async (id: number) => (await obterMaterial(db, id))!.quantidade;

describe("regras dos formulários de material", () => {
  const base = { nome: "Cabo HDMI", marcaModelo: "", grupo: "cabos", localId: "", condicao: "", observacoes: "" };

  it("quantidade inicial vazia vale 0; texto, vírgula e negativo não passam", () => {
    expect(regrasDoNovoMaterial.parse({ ...base, quantidade: "" }).quantidade).toBe(0);
    expect(regrasDoNovoMaterial.parse({ ...base, quantidade: " 12 " }).quantidade).toBe(12);
    for (const q of ["1,5", "-2", "dez"]) {
      expect(regrasDoNovoMaterial.safeParse({ ...base, quantidade: q }).success, q).toBe(false);
    }
  });

  it("pede nome e grupo", () => {
    const r = regrasDoNovoMaterial.safeParse({ ...base, nome: " ", grupo: "", quantidade: "" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.message)).toEqual(["Informe o nome do material.", "Escolha o grupo."]);
  });

  it("entrada e saída pedem mais que zero; a contagem aceita zero", () => {
    expect(regrasDaEntrada.safeParse({ quantidade: "0", observacao: "" }).error?.issues[0].message).toBe(
      "Informe uma quantidade maior que zero.",
    );
    expect(regrasDaSaida.safeParse({ quantidade: "", colaboradorId: "", observacao: "" }).error?.issues[0].message).toBe(
      "Informe quantos saíram.",
    );
    expect(regrasDoAjuste.parse({ contagem: "0", observacao: "" }).contagem).toBe(0);
  });
});

describe("cadastro de materiais", () => {
  it("a quantidade do cadastro entra como a primeira entrada", async () => {
    const id = await material("Cabo HDMI", 7);
    expect(await saldo(id)).toBe(7);
    expect(await movimentosDoMaterial(db, id)).toMatchObject([
      { tipo: "entrada", quantidade: 7, saldo: 7, observacao: "Quantidade no cadastro" },
    ]);
    const vazio = await material("Mousepad", 0);
    expect(await movimentosDoMaterial(db, vazio)).toEqual([]);
  });

  it("recusa um local que não existe", async () => {
    const r = await criarMaterial(db, {
      nome: "Cabo",
      marcaModelo: null,
      grupo: "cabos",
      localId: 999,
      condicao: null,
      observacoes: null,
      quantidade: 0,
    });
    expect(r).toEqual({ criado: false, erros: { localId: "Escolha um local da lista." } });
  });

  it("editar não muda a quantidade", async () => {
    const id = await material("Cabo HDMI", 3);
    const r = await editarMaterial(db, id, {
      nome: "Cabo HDMI 2 m",
      marcaModelo: "Genérico",
      grupo: "cabos",
      localId: null,
      condicao: "novo",
      observacoes: null,
    });
    expect(r).toEqual({ salvo: true });
    expect(await obterMaterial(db, id)).toMatchObject({ nome: "Cabo HDMI 2 m", condicao: "novo", quantidade: 3 });
    expect(await editarMaterial(db, 999, { nome: "x", marcaModelo: null, grupo: "cabos", localId: null, condicao: null, observacoes: null })).toEqual({
      salvo: false,
      naoEncontrado: true,
    });
  });

  it("lista por grupo e nome, busca por nome, marca e local, e filtra por grupo", async () => {
    const filial = await criarLocal(db, { nome: "Filial 04", paiId: null });
    const filialId = filial.criado ? filial.local.id : 0;
    await material("Toner", 2, { grupo: "impressao", marcaModelo: "HP 85A" });
    await material("cabo VGA", 7);
    await material("Cabo HDMI", 1, { localId: filialId });
    expect((await listarMateriais(db)).map((m) => m.nome)).toEqual(["Cabo HDMI", "cabo VGA", "Toner"]);
    expect((await listarMateriais(db, { busca: "hp 85" })).map((m) => m.nome)).toEqual(["Toner"]);
    expect((await listarMateriais(db, { busca: "filial" })).map((m) => m.nome)).toEqual(["Cabo HDMI"]);
    expect((await listarMateriais(db, { grupo: "impressao" })).map((m) => m.nome)).toEqual(["Toner"]);
    expect(await resumoDosMateriais(db)).toEqual({ materiais: 3, unidades: 10 });
  });

  it("lê os filtros do endereço e monta o endereço de volta", () => {
    expect(lerFiltrosDosMateriais({ q: " cabo ", grupo: "rede_e_rack" })).toEqual({ busca: "cabo", grupo: "rede_e_rack" });
    expect(lerFiltrosDosMateriais({ grupo: "inventado" })).toEqual({ busca: undefined, grupo: undefined });
    expect(enderecoDosMateriais({ busca: "cabo", grupo: "cabos" })).toBe("/materiais?q=cabo&grupo=cabos");
    expect(enderecoDosMateriais({})).toBe("/materiais");
  });
});

describe("entrada, saída e ajuste", () => {
  it("entrada soma e guarda o saldo", async () => {
    const id = await material("Patch Cord", 10);
    expect(await registrarEntrada(db, id, { quantidade: 5, observacao: "Compra" })).toMatchObject({ ok: true, saldo: 15 });
    expect((await movimentosDoMaterial(db, id))[0]).toMatchObject({ tipo: "entrada", quantidade: 5, saldo: 15, observacao: "Compra" });
    expect(await registrarEntrada(db, 999, { quantidade: 1, observacao: null })).toEqual({ ok: false, naoEncontrado: true });
  });

  it("saída desconta, pode ir para uma pessoa e não passa do que tem", async () => {
    const id = await material("Mousepad", 3);
    const ana = await pessoa("Ana Paula");
    expect(await registrarSaida(db, id, { quantidade: 2, colaboradorId: ana, observacao: null })).toMatchObject({
      ok: true,
      saldo: 1,
      pessoa: "Ana Paula",
    });
    expect(await registrarSaida(db, id, { quantidade: 2, colaboradorId: null, observacao: null })).toEqual({
      ok: false,
      erros: { quantidade: "Só há 1 em estoque." },
    });
    expect(await registrarSaida(db, id, { quantidade: 1, colaboradorId: null, observacao: "No rack" })).toMatchObject({ ok: true, saldo: 0 });
    expect(await registrarSaida(db, id, { quantidade: 1, colaboradorId: null, observacao: null })).toEqual({
      ok: false,
      erros: { quantidade: "Não há nenhum em estoque." },
    });
    expect(await registrarSaida(db, id, { quantidade: 1, colaboradorId: 999, observacao: null })).toEqual({
      ok: false,
      erros: { colaboradorId: "Escolha uma pessoa da lista." },
    });
    expect(await saldo(id)).toBe(0);
  });

  it("duas saídas ao mesmo tempo não deixam o saldo negativo", async () => {
    const id = await material("Toner", 1);
    const resultados = await Promise.all([
      registrarSaida(db, id, { quantidade: 1, colaboradorId: null, observacao: null }),
      registrarSaida(db, id, { quantidade: 1, colaboradorId: null, observacao: null }),
    ]);
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(await saldo(id)).toBe(0);
  });

  it("ajuste de contagem corrige o saldo e guarda a diferença", async () => {
    const id = await material("Cabo de força", 30);
    expect(await ajustarContagem(db, id, { contagem: 27, observacao: "Contagem do mês" })).toMatchObject({ ok: true, saldo: 27, diferenca: -3 });
    expect(await ajustarContagem(db, id, { contagem: 29, observacao: null })).toMatchObject({ ok: true, saldo: 29, diferenca: 2 });
    expect(await ajustarContagem(db, id, { contagem: 29, observacao: null })).toEqual({
      ok: false,
      erros: { contagem: "O saldo já é 29. Nada para ajustar." },
    });
    expect((await movimentosDoMaterial(db, id)).map((m) => [m.tipo, m.quantidade, m.saldo])).toEqual([
      ["ajuste", 2, 29],
      ["ajuste", -3, 27],
      ["entrada", 30, 30],
    ]);
  });

  it("o banco recusa saldo negativo e pessoa fora de uma saída", async () => {
    const id = await material("Cabo", 1);
    await expect(db.execute(sql`update materiais set quantidade = -1 where id = ${id}`)).rejects.toThrow();
    const ana = await pessoa("Ana Paula");
    await expect(
      db.execute(sql`insert into movimentos_de_material (material_id, tipo, quantidade, saldo, colaborador_id) values (${id}, 'entrada', 1, 2, ${ana})`),
    ).rejects.toThrow();
  });
});

describe("materiais e pessoas", () => {
  it("a página da pessoa mostra o que saiu para ela, do mais novo para o mais antigo", async () => {
    const ana = await pessoa("Ana Paula");
    const joao = await pessoa("João Lima");
    const mouse = await material("Mousepad", 10, { marcaModelo: "Alles" });
    const cabo = await material("Cabo HDMI", 5);
    await registrarSaida(db, mouse, { quantidade: 1, colaboradorId: ana, observacao: null });
    await registrarSaida(db, cabo, { quantidade: 2, colaboradorId: ana, observacao: "Sala de reunião" });
    await registrarSaida(db, cabo, { quantidade: 1, colaboradorId: joao, observacao: null });
    expect((await materiaisDaPessoa(db, ana)).map((m) => [m.material.nome, m.quantidade, m.observacao])).toEqual([
      ["Cabo HDMI", 2, "Sala de reunião"],
      ["Mousepad", 1, null],
    ]);
  });

  it("quem recebeu material não pode ser excluído; material com saída também não", async () => {
    const ana = await pessoa("Ana Paula");
    const semNada = await pessoa("Sem Nada");
    const cabo = await material("Cabo HDMI", 5);
    const toner = await material("Toner", 2);
    await registrarSaida(db, cabo, { quantidade: 1, colaboradorId: ana, observacao: null });
    expect(await excluirColaborador(db, ana)).toEqual({ excluido: false, motivo: "tem_materiais", nome: "Ana Paula" });
    expect(await excluirColaborador(db, semNada)).toEqual({ excluido: true, nome: "Sem Nada" });
    expect(await excluirMaterial(db, cabo)).toEqual({ excluido: false, motivo: "tem_saidas", nome: "Cabo HDMI" });
    // Sem saída, sai junto com as entradas e os ajustes.
    await ajustarContagem(db, toner, { contagem: 1, observacao: null });
    expect(await excluirMaterial(db, toner)).toEqual({ excluido: true, nome: "Toner" });
    expect(await obterMaterial(db, toner)).toBeNull();
    expect(await excluirMaterial(db, toner)).toEqual({ excluido: false, motivo: "nao_encontrado" });
  });
});
