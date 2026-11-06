import { readFileSync } from "node:fs";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { criarColaborador, devolverItem, editarColaborador, vincularItens } from "@/lib/colaboradores/servico";
import { tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { lerFiltrosDoHistorico } from "@/lib/historico/filtros";
import { atividadeRecente, eventoDaMudanca, historicoDoItem, listarHistorico, type EstadoDoItem } from "@/lib/historico/servico";
import { textoDoRegistro } from "@/lib/historico/texto";
import type { DadosDoItem } from "@/lib/itens/regras";
import { devolverItemPara, entregarItem, mudarLocalDoItem } from "@/lib/itens/movimentos";
import { criarItem, editarItem, excluirItem, obterItemPorCodigo } from "@/lib/itens/servico";
import { criarLocal, trazerItens, trazerPessoas } from "@/lib/locais/servico";

import { criarBancoDeTeste } from "./banco-de-teste";

let db: Banco;
let fechar: () => Promise<void>;
const TIPOS_PADRAO = readFileSync("drizzle/0002_tipos-padrao.sql", "utf8");

beforeAll(async () => {
  ({ db, fechar } = await criarBancoDeTeste());
});

afterAll(async () => {
  await fechar();
});

let estoque = 0;
let financeiro = 0;
let rh = 0;

beforeEach(async () => {
  await db.execute(sql`truncate table historico_de_itens, movimentos_de_material, materiais, itens, colaboradores, locais, tipos_de_item restart identity`);
  await db.execute(sql.raw(TIPOS_PADRAO));
  const u = await criarLocal(db, { nome: "Aparecida do Taboado", paiId: null });
  const unidade = u.criado ? u.local.id : 0;
  const id = async (nome: string) => {
    const r = await criarLocal(db, { nome, paiId: unidade });
    return r.criado ? r.local.id : 0;
  };
  estoque = await id("Estoque da TI");
  financeiro = await id("Financeiro");
  rh = await id("RH");
});

const DADOS: DadosDoItem = {
  tipoId: 0, marca: "Dell", modelo: "Latitude", numeroSerie: null, usuarioId: null, localId: null, status: "em_estoque",
  condicao: null, hostname: null, processador: null, memoriaRam: null, armazenamento: null, sistemaOperacional: null,
  dataCompra: null, garantiaAte: null, observacoes: null,
};

async function novo(prefixo: string, dados: Partial<DadosDoItem> = {}) {
  const [tipo] = await db.select({ id: tiposDeItem.id }).from(tiposDeItem).where(eq(tiposDeItem.prefixo, prefixo));
  const r = await criarItem(db, { ...DADOS, tipoId: tipo.id, ...dados });
  if (!r.criado) throw new Error(JSON.stringify(r.erros));
  return (await obterItemPorCodigo(db, r.codigo))!;
}

async function pessoa(nome: string, localId: number | null = null) {
  const r = await criarColaborador(db, nome, localId);
  if (!r.criado) throw new Error(r.erro);
  return r.colaborador.id;
}

const eventos = async (itemId: number) => (await historicoDoItem(db, itemId)).map((r) => [r.evento, textoDoRegistro(r)]).reverse();

describe("a regra que compara antes e depois", () => {
  const e = (parcial: Partial<EstadoDoItem>): EstadoDoItem => ({
    id: 1, codigo: "NTB0001", descricao: "Notebook Dell", usuarioId: null, usuario: null, localId: null, local: null, ...parcial,
  });
  const ana = { usuarioId: 1, usuario: "Ana", localId: 10, local: "Financeiro" };
  const joao = { usuarioId: 2, usuario: "João", localId: 11, local: "RH" };

  it("entrega, troca e devolução pela pessoa; mudança de local sem pessoa; mudou com a pessoa", () => {
    expect(eventoDaMudanca(e({}), e(ana))).toMatchObject({ evento: "entrega", paraPessoa: "Ana", paraLocal: "Financeiro" });
    expect(eventoDaMudanca(e(ana), e(joao))).toMatchObject({ evento: "troca", dePessoa: "Ana", paraPessoa: "João" });
    expect(eventoDaMudanca(e(ana), e({ localId: 5, local: "Estoque" }))).toMatchObject({ evento: "devolucao", dePessoa: "Ana", paraLocal: "Estoque" });
    expect(eventoDaMudanca(e({ localId: 5, local: "Estoque" }), e({ localId: 6, local: "Sala" }))).toMatchObject({ evento: "mudanca_de_local" });
    expect(eventoDaMudanca(e(ana), e({ ...ana, localId: 11, local: "RH" }))).toMatchObject({ evento: "mudou_com_a_pessoa", paraPessoa: "Ana", deLocal: "Financeiro", paraLocal: "RH" });
    expect(eventoDaMudanca(e(ana), e(ana))).toBeNull();
  });

  it("as frases do histórico", () => {
    const r = { dePessoa: "Ana", paraPessoa: "João", deLocal: "Estoque", paraLocal: "Sala" };
    expect(textoDoRegistro({ ...r, evento: "entrega" })).toBe("Entregue a João");
    expect(textoDoRegistro({ ...r, evento: "troca" })).toBe("Passou de Ana para João");
    expect(textoDoRegistro({ ...r, evento: "devolucao" })).toBe("Devolvido por Ana → Sala");
    expect(textoDoRegistro({ ...r, paraLocal: null, evento: "devolucao" })).toBe("Devolvido por Ana");
    expect(textoDoRegistro({ ...r, deLocal: null, evento: "mudanca_de_local" })).toBe("Sem local definido → Sala");
    expect(textoDoRegistro({ ...r, evento: "mudou_com_a_pessoa" })).toBe("Mudou com João: Estoque → Sala");
    expect(textoDoRegistro({ ...r, paraPessoa: null, evento: "cadastro" })).toBe("Cadastrado em Sala");
    expect(textoDoRegistro({ ...r, evento: "exclusao" })).toBe("Excluído do inventário");
  });
});

describe("tudo vai para o histórico sozinho", () => {
  it("cadastro e as mudanças pelo formulário (pessoa e local)", async () => {
    const ana = await pessoa("Ana Teste", financeiro);
    const joao = await pessoa("João Teste", rh);
    const item = await novo("NTB", { localId: estoque });
    const editar = (dados: Partial<DadosDoItem>) => editarItem(db, item.id, { ...DADOS, tipoId: item.tipoId, ...dados });

    await editar({ usuarioId: ana, status: "em_uso" });
    await editar({ usuarioId: joao, status: "em_uso" });
    await editar({ usuarioId: null, localId: estoque });
    await editar({ localId: financeiro });
    // Mudar só o status ou a marca não é movimento.
    await editar({ localId: financeiro, status: "em_manutencao", marca: "HP" });

    expect(await eventos(item.id)).toEqual([
      ["cadastro", "Cadastrado em Aparecida do Taboado › Estoque da TI"],
      ["entrega", "Entregue a Ana Teste"],
      ["troca", "Passou de Ana Teste para João Teste"],
      ["devolucao", "Devolvido por João Teste → Aparecida do Taboado › Estoque da TI"],
      ["mudanca_de_local", "Aparecida do Taboado › Estoque da TI → Aparecida do Taboado › Financeiro"],
    ]);
  });

  it("vincular e devolver pela página da pessoa; a pessoa mudar de setor leva os itens", async () => {
    const ana = await pessoa("Ana Teste", financeiro);
    const a = await novo("MON");
    const b = await novo("MOU");
    await vincularItens(db, ana, [a.id, b.id]);
    await editarColaborador(db, ana, "Ana Teste", rh);
    await devolverItem(db, ana, b.id);
    expect(await eventos(a.id)).toEqual([
      ["cadastro", "Cadastrado em Sem local definido"],
      ["entrega", "Entregue a Ana Teste"],
      ["mudou_com_a_pessoa", "Mudou com Ana Teste: Aparecida do Taboado › Financeiro → Aparecida do Taboado › RH"],
    ]);
    expect((await eventos(b.id)).at(-1)).toEqual(["devolucao", "Devolvido por Ana Teste"]);
    // Só renomear a pessoa não mexe no histórico.
    await editarColaborador(db, ana, "Ana Paula Teste", rh);
    expect(await eventos(a.id)).toHaveLength(3);
  });

  it("trazer itens e trazer pessoas pela página do local", async () => {
    const ana = await pessoa("Ana Teste", financeiro);
    const comAna = await novo("DSK", { usuarioId: ana, status: "em_uso" });
    const solto = await novo("TEC", { localId: estoque });
    await trazerItens(db, financeiro, [solto.id]);
    await trazerPessoas(db, rh, [ana]);
    expect((await eventos(solto.id)).at(-1)?.[0]).toBe("mudanca_de_local");
    expect((await eventos(comAna.id)).map((e) => e[0])).toEqual(["cadastro", "mudou_com_a_pessoa"]);
    expect((await historicoDoItem(db, comAna.id))[0]).toMatchObject({ deLocal: "Aparecida do Taboado › Financeiro", paraLocal: "Aparecida do Taboado › RH" });
  });

  it("as ações rápidas do painel, com observação", async () => {
    const ana = await pessoa("Ana Teste", financeiro);
    const item = await novo("NTB", { localId: estoque });
    expect(await entregarItem(db, item.id, ana, "Notebook novo")).toMatchObject({ ok: true, pessoa: "Ana Teste" });
    expect((await obterItemPorCodigo(db, item.codigo))!.status).toBe("em_uso");
    expect(await entregarItem(db, item.id, ana, null)).toEqual({ ok: false, erros: { pessoaId: "O item já está com Ana Teste." } });
    expect(await mudarLocalDoItem(db, item.id, rh, null)).toMatchObject({ ok: false, erro: "O item está com Ana Teste: ele fica onde a pessoa está." });
    expect(await devolverItemPara(db, item.id, estoque, "Saiu da empresa")).toMatchObject({ ok: true, local: "Aparecida do Taboado › Estoque da TI" });
    expect((await obterItemPorCodigo(db, item.codigo))!.status).toBe("em_estoque");
    expect(await devolverItemPara(db, item.id, null, null)).toMatchObject({ ok: false, erro: "Este item já não estava com ninguém." });
    expect(await mudarLocalDoItem(db, item.id, estoque, null)).toEqual({ ok: false, erros: { localId: "O item já está neste local." } });
    expect(await mudarLocalDoItem(db, item.id, rh, "Para a reunião")).toMatchObject({ ok: true });
    const registros = await historicoDoItem(db, item.id);
    expect(registros.map((r) => [r.evento, r.observacao])).toEqual([
      ["mudanca_de_local", "Para a reunião"],
      ["devolucao", "Saiu da empresa"],
      ["entrega", "Notebook novo"],
      ["cadastro", null],
    ]);
  });

  it("excluir o item não apaga o histórico: ganha o registro Excluído", async () => {
    const item = await novo("WEB", { localId: estoque });
    await excluirItem(db, item.id);
    const lista = await listarHistorico(db, lerFiltrosDoHistorico({ item: item.codigo }));
    expect(lista.registros.map((r) => [r.evento, r.itemId, r.codigo, r.descricao])).toEqual([
      ["exclusao", null, "WEB0001", "Webcam Dell Latitude"],
      ["cadastro", null, "WEB0001", "Webcam Dell Latitude"],
    ]);
  });

  it("a tela Histórico: busca por pessoa ou local, filtro por evento, e a atividade recente", async () => {
    const ana = await pessoa("Ana Teste", financeiro);
    const a = await novo("MON", { localId: estoque });
    await novo("MOU", { localId: estoque });
    await entregarItem(db, a.id, ana, null);
    expect((await listarHistorico(db, lerFiltrosDoHistorico({ q: "ana" }))).registros.map((r) => r.evento)).toEqual(["entrega"]);
    expect((await listarHistorico(db, lerFiltrosDoHistorico({ evento: "cadastro" }))).total).toBe(2);
    expect((await listarHistorico(db, lerFiltrosDoHistorico({ q: "estoque da ti" }))).total).toBe(3);
    expect((await atividadeRecente(db, 2)).map((r) => r.evento)).toEqual(["entrega", "cadastro"]);
    expect(lerFiltrosDoHistorico({ evento: "inventado", item: "x", pagina: "-1" })).toEqual({ busca: undefined, evento: undefined, item: undefined, pagina: 1 });
  });
});
