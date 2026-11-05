import { readFileSync } from "node:fs";

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { criarColaborador, editarColaborador, vincularItens } from "@/lib/colaboradores/servico";
import { tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { lerFiltros, listarItens } from "@/lib/itens/consultas";
import type { DadosDoItem } from "@/lib/itens/regras";
import { criarItem, editarItem, obterItemPorCodigo } from "@/lib/itens/servico";
import { caminhoDeCima, comOsDeDentro, montarCaminhos, podeFicarDentro } from "@/lib/locais/arvore";
import {
  contagensDosLocais,
  criarLocal,
  editarLocal,
  excluirLocal,
  itensParaTrazer,
  itensSemUsuarioDoLocal,
  listarLocais,
  pessoasDoLocal,
  pessoasParaTrazer,
  trazerItens,
  trazerPessoas,
} from "@/lib/locais/servico";

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
  await db.execute(sql`truncate table itens, colaboradores, locais, tipos_de_item restart identity`);
  await db.execute(sql.raw(TIPOS_PADRAO));
  tipo = Object.fromEntries((await db.select().from(tiposDeItem)).map((t) => [t.prefixo, t.id]));
});

async function local(nome: string, paiId: number | null = null) {
  const r = await criarLocal(db, { nome, paiId });
  if (!r.criado) throw new Error(JSON.stringify(r.erros));
  return r.local.id;
}

async function pessoa(nome: string, localId: number | null = null) {
  const r = await criarColaborador(db, nome, localId);
  if (!r.criado) throw new Error(r.erro);
  return r.colaborador.id;
}

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

describe("árvore (sem banco)", () => {
  const arvore = [
    { id: 1, nome: "Filial 04", paiId: null },
    { id: 2, nome: "2º andar", paiId: 1 },
    { id: 3, nome: "Financeiro", paiId: 2 },
    { id: 4, nome: "Filial 03", paiId: null },
  ];

  it("monta o caminho com ' › '", () => {
    expect(montarCaminhos(arvore).get(3)).toBe("Filial 04 › 2º andar › Financeiro");
    expect(caminhoDeCima("Filial 04 › 2º andar › Financeiro")).toBe("Filial 04 › 2º andar");
  });

  it("acha os locais de dentro, em qualquer nível", () => {
    expect(comOsDeDentro(arvore, 1).sort()).toEqual([1, 2, 3]);
    expect(comOsDeDentro(arvore, 4)).toEqual([4]);
  });

  it("um local não fica dentro dele mesmo nem de um local de dentro dele", () => {
    expect(podeFicarDentro(arvore, 1, 1)).toBe(false);
    expect(podeFicarDentro(arvore, 1, 3)).toBe(false);
    expect(podeFicarDentro(arvore, 3, 4)).toBe(true);
    expect(podeFicarDentro(arvore, 2, null)).toBe(true);
  });
});

describe("cadastro de locais", () => {
  it("guarda o caminho e lista em ordem de caminho", async () => {
    const filial = await local("Filial 04");
    const andar = await local("2º andar", filial);
    await local("Financeiro", andar);
    await local("Assistência técnica");
    expect((await listarLocais(db)).map((l) => [l.caminho, l.nivel])).toEqual([
      ["Assistência técnica", 0],
      ["Filial 04", 0],
      ["Filial 04 › 2º andar", 1],
      ["Filial 04 › 2º andar › Financeiro", 2],
    ]);
  });

  it("não repete nome dentro do mesmo pai, mas pode em pais diferentes", async () => {
    const a = await local("Filial 04");
    const b = await local("Filial 03");
    await local("Financeiro", a);
    expect(await criarLocal(db, { nome: "FINANCEIRO", paiId: a })).toEqual({
      criado: false,
      erros: { nome: "Já existe um local com este nome aqui." },
    });
    expect((await criarLocal(db, { nome: "Financeiro", paiId: b })).criado).toBe(true);
    expect((await criarLocal(db, { nome: "filial 04", paiId: null })).criado).toBe(false);
  });

  it("renomear ou mover atualiza o caminho de todos os de dentro", async () => {
    const filial = await local("Filial 04");
    const andar = await local("2º andar", filial);
    const fin = await local("Financeiro", andar);
    await editarLocal(db, filial, { nome: "Matriz", paiId: null });
    const outra = await local("Filial 03");
    await editarLocal(db, andar, { nome: "2º andar", paiId: outra });
    const caminhos = Object.fromEntries((await listarLocais(db)).map((l) => [l.id, l.caminho]));
    expect(caminhos[fin]).toBe("Filial 03 › 2º andar › Financeiro");
    expect(caminhos[filial]).toBe("Matriz");
  });

  it("recusa ciclos", async () => {
    const a = await local("Filial 04");
    const b = await local("2º andar", a);
    expect(await editarLocal(db, a, { nome: "Filial 04", paiId: b })).toEqual({
      salvo: false,
      erros: { paiId: "Um local não pode ficar dentro dele mesmo." },
    });
    expect(await editarLocal(db, a, { nome: "Filial 04", paiId: a })).toMatchObject({ salvo: false });
  });

  it("só exclui um local vazio: sem locais dentro, pessoas nem itens (nem descartados)", async () => {
    const filial = await local("Filial 04");
    const sala = await local("Sala da TI", filial);
    const recepcao = await local("Recepção", filial);
    const vazio = await local("Vazio");
    await pessoa("Ana Paula", recepcao);
    await novoItem("MOU", { localId: sala, status: "descartado" });
    expect(await excluirLocal(db, filial)).toMatchObject({ excluido: false, motivo: "nao_vazio" });
    expect(await excluirLocal(db, sala)).toMatchObject({ excluido: false, motivo: "nao_vazio" });
    expect(await excluirLocal(db, recepcao)).toMatchObject({ excluido: false, motivo: "nao_vazio" });
    expect(await excluirLocal(db, vazio)).toEqual({ excluido: true, caminho: "Vazio" });
  });
});

describe("local na pessoa e no item", () => {
  it("o item com usuário fica onde a pessoa está e perde o local próprio", async () => {
    const filial = await local("Filial 04");
    const financeiro = await local("Financeiro", filial);
    const estoque = await local("Estoque da TI", filial);
    const joao = await pessoa("João Lima", financeiro);

    const codigo = await novoItem("DSK", { usuarioId: joao, localId: estoque });
    const item = await obterItemPorCodigo(db, codigo);
    expect(item?.localId).toBeNull();
    expect(item?.local?.caminho).toBe("Filial 04 › Financeiro");

    const livre = await novoItem("MON", { localId: estoque });
    expect((await obterItemPorCodigo(db, livre))?.local?.caminho).toBe("Filial 04 › Estoque da TI");
  });

  it("mudar o local da pessoa muda o local de todos os itens dela", async () => {
    const a = await local("Financeiro");
    const b = await local("RH");
    const joao = await pessoa("João Lima", a);
    const codigo = await novoItem("NTB", { usuarioId: joao });
    await editarColaborador(db, joao, "João Lima", b);
    expect((await obterItemPorCodigo(db, codigo))?.local?.nome).toBe("RH");
  });

  it("dar uma pessoa a um item (vincular) tira o local próprio dele", async () => {
    const estoque = await local("Estoque da TI");
    const joao = await pessoa("João Lima");
    const codigo = await novoItem("MON", { localId: estoque });
    const id = (await obterItemPorCodigo(db, codigo))!.id;
    await vincularItens(db, joao, [id]);
    expect((await obterItemPorCodigo(db, codigo))?.localId).toBeNull();
  });

  it("recusa um local que não existe", async () => {
    expect(await criarItem(db, dados({ tipoId: tipo.MON, localId: 999 }))).toEqual({
      criado: false,
      erros: { localId: "Escolha um local da lista." },
    });
    const codigo = await novoItem("MON");
    const id = (await obterItemPorCodigo(db, codigo))!.id;
    expect(await editarItem(db, id, dados({ tipoId: tipo.MON, localId: 999 }))).toMatchObject({ salvo: false });
  });
});

describe("filtro por local no Inventário", () => {
  it("inclui os locais de dentro, e 'Sem local definido' pega os dois casos", async () => {
    const filial = await local("Filial 04");
    const andar = await local("2º andar", filial);
    const fin = await local("Financeiro", andar);
    const outra = await local("Filial 03");
    const joao = await pessoa("João Lima", fin);
    const semLocal = await pessoa("Sem Lugar");
    await novoItem("DSK", { usuarioId: joao }); // DSK0001: Filial 04 › 2º andar › Financeiro (pela pessoa)
    await novoItem("MON", { localId: andar }); // MON0001: Filial 04 › 2º andar
    await novoItem("TEC", { localId: outra }); // TEC0001: Filial 03
    await novoItem("MOU", { usuarioId: semLocal }); // MOU0001: pessoa sem local
    await novoItem("HST"); // HST0001: sem usuário e sem local

    const codigos = async (p: Record<string, string>) => (await listarItens(db, lerFiltros(p))).itens.map((i) => i.codigo);
    expect(await codigos({ local: String(filial) })).toEqual(["DSK0001", "MON0001"]);
    expect(await codigos({ local: String(fin) })).toEqual(["DSK0001"]);
    expect(await codigos({ local: "sem" })).toEqual(["HST0001", "MOU0001"]);
  });
});

describe("tela e página do local", () => {
  it("as contagens somam os locais de dentro e não contam descartados", async () => {
    const filial = await local("Filial 04");
    const sala = await local("Sala da TI", filial);
    await pessoa("Ana Paula", filial);
    await pessoa("João Lima", sala);
    await novoItem("MON", { localId: sala });
    await novoItem("TEC", { localId: sala, status: "descartado" });
    const c = await contagensDosLocais(db);
    expect(c.get(filial)).toEqual({ pessoas: 2, itensSemUsuario: 1, vazio: false });
    expect(c.get(sala)).toEqual({ pessoas: 1, itensSemUsuario: 1, vazio: false });
  });

  it("mostra as pessoas e os itens sem usuário do local e dos de dentro", async () => {
    const filial = await local("Filial 04");
    const sala = await local("Sala da TI", filial);
    const ana = await pessoa("Ana Paula", sala);
    await novoItem("MON", { localId: sala });
    await novoItem("DSK", { usuarioId: ana }); // com usuário: não aparece nos "itens sem usuário"
    expect((await pessoasDoLocal(db, filial)).map((p) => [p.nome, p.caminho, p.itens])).toEqual([
      ["Ana Paula", "Filial 04 › Sala da TI", 1],
    ]);
    expect((await itensSemUsuarioDoLocal(db, filial)).map((i) => i.codigo)).toEqual(["MON0001"]);
  });

  it("'Trazer pessoas' e 'Trazer itens' colocam vários de uma vez", async () => {
    const fin = await local("Financeiro");
    const estoque = await local("Estoque da TI");
    const ana = await pessoa("Ana Paula");
    const joao = await pessoa("João Lima", estoque);
    await pessoa("Já Aqui", fin);
    expect((await pessoasParaTrazer(db, fin, "")).map((p) => p.nome)).toEqual(["Ana Paula", "João Lima"]);
    expect(await trazerPessoas(db, fin, [ana, joao])).toBe(2);
    expect((await pessoasDoLocal(db, fin)).map((p) => p.nome)).toEqual(["Ana Paula", "João Lima", "Já Aqui"]);

    await novoItem("MON");
    await novoItem("TEC", { usuarioId: ana }); // com usuário: não pode ser trazido
    await novoItem("MOU", { status: "descartado" });
    const opcoes = await itensParaTrazer(db, estoque, "");
    expect(opcoes.map((i) => i.codigo)).toEqual(["MON0001"]);
    expect(await trazerItens(db, estoque, opcoes.map((i) => i.id))).toBe(1);
    expect((await itensSemUsuarioDoLocal(db, estoque)).map((i) => i.codigo)).toEqual(["MON0001"]);
    expect(await trazerPessoas(db, 999, [ana])).toBeNull();
  });
});
