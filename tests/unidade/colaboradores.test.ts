import { readFileSync } from "node:fs";

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  chaveDoNome,
  criarColaborador,
  devolverItem,
  editarColaborador,
  excluirColaborador,
  itensDaPessoa,
  itensParaVincular,
  listarColaboradores,
  obterColaborador,
  tambemCom,
  vincularItens,
} from "@/lib/colaboradores/servico";
import { tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { buscarItens, lerFiltros, listarItens } from "@/lib/itens/consultas";
import { painelDoInicio } from "@/lib/itens/inicio";
import { regrasDoColaborador, type DadosDoItem } from "@/lib/itens/regras";
import { criarItem, editarItem, obterItemPorCodigo } from "@/lib/itens/servico";

import { criarBancoDeTeste } from "./banco-de-teste";

let db: Banco;
let fechar: () => Promise<void>;
let tipo: Record<string, number>;
const TIPOS_PADRAO = readFileSync("drizzle/0002_tipos-padrao.sql", "utf8");

beforeAll(async () => {
  ({ db, fechar } = await criarBancoDeTeste());
});

afterAll(async () => {
  await fechar();
});

beforeEach(async () => {
  await db.execute(sql`delete from historico_de_itens`);
  await db.execute(sql`delete from itens`);
  await db.execute(sql`delete from colaboradores`);
  await db.execute(sql`delete from tipos_de_item`);
  await db.execute(sql.raw(TIPOS_PADRAO));
  tipo = Object.fromEntries((await db.select().from(tiposDeItem)).map((t) => [t.prefixo, t.id]));
});

function dados(parcial: Partial<DadosDoItem> & { tipoId: number }): DadosDoItem {
  return {
    marca: null, modelo: null, numeroSerie: null, usuarioId: null, localId: null, status: "em_estoque", condicao: null,
    hostname: null, processador: null, memoriaRam: null, armazenamento: null, sistemaOperacional: null,
    dataCompra: null, garantiaAte: null, observacoes: null,
    ...parcial,
  };
}

async function novoItem(prefixo: string, parcial: Partial<DadosDoItem> = {}) {
  const r = await criarItem(db, dados({ tipoId: tipo[prefixo], ...parcial }));
  if (!r.criado) throw new Error(JSON.stringify(r.erros));
  return r.codigo;
}

async function pessoa(nome: string) {
  const r = await criarColaborador(db, nome);
  if (!r.criado) throw new Error(r.erro);
  return r.colaborador.id;
}

describe("cadastro de colaboradores", () => {
  it("tira os espaços extras do nome", () => {
    expect(regrasDoColaborador.parse({ nome: "  maria   souza " }).nome).toBe("maria souza");
    expect(regrasDoColaborador.safeParse({ nome: "   " }).error?.issues[0].message).toBe("Informe o nome.");
  });

  it("a chave ignora maiúsculas (inclusive acentuadas), mas não os acentos", () => {
    expect(chaveDoNome("JOÃO LIMA")).toBe(chaveDoNome("joão  lima"));
    expect(chaveDoNome("Joao Lima")).not.toBe(chaveDoNome("João Lima"));
  });

  it("recusa nome repetido, mesmo com maiúsculas e espaços diferentes", async () => {
    await pessoa("João Lima");
    expect(await criarColaborador(db, "JOÃO LIMA")).toEqual({ criado: false, erro: "Já existe um colaborador com este nome." });
    expect((await criarColaborador(db, "Joao Lima")).criado).toBe(true);
  });

  it("renomear não pode repetir outro nome, mas pode mudar a grafia do próprio", async () => {
    const joao = await pessoa("João Lima");
    await pessoa("Ana Paula");
    expect(await editarColaborador(db, joao, "ana paula")).toEqual({ salvo: false, erro: "Já existe um colaborador com este nome." });
    expect(await editarColaborador(db, joao, "JOÃO LIMA")).toEqual({ salvo: true });
  });

  it("renomear muda o nome em todos os itens da pessoa", async () => {
    const joao = await pessoa("João Lima");
    const codigo = await novoItem("MON", { usuarioId: joao });
    await editarColaborador(db, joao, "João Lima Souza");
    expect((await obterItemPorCodigo(db, codigo))?.usuario).toEqual({ id: joao, nome: "João Lima Souza" });
  });

  it("só exclui quem não tem nenhum item, nem descartado", async () => {
    const ana = await pessoa("Ana Paula");
    await novoItem("HST", { usuarioId: ana, status: "descartado" });
    expect(await excluirColaborador(db, ana)).toEqual({ excluido: false, motivo: "tem_itens", nome: "Ana Paula" });
    const livre = await pessoa("Pessoa Livre");
    expect(await excluirColaborador(db, livre)).toEqual({ excluido: true, nome: "Pessoa Livre" });
  });

  it("o banco também impede apagar uma pessoa com itens", async () => {
    const ana = await pessoa("Ana Paula");
    await novoItem("HST", { usuarioId: ana });
    await expect(db.execute(sql`delete from colaboradores where id = ${ana}`)).rejects.toThrow();
  });
});

describe("lista e página da pessoa", () => {
  it("conta os itens sem os descartados, em ordem alfabética, e busca por parte do nome", async () => {
    const joao = await pessoa("João Lima");
    await pessoa("ana paula");
    await novoItem("DSK", { usuarioId: joao, status: "em_uso" });
    await novoItem("MON", { usuarioId: joao, status: "em_uso" });
    await novoItem("TEC", { usuarioId: joao, status: "descartado" });

    const lista = await listarColaboradores(db, { pagina: 1 });
    expect(lista.colaboradores.map((c) => [c.nome, c.itens])).toEqual([
      ["ana paula", 0],
      ["João Lima", 2],
    ]);
    expect((await listarColaboradores(db, { busca: "JOÃO", pagina: 1 })).colaboradores.map((c) => c.nome)).toEqual(["João Lima"]);
    expect(await obterColaborador(db, joao)).toMatchObject({ itensAtivos: 2, totalDeItens: 3 });
    expect((await itensDaPessoa(db, joao)).map((i) => i.codigo)).toEqual(["DSK0001", "MON0001"]);
  });

  it("'Também com' mostra até 5 outros itens, sem o próprio e sem descartados", async () => {
    const joao = await pessoa("João Lima");
    const pc = await novoItem("DSK", { usuarioId: joao, status: "em_uso" });
    for (let i = 0; i < 6; i++) await novoItem("MOU", { usuarioId: joao, status: "em_uso" });
    await novoItem("TEC", { usuarioId: joao, status: "descartado" });
    const idDoPc = (await obterItemPorCodigo(db, pc))!.id;
    const r = await tambemCom(db, joao, idDoPc);
    expect(r.total).toBe(6);
    expect(r.itens.map((i) => i.codigo)).toEqual(["MOU0001", "MOU0002", "MOU0003", "MOU0004", "MOU0005"]);
  });
});

describe("itens com pessoa", () => {
  it("guarda e mostra com quem o item está", async () => {
    const joao = await pessoa("João Lima");
    const codigo = await novoItem("NTB", { usuarioId: joao });
    expect((await obterItemPorCodigo(db, codigo))?.usuario).toEqual({ id: joao, nome: "João Lima" });
    expect((await obterItemPorCodigo(db, await novoItem("NTB")))?.usuario).toBeNull();
  });

  it("recusa uma pessoa que não existe", async () => {
    expect(await criarItem(db, dados({ tipoId: tipo.MON, usuarioId: 999 }))).toEqual({
      criado: false,
      erros: { usuarioId: "Escolha uma pessoa da lista." },
    });
    const codigo = await novoItem("MON");
    const id = (await obterItemPorCodigo(db, codigo))!.id;
    expect(await editarItem(db, id, dados({ tipoId: tipo.MON, usuarioId: 999 }))).toMatchObject({ salvo: false });
  });

  it("guarda a condição", async () => {
    const codigo = await novoItem("MON", { condicao: "regular" });
    expect((await obterItemPorCodigo(db, codigo))?.condicao).toBe("regular");
  });
});

describe("filtros novos do Inventário", () => {
  beforeEach(async () => {
    const joao = await pessoa("João Lima");
    const ana = await pessoa("Ana Paula");
    await novoItem("DSK", { usuarioId: joao, status: "em_uso", marca: "Dell", condicao: "bom" });
    await novoItem("MON", { usuarioId: joao, status: "em_uso", marca: "Dell", condicao: "novo" });
    await novoItem("MON", { usuarioId: ana, status: "em_uso", marca: "LG" });
    await novoItem("TEC", { condicao: "defeituoso" });
  });

  const codigos = async (parametros: Record<string, string>) =>
    (await listarItens(db, lerFiltros(parametros))).itens.map((i) => i.codigo);

  it("busca na lista, inclusive pelo nome da pessoa", async () => {
    expect(await codigos({ q: "dell" })).toEqual(["DSK0001", "MON0001"]);
    expect(await codigos({ q: "ana" })).toEqual(["MON0002"]);
    expect(await codigos({ q: "joão" })).toEqual(["DSK0001", "MON0001"]);
  });

  it("por tipo, condição e pessoa, combinando com os outros filtros", async () => {
    expect(await codigos({ tipo: String(tipo.MON) })).toEqual(["MON0001", "MON0002"]);
    expect(await codigos({ condicao: "defeituoso" })).toEqual(["TEC0001"]);
    const joao = (await listarColaboradores(db, { busca: "joão", pagina: 1 })).colaboradores[0].id;
    expect(await codigos({ pessoa: String(joao), tipo: String(tipo.MON) })).toEqual(["MON0001"]);
    expect(await codigos({ q: "dell", categoria: "periferico" })).toEqual(["MON0001"]);
  });

  it("ignora valores inválidos no endereço", () => {
    expect(lerFiltros({ tipo: "abc", pessoa: "-1", condicao: "ótimo", q: "   " })).toEqual({
      busca: undefined, categoria: undefined, status: undefined, tipo: undefined, condicao: undefined, caracteristicas: {}, pessoa: undefined, pagina: 1,
    });
  });

  it("a busca rápida acha pelo nome da pessoa", async () => {
    expect((await buscarItens(db, "ana paula")).map((i) => i.codigo)).toEqual(["MON0002"]);
  });

  it("o Início conta as pessoas diferentes com itens em uso", async () => {
    expect((await painelDoInicio(db, "2026-11-05")).pessoasComItensEmUso).toBe(2);
  });
});

describe("vincular e devolver pela página da pessoa", () => {
  const id = async (codigo: string) => (await obterItemPorCodigo(db, codigo))!.id;
  const status = async (codigo: string) => (await obterItemPorCodigo(db, codigo))!.status;

  it("lista os itens que podem ir para a pessoa: sem descartados, sem os dela, livres primeiro", async () => {
    const pedro = await pessoa("Pedro Martins");
    const ana = await pessoa("Ana Paula");
    await novoItem("MON", { usuarioId: ana, status: "em_uso" }); // MON0001, com outra pessoa
    await novoItem("DSK"); // DSK0001, livre
    await novoItem("TEC", { usuarioId: pedro, status: "em_uso" }); // já é dele
    await novoItem("MOU", { status: "descartado" });
    expect((await itensParaVincular(db, pedro, "")).map((i) => i.codigo)).toEqual(["DSK0001", "MON0001"]);
    expect((await itensParaVincular(db, pedro, "ana")).map((i) => i.codigo)).toEqual(["MON0001"]);
  });

  it("vincula vários de uma vez; em estoque vira em uso, manutenção continua", async () => {
    const pedro = await pessoa("Pedro Martins");
    const ana = await pessoa("Ana Paula");
    await novoItem("DSK");
    await novoItem("MON", { usuarioId: ana, status: "em_uso" });
    await novoItem("NTB", { status: "em_manutencao" });
    const r = await vincularItens(db, pedro, [await id("DSK0001"), await id("MON0001"), await id("NTB0001")]);
    expect(r).toEqual({ ok: true, nome: "Pedro Martins", codigos: ["DSK0001", "MON0001", "NTB0001"] });
    expect(await status("DSK0001")).toBe("em_uso");
    expect(await status("NTB0001")).toBe("em_manutencao");
    expect((await itensDaPessoa(db, pedro)).map((i) => i.codigo)).toEqual(["DSK0001", "MON0001", "NTB0001"]);
    expect(await itensDaPessoa(db, ana)).toEqual([]);
  });

  it("não vincula descartados nem para uma pessoa que não existe", async () => {
    const pedro = await pessoa("Pedro Martins");
    await novoItem("MOU", { status: "descartado" });
    expect(await vincularItens(db, pedro, [await id("MOU0001")])).toMatchObject({ ok: true, codigos: [] });
    expect(await vincularItens(db, 999, [await id("MOU0001")])).toEqual({ ok: false, motivo: "pessoa_nao_encontrada" });
  });

  it("devolver tira da pessoa e, se estava em uso, volta para o estoque", async () => {
    const pedro = await pessoa("Pedro Martins");
    await novoItem("DSK", { usuarioId: pedro, status: "em_uso" });
    await novoItem("NTB", { usuarioId: pedro, status: "em_manutencao" });
    expect(await devolverItem(db, pedro, await id("DSK0001"))).toEqual({ codigo: "DSK0001", voltouAoEstoque: true });
    expect(await devolverItem(db, pedro, await id("NTB0001"))).toEqual({ codigo: "NTB0001", voltouAoEstoque: false });
    expect(await status("NTB0001")).toBe("em_manutencao");
    expect(await itensDaPessoa(db, pedro)).toEqual([]);
    // Um item que não é dela não é devolvido.
    expect(await devolverItem(db, pedro, await id("DSK0001"))).toBeNull();
  });
});
