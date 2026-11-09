import { readFileSync } from "node:fs";

import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  caracteristicasDoDono,
  criarCaracteristica,
  editarCaracteristica,
  excluirCaracteristica,
  lerDono,
  moverCaracteristica,
  usoDosValores,
} from "@/lib/caracteristicas/configuracao";
import { lerFiltrosDeCaracteristicas, SEM_VALOR } from "@/lib/caracteristicas/filtros";
import {
  conferirValores,
  descreverFiltros,
  etiquetasDasCaracteristicas,
  lerNumero,
  valorFormatado,
  valorParaOCampo,
} from "@/lib/caracteristicas/regras";
import { caracteristicasDoGrupo, caracteristicasDoTipo, opcoesDosFiltros, simples } from "@/lib/caracteristicas/servico";
import type { Caracteristica } from "@/lib/caracteristicas/valores";
import { definicoesDeCaracteristicas, itens, materiais, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { lerPlanilha, COLUNAS_DOS_ITENS, COLUNAS_DOS_MATERIAIS, type Celula } from "@/lib/importacao/planilha";
import { importarPlanilha, previaDaImportacao } from "@/lib/importacao/servico";
import { enderecoDoInventario, lerFiltros, listarItens, todosOsItens } from "@/lib/itens/consultas";
import type { DadosDoItem } from "@/lib/itens/regras";
import { dimensoesDosItens, eixosPadraoDosItens } from "@/lib/itens/resumo";
import { criarItem, editarItem, obterItemPorCodigo } from "@/lib/itens/servico";
import { dimensoesDosMateriais, eixosPadraoDosMateriais } from "@/lib/materiais/resumo";
import { criarMaterial, editarMaterial, listarMateriais, obterMaterial } from "@/lib/materiais/servico";
import type { Grupo } from "@/lib/materiais/valores";
import { lerPedidoDeConferencia } from "@/lib/relatorios/pedido";
import { dadosDaConferencia } from "@/lib/relatorios/conferencia";
import { comOsParametros, lerEixos, montarResumo, parametrosDoResumo } from "@/lib/resumo/tabela";

import { criarBancoDeTeste } from "./banco-de-teste";

/**
 * As características: as regras (sem banco), o cadastro com elas, os filtros,
 * o Resumo, a configuração, a importação e o preenchimento automático da migration.
 * O banco vem com as características que a migration cria para os grupos e tipos.
 */

let db: Banco;
let fechar: () => Promise<void>;

beforeAll(async () => {
  ({ db, fechar } = await criarBancoDeTeste());
});

afterAll(async () => {
  await fechar();
});

beforeEach(async () => {
  await db.execute(sql`truncate table historico_de_itens, importacoes, movimentos_de_material, materiais, itens, colaboradores, locais restart identity`);
  // As que os testes de configuração criam (a migration não cria nenhuma para Segurança e Outros).
  await db.delete(definicoesDeCaracteristicas).where(inArray(definicoesDeCaracteristicas.grupo, ["seguranca", "outros"]));
});

async function tipoPorPrefixo(prefixo: string) {
  const [t] = await db.select({ id: tiposDeItem.id }).from(tiposDeItem).where(eq(tiposDeItem.prefixo, prefixo));
  return t.id;
}

async function idDe(dono: { tipoId: number } | { grupo: Grupo }, nome: string) {
  const lista = "tipoId" in dono ? await caracteristicasDoTipo(db, dono.tipoId) : await caracteristicasDoGrupo(db, dono.grupo);
  return lista.find((c) => c.nome === nome)!.id;
}

function dadosDoItem(tipoId: number, parcial: Partial<DadosDoItem> = {}): DadosDoItem {
  return {
    tipoId,
    marca: null,
    modelo: null,
    numeroSerie: null,
    usuarioId: null,
    localId: null,
    status: "em_estoque",
    condicao: null,
    hostname: null,
    processador: null,
    memoriaRam: null,
    armazenamento: null,
    sistemaOperacional: null,
    dataCompra: null,
    garantiaAte: null,
    observacoes: null,
    ...parcial,
  };
}

async function material(nome: string, grupo: Grupo, caracteristicas: Record<string, string> = {}, extra: { quantidade?: number; marcaModelo?: string; observacoes?: string; condicao?: "novo" | "usado" | null } = {}) {
  const r = await criarMaterial(
    db,
    {
      nome,
      marcaModelo: extra.marcaModelo ?? null,
      compativelCom: null,
      grupo,
      localId: null,
      condicao: extra.condicao ?? null,
      observacoes: extra.observacoes ?? null,
      quantidade: extra.quantidade ?? 1,
    },
    caracteristicas,
  );
  if (!r.criado) throw new Error(JSON.stringify(r.erros));
  return r.material.id;
}

// ─── Regras (sem banco) ───────────────────────────────────────────────────

const COR: Caracteristica = { id: 1, nome: "Cor", tipo: "lista", opcoes: ["Preto", "Ciano", "Magenta", "Amarelo"], unidade: null };
const COMPRIMENTO: Caracteristica = { id: 2, nome: "Comprimento", tipo: "numero", opcoes: [], unidade: "m" };
const IMEI: Caracteristica = { id: 3, nome: "IMEI", tipo: "texto", opcoes: [], unidade: null };

describe("as regras das características", () => {
  it("lê números do jeito brasileiro", () => {
    expect(lerNumero("1,5")).toBe(1.5);
    expect(lerNumero("1.5")).toBe(1.5);
    expect(lerNumero("15.000")).toBe(15000);
    expect(lerNumero(" 2 ")).toBe(2);
    expect(lerNumero("dois")).toBeNull();
    expect(lerNumero("")).toBeNull();
  });

  it("confere os valores: opção da lista (sem diferença de maiúsculas), número e texto", () => {
    expect(conferirValores([COR, COMPRIMENTO, IMEI], { 1: "magenta", 2: "1,5", 3: " 3519 " })).toEqual({
      valores: { 1: "Magenta", 2: "1.5", 3: "3519" },
      erros: {},
    });
    const { erros } = conferirValores([COR, COMPRIMENTO, IMEI], { 1: "Roxo", 2: "dois metros", 3: "x".repeat(101) });
    expect(erros.car_1).toBe("Escolha uma das opções: Preto, Ciano, Magenta, Amarelo.");
    expect(erros.car_2).toBe("Use só números (ex.: 1,5).");
    expect(erros.car_3).toMatch(/no máximo 100/);
    // Em branco e de outra característica: ficam de fora.
    expect(conferirValores([COR], { 1: "", 99: "Azul" })).toEqual({ valores: {}, erros: {} });
  });

  it("mostra os valores na tela: etiquetas, número com unidade e filtros em frases", () => {
    expect(valorFormatado(COMPRIMENTO, "1.5")).toBe("1,5 m");
    expect(valorParaOCampo(COMPRIMENTO, "1.5")).toBe("1,5");
    expect(etiquetasDasCaracteristicas([COR, COMPRIMENTO, IMEI], { 1: "Ciano", 2: "3", 3: "3519" })).toEqual(["Ciano", "3 m", "IMEI: 3519"]);
    expect(descreverFiltros([COR, COMPRIMENTO], { 1: "Preto", 2: SEM_VALOR })).toEqual(["Cor: Preto", "Comprimento: não informado"]);
  });

  it("lê os filtros do endereço (c12=Magenta), com outro prefixo no relatório (mc12)", () => {
    expect(lerFiltrosDeCaracteristicas({ c12: "Magenta", c13: "nenhum", cor: "x", c: "y" })).toEqual({ 12: "Magenta", 13: "nenhum" });
    expect(lerFiltrosDeCaracteristicas({ mc12: "Magenta", c13: "Preto" }, "mc")).toEqual({ 12: "Magenta" });
  });
});

// ─── O que a migration cria ───────────────────────────────────────────────

describe("as características que já vêm prontas", () => {
  it("têm as de impressão (cor, linha e rendimento) e as dos kits (conexão e receptor)", async () => {
    const impressao = await caracteristicasDoGrupo(db, "impressao");
    expect(impressao.map((c) => `${c.nome}:${c.tipo}`)).toEqual(["Cor:lista", "Linha:lista", "Rendimento:numero"]);
    expect(impressao[0].opcoes).toEqual(["Preto", "Ciano", "Magenta", "Amarelo"]);
    expect(impressao[2].unidade).toBe("páginas");
    const mouse = await caracteristicasDoTipo(db, await tipoPorPrefixo("MOU"));
    expect(mouse.map((c) => c.nome)).toEqual(["Conexão", "Receptor USB"]);
  });

  it("o preenchimento automático só preenche o que está claro e vazio, e pode rodar de novo", async () => {
    const tonerPreto = await material("Toner", "impressao", {}, { marcaModelo: "Ricoh SP 3710 Preto", observacoes: "Compatível. Rende 7.000 páginas" });
    const tonerSemCor = await material("Toner", "impressao", {}, { marcaModelo: "Ricoh SP 3710" });
    const jaPreenchido = await material("Toner", "impressao", { [await idDe({ grupo: "impressao" }, "Cor")]: "Ciano" }, { marcaModelo: "Toner Preto" });
    const patch = await material("Patch cord", "rede_e_rack", {}, { marcaModelo: "Cat6 Azul 1,5m" });
    const mouse = await criarItem(db, dadosDoItem(await tipoPorPrefixo("MOU"), { observacoes: "Sem fio. Não encontramos os conectores." }));
    if (!mouse.criado) throw new Error("não criou");

    const migration = readFileSync("drizzle/0011_caracteristicas.sql", "utf8");
    const preencher = migration.slice(migration.indexOf("-- PREENCHER")).split("--> statement-breakpoint");
    for (let vez = 0; vez < 2; vez++) for (const comando of preencher) await db.execute(sql.raw(comando));

    const cor = await idDe({ grupo: "impressao" }, "Cor");
    const linha = await idDe({ grupo: "impressao" }, "Linha");
    const rendimento = await idDe({ grupo: "impressao" }, "Rendimento");
    expect((await obterMaterial(db, tonerPreto))!.caracteristicas).toEqual({ [cor]: "Preto", [linha]: "Compatível", [rendimento]: "7000" });
    expect((await obterMaterial(db, tonerPreto))!.compativelCom).toBe("Ricoh SP 3710");
    expect((await obterMaterial(db, tonerSemCor))!.caracteristicas).toEqual({});
    // O que já estava preenchido não muda.
    expect((await obterMaterial(db, jaPreenchido))!.caracteristicas).toEqual({ [cor]: "Ciano" });

    const rede = (nome: string) => idDe({ grupo: "rede_e_rack" }, nome);
    expect((await obterMaterial(db, patch))!.caracteristicas).toEqual({
      [await rede("Categoria")]: "Cat 6",
      [await rede("Cor")]: "Azul",
      [await rede("Comprimento")]: "1.5",
    });

    const mou = await tipoPorPrefixo("MOU");
    expect((await obterItemPorCodigo(db, mouse.codigo))!.caracteristicas).toEqual({
      [await idDe({ tipoId: mou }, "Conexão")]: "Sem fio",
      [await idDe({ tipoId: mou }, "Receptor USB")]: "Sem receptor",
    });
  });
});

// ─── Cadastro de itens e materiais ────────────────────────────────────────

describe("cadastro com características", () => {
  it("o item guarda as do tipo dele, conferidas; ao mudar de tipo, as do tipo antigo saem", async () => {
    const mou = await tipoPorPrefixo("MOU");
    const mon = await tipoPorPrefixo("MON");
    const conexao = await idDe({ tipoId: mou }, "Conexão");
    const tamanho = await idDe({ tipoId: mon }, "Tamanho");

    const errado = await criarItem(db, dadosDoItem(mou), { [conexao]: "Infravermelho" });
    expect(errado).toEqual({ criado: false, erros: { [`car_${conexao}`]: "Escolha uma das opções: USB, Sem fio, Bluetooth." } });

    const certo = await criarItem(db, dadosDoItem(mou), { [conexao]: "sem fio", [tamanho]: "24" });
    if (!certo.criado) throw new Error("não criou");
    expect((await obterItemPorCodigo(db, certo.codigo))!.caracteristicas).toEqual({ [conexao]: "Sem fio" });

    const id = (await obterItemPorCodigo(db, certo.codigo))!.id;
    const editado = await editarItem(db, id, dadosDoItem(mon), { [conexao]: "Sem fio", [tamanho]: "23,8" });
    if (!editado.salvo) throw new Error("não salvou");
    expect((await obterItemPorCodigo(db, editado.codigo))!.caracteristicas).toEqual({ [tamanho]: "23.8" });
  });

  it("o material guarda as do grupo dele", async () => {
    const cor = await idDe({ grupo: "impressao" }, "Cor");
    const id = await material("Toner", "impressao", { [cor]: "amarelo" });
    expect((await obterMaterial(db, id))!.caracteristicas).toEqual({ [cor]: "Amarelo" });
    const r = await editarMaterial(db, id, { nome: "Toner", marcaModelo: null, compativelCom: null, grupo: "impressao", localId: null, condicao: null, observacoes: null }, { [cor]: "Laranja" });
    expect(r).toMatchObject({ salvo: false, erros: { [`car_${cor}`]: expect.stringMatching(/Escolha uma das opções/) } });
  });
});

// ─── Filtros, busca e Resumo ──────────────────────────────────────────────

describe("filtros, busca e Resumo", () => {
  it("filtra os materiais por característica (e por “não informado”) e acha pela busca", async () => {
    const cor = await idDe({ grupo: "impressao" }, "Cor");
    await material("Toner A", "impressao", { [cor]: "Magenta" }, { quantidade: 2 });
    await material("Toner B", "impressao", { [cor]: "Preto" }, { quantidade: 5 });
    await material("Toner C", "impressao", {}, { quantidade: 1 });
    const nomes = async (caracteristicas: Record<number, string>, busca?: string) =>
      (await listarMateriais(db, { grupo: "impressao", caracteristicas, busca })).map((m) => m.nome);
    expect(await nomes({ [cor]: "Magenta" })).toEqual(["Toner A"]);
    expect(await nomes({ [cor]: SEM_VALOR })).toEqual(["Toner C"]);
    expect(await nomes({}, "magenta")).toEqual(["Toner A"]);
  });

  it("filtra os itens por característica só com o tipo escolhido, e pela condição não informada", async () => {
    const mou = await tipoPorPrefixo("MOU");
    const conexao = await idDe({ tipoId: mou }, "Conexão");
    const codigos: string[] = [];
    for (const [valor, condicao] of [["USB", "novo"], ["Sem fio", null], ["", "usado"]] as const) {
      const r = await criarItem(db, dadosDoItem(mou, { condicao }), valor ? { [conexao]: valor } : {});
      if (!r.criado) throw new Error("não criou");
      codigos.push(r.codigo);
    }
    const [usb, semFio, semConexao] = codigos;
    expect(lerFiltros({ c1: "USB" }).caracteristicas).toEqual({});
    const filtros = lerFiltros({ tipo: String(mou), [`c${conexao}`]: "Sem fio" });
    expect(enderecoDoInventario(filtros)).toBe(`/inventario?tipo=${mou}&c${conexao}=Sem+fio`);
    expect((await listarItens(db, filtros)).itens.map((i) => i.codigo)).toEqual([semFio]);
    expect((await listarItens(db, lerFiltros({ tipo: String(mou), [`c${conexao}`]: SEM_VALOR }))).itens.map((i) => i.codigo)).toEqual([semConexao]);
    expect((await listarItens(db, lerFiltros({ condicao: "nenhuma" }))).itens.map((i) => i.codigo)).toEqual([semFio]);
    expect((await todosOsItens(db, { tipo: mou, busca: "sem fio" })).map((i) => i.codigo)).toEqual([semFio]);
    expect((await todosOsItens(db, { tipo: mou, condicao: "novo" })).map((i) => i.codigo)).toEqual([usb]);

    const opcoes = await opcoesDosFiltros(db, await caracteristicasDoTipo(db, mou));
    expect(opcoes.map((o) => o.nome)).toEqual(["Conexão", "Receptor USB"]);
  });

  it("monta o Resumo dos toners: impressora e condição × cor, com as quantidades", async () => {
    const cor = await idDe({ grupo: "impressao" }, "Cor");
    const toner = (marca: string, valor: string, condicao: "novo" | "usado", quantidade: number) =>
      criarMaterial(db, { nome: "Toner", marcaModelo: marca, compativelCom: marca, grupo: "impressao", localId: null, condicao, observacoes: null, quantidade }, { [cor]: valor });
    await toner("Ricoh SP 3710", "Preto", "novo", 4);
    await toner("Ricoh SP 3710", "Preto", "usado", 1);
    await toner("Ricoh MP C2003", "Magenta", "novo", 2);
    await toner("Ricoh MP C2003", "Preto", "novo", 3);

    const doGrupo = (await caracteristicasDoGrupo(db, "impressao")).map(simples);
    const dimensoes = dimensoesDosMateriais(doGrupo);
    const eixos = lerEixos({}, dimensoes.map((d) => d.id), eixosPadraoDosMateriais("impressao", doGrupo));
    expect(eixos).toEqual({ linhas: ["compativel", "condicao"], colunas: `c${cor}` });

    const lista = await listarMateriais(db, { grupo: "impressao" });
    const resumo = montarResumo(
      lista,
      eixos.linhas.map((id) => dimensoes.find((d) => d.id === id)!),
      dimensoes.find((d) => d.id === eixos.colunas)!,
      (m) => m.quantidade,
    );
    expect(resumo.colunas.map((c) => c.rotulo)).toEqual(["Preto", "Magenta"]);
    expect(resumo.linhas.map((l) => [...l.eixos.map((e) => e.rotulo), ...l.celulas, l.total])).toEqual([
      ["Ricoh MP C2003", "Novo", 3, 2, 5],
      ["Ricoh SP 3710", "Novo", 4, 0, 4],
      ["Ricoh SP 3710", "Usado", 1, 0, 1],
    ]);
    expect(resumo.totaisDasColunas).toEqual([8, 2]);
    expect(resumo.total).toBe(10);
    // Cada célula sabe o filtro que leva à lista.
    expect(resumo.linhas[2].eixos.map((e) => e.filtro)).toEqual([{ compativel: "Ricoh SP 3710" }, { condicao: "usado" }]);
    expect(resumo.colunas[1].filtro).toEqual({ [`c${cor}`]: "Magenta" });
  });

  it("monta o Resumo dos itens (um por item) e lê o cruzamento do endereço", async () => {
    const mou = await tipoPorPrefixo("MOU");
    const conexao = await idDe({ tipoId: mou }, "Conexão");
    for (const valor of ["USB", "USB", "Sem fio"]) await criarItem(db, dadosDoItem(mou), { [conexao]: valor });
    const doTipo = (await caracteristicasDoTipo(db, mou)).map(simples);
    const dimensoes = dimensoesDosItens(doTipo);
    expect(eixosPadraoDosItens(undefined, doTipo)).toEqual({ linhas: ["tipo"], colunas: "status" });
    const eixos = lerEixos({ linhas: `c${conexao},inventada`, colunas: "status" }, dimensoes.map((d) => d.id), eixosPadraoDosItens(mou, doTipo));
    expect(eixos).toEqual({ linhas: [`c${conexao}`], colunas: "status" });
    const resumo = montarResumo(await todosOsItens(db, { tipo: mou }), [dimensoes.find((d) => d.id === `c${conexao}`)!], dimensoes.find((d) => d.id === "status")!, () => 1);
    expect(resumo.linhas.map((l) => [l.eixos[0].rotulo, l.total])).toEqual([["USB", 2], ["Sem fio", 1]]);
  });

  it("guarda a visão Resumo ao mudar os filtros", () => {
    expect(parametrosDoResumo({ visao: "resumo", linhas: "c1", colunas: "status", q: "x" })).toEqual({ visao: "resumo", linhas: "c1", colunas: "status" });
    expect(parametrosDoResumo({ visao: "lista", linhas: "c1" })).toEqual({});
    expect(comOsParametros("/materiais?grupo=cabos", { visao: "resumo" })).toBe("/materiais?grupo=cabos&visao=resumo");
    expect(comOsParametros("/materiais", {})).toBe("/materiais");
  });

  it("o relatório de conferência usa os filtros por característica", async () => {
    const cor = await idDe({ grupo: "impressao" }, "Cor");
    await material("Toner A", "impressao", { [cor]: "Magenta" });
    await material("Toner B", "impressao", { [cor]: "Preto" });
    const pedido = lerPedidoDeConferencia({ materiais: "1", grupos: "impressao", [`mc${cor}`]: "Magenta" });
    const dados = await dadosDaConferencia(db, pedido);
    expect(dados.materiais!.porGrupo[0].materiais.map((m) => m.nome)).toEqual(["Toner A"]);
    expect(dados.filtros).toContain("Cor: Magenta");
    // Com vários grupos, as características não valem.
    expect(lerPedidoDeConferencia({ materiais: "1", grupos: "impressao,cabos", [`mc${cor}`]: "Magenta" }).filtrosDosMateriais.caracteristicas).toEqual({});
  });
});

// ─── Configuração ─────────────────────────────────────────────────────────

describe("configuração das características", () => {
  const dados = (nome: string, tipo: string, opcoes: Array<string | [string, string]> = [], unidade = "") => ({
    nome,
    tipo,
    unidade,
    opcoes: opcoes.map((o) => (typeof o === "string" ? { valor: o, original: "" } : { valor: o[0], original: o[1] })),
  });

  it("confere o dono vindo da tela", () => {
    expect(lerDono("tipo:3")).toEqual({ tipoId: 3 });
    expect(lerDono("grupo:cabos")).toEqual({ grupo: "cabos" });
    expect(lerDono("grupo:inventado")).toBeNull();
    expect(lerDono("tipo:abc")).toBeNull();
  });

  it("cria com as regras: nome único no grupo, opções sem repetir, unidade só para número", async () => {
    expect(await criarCaracteristica(db, { grupo: "outros" }, dados("", "lista", ["A"]))).toEqual({ criada: false, erros: { nome: "Informe o nome." } });
    expect(await criarCaracteristica(db, { grupo: "outros" }, dados("Cor", "lista", ["  ", ""]))).toEqual({ criada: false, erros: { opcoes: "Informe pelo menos uma opção." } });
    expect(await criarCaracteristica(db, { grupo: "outros" }, dados("Cor", "lista", ["Azul", "azul"]))).toEqual({ criada: false, erros: { opcoes: "A opção “azul” aparece duas vezes." } });
    expect(await criarCaracteristica(db, { grupo: "outros" }, dados("Cor", "inventado"))).toEqual({ criada: false, erros: { tipo: "Escolha o tipo do campo." } });

    const cor = await criarCaracteristica(db, { grupo: "outros" }, dados("Cor", "lista", ["Azul", "  Verde  "]));
    expect(cor).toMatchObject({ criada: true, nome: "Cor" });
    expect(await criarCaracteristica(db, { grupo: "outros" }, dados("cor", "texto"))).toEqual({ criada: false, erros: { nome: "Já existe “cor” aqui." } });
    // O mesmo nome em outro grupo pode.
    expect(await criarCaracteristica(db, { grupo: "seguranca" }, dados("Cor", "texto"))).toMatchObject({ criada: true });

    await criarCaracteristica(db, { grupo: "outros" }, dados("Peso", "numero", ["ignorada"], " kg "));
    const lista = await caracteristicasDoDono(db, { grupo: "outros" });
    expect(lista.map((c) => [c.nome, c.opcoes, c.unidade, c.ordem])).toEqual([
      ["Cor", ["Azul", "Verde"], null, 1],
      ["Peso", [], "kg", 2],
    ]);
  });

  it("renomeia opções (e os valores nos cadastros), inclusive trocando duas entre si", async () => {
    const r = await criarCaracteristica(db, { grupo: "outros" }, dados("Cor", "lista", ["Azul", "Verde", "Roxo"]));
    if (!r.criada) throw new Error("não criou");
    const a = await material("Fita A", "outros", { [r.id]: "Azul" });
    const v = await material("Fita V", "outros", { [r.id]: "Verde" });

    const salvo = await editarCaracteristica(db, r.id, dados("Cor da fita", "texto", [["Verde", "Azul"], ["Azul", "Verde"], ["Roxo", "Roxo"]]));
    expect(salvo).toEqual({ salva: true, nome: "Cor da fita", renomeadas: 2 });
    expect((await obterMaterial(db, a))!.caracteristicas).toEqual({ [r.id]: "Verde" });
    expect((await obterMaterial(db, v))!.caracteristicas).toEqual({ [r.id]: "Azul" });
    // O tipo do campo não muda.
    expect((await caracteristicasDoDono(db, { grupo: "outros" }))[0].tipo).toBe("lista");
    expect(await usoDosValores(db, (await caracteristicasDoDono(db, { grupo: "outros" }))[0])).toEqual({ Azul: 1, Verde: 1 });
  });

  it("não deixa tirar uma opção em uso, mas deixa tirar a que ninguém usa", async () => {
    const r = await criarCaracteristica(db, { grupo: "outros" }, dados("Cor", "lista", ["Azul", "Verde"]));
    if (!r.criada) throw new Error("não criou");
    await material("Fita", "outros", { [r.id]: "Azul" }, { quantidade: 1 });
    await material("Fita 2", "outros", { [r.id]: "Azul" }, { quantidade: 1 });

    expect(await editarCaracteristica(db, r.id, dados("Cor", "lista", [["Verde", "Verde"]]))).toEqual({
      salva: false,
      erros: { opcoes: "“Azul” está em 2 cadastros. Troque o valor neles antes de tirar a opção (ou só mude o nome dela)." },
    });
    expect(await editarCaracteristica(db, r.id, dados("Cor", "lista", [["Azul", "Azul"], "Preto"]))).toMatchObject({ salva: true, renomeadas: 0 });
    expect((await caracteristicasDoDono(db, { grupo: "outros" }))[0].opcoes).toEqual(["Azul", "Preto"]);
  });

  it("exclui e apaga o valor dos cadastros; reordena", async () => {
    const um = await criarCaracteristica(db, { grupo: "outros" }, dados("Um", "texto"));
    const dois = await criarCaracteristica(db, { grupo: "outros" }, dados("Dois", "texto"));
    const tres = await criarCaracteristica(db, { grupo: "outros" }, dados("Três", "texto"));
    if (!um.criada || !dois.criada || !tres.criada) throw new Error("não criou");

    await moverCaracteristica(db, tres.id, "subir");
    expect((await caracteristicasDoDono(db, { grupo: "outros" })).map((c) => c.nome)).toEqual(["Um", "Três", "Dois"]);
    await moverCaracteristica(db, um.id, "subir"); // já é a primeira
    expect((await caracteristicasDoDono(db, { grupo: "outros" })).map((c) => c.nome)).toEqual(["Um", "Três", "Dois"]);

    const id = await material("Fita", "outros", { [um.id]: "a", [dois.id]: "b" });
    expect(await excluirCaracteristica(db, um.id)).toEqual({ excluida: true, nome: "Um", dono: { grupo: "outros" }, valoresApagados: 1 });
    expect((await obterMaterial(db, id))!.caracteristicas).toEqual({ [dois.id]: "b" });
    expect(await excluirCaracteristica(db, um.id)).toEqual({ excluida: false });
  });
});

// ─── Importação ───────────────────────────────────────────────────────────

describe("importação com características", () => {
  const aba = (nome: string, colunas: string[], linhas: Array<Record<string, Celula>>) => ({
    nome,
    linhas: [colunas, ...linhas.map((l) => colunas.map((c) => l[c] ?? null))],
  });

  it("lê as colunas a mais como características, confere e avisa das que ficam de fora", async () => {
    const lida = lerPlanilha([
      aba("Itens", [...COLUNAS_DOS_ITENS, "Conexão", "Apelido"], [
        { Tipo: "Mouse", "Conexão": "sem fio", Apelido: "o azul" },
        { Tipo: "Monitor", "Conexão": "USB" },
      ]),
      aba("Materiais", [...COLUNAS_DOS_MATERIAIS, "Cor", "Rendimento"], [
        { Nome: "Toner", Grupo: "Impressão", Quantidade: 2, Cor: "magenta", Rendimento: 15000 },
        { Nome: "Toner", Grupo: "Impressão", Quantidade: 1, Cor: "Roxo" },
      ]),
    ]);
    expect(lida.colunasExtras).toEqual({ itens: ["Conexão", "Apelido"], materiais: ["Cor", "Rendimento"] });
    expect(lida.itens[0].caracteristicas).toEqual({ "Conexão": "sem fio", Apelido: "o azul" });

    const previa = await previaDaImportacao(db, lida, "hash-1");
    expect(previa.erros).toEqual([{ aba: "Materiais", linha: 3, mensagem: "Cor: Escolha uma das opções: Preto, Ciano, Magenta, Amarelo." }]);
    expect(previa.avisos.map((a) => a.mensagem)).toEqual([
      "Coluna “Conexão”: ignorada em 1 linha (o tipo delas não tem essa característica).",
      "A coluna “Apelido” não é do modelo nem uma característica e foi ignorada.",
    ]);

    // Sem a linha errada, entra tudo, com as características.
    const certa = { ...lida, materiais: lida.materiais.slice(0, 1) };
    expect(await importarPlanilha(db, certa, { hash: "hash-2", nome: "x.xlsx" })).toEqual({ ok: true, itens: 2, materiais: 1 });
    const mou = await tipoPorPrefixo("MOU");
    const [importado] = await todosOsItens(db, { tipo: mou });
    expect(importado.caracteristicas).toEqual({ [await idDe({ tipoId: mou }, "Conexão")]: "Sem fio" });
    const [toner] = await db.select().from(materiais).where(and(eq(materiais.grupo, "impressao")));
    expect(toner.caracteristicas).toEqual({
      [await idDe({ grupo: "impressao" }, "Cor")]: "Magenta",
      [await idDe({ grupo: "impressao" }, "Rendimento")]: "15000",
    });
    expect((await db.select().from(itens)).length).toBe(2);
  });
});
