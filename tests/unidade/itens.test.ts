import { readFileSync } from "node:fs";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { itens, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { buscarItens, listarItens, resumoDoInventario, totaisDoInventario } from "@/lib/itens/consultas";
import { painelDoInicio } from "@/lib/itens/inicio";
import { regrasDoItem, regrasDoPrefixo, type DadosDoItem } from "@/lib/itens/regras";
import { criarItem, editarItem, excluirItem, montarCodigo, obterItemPorCodigo } from "@/lib/itens/servico";
import { criarTipo, editarTipo, excluirTipo, listarTiposComContagem, podeMudarCategoria } from "@/lib/itens/tipos";

import { criarBancoDeTeste } from "./banco-de-teste";

let db: Banco;
let fechar: () => Promise<void>;
let tipo: Record<string, number>;

// O mesmo cadastro inicial que vai para o banco de verdade.
const TIPOS_PADRAO = readFileSync("drizzle/0002_tipos-padrao.sql", "utf8");

beforeAll(async () => {
  ({ db, fechar } = await criarBancoDeTeste());
});

afterAll(async () => {
  await fechar();
});

// Cada teste começa com os 10 tipos padrão e nenhum item.
beforeEach(async () => {
  await db.execute(sql`delete from itens`);
  await db.execute(sql`delete from tipos_de_item`);
  await db.execute(sql.raw(TIPOS_PADRAO));
  const tipos = await db.select().from(tiposDeItem);
  tipo = Object.fromEntries(tipos.map((t) => [t.prefixo, t.id]));
});

function dados(parcial: Partial<DadosDoItem> & { tipoId: number }): DadosDoItem {
  return {
    marca: null,
    modelo: null,
    numeroSerie: null,
    usuarioId: null,
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

async function novo(prefixo: string, parcial: Partial<DadosDoItem> = {}) {
  const r = await criarItem(db, dados({ tipoId: tipo[prefixo], ...parcial }));
  if (!r.criado) throw new Error("não criou");
  return r.codigo;
}

async function idDe(codigo: string) {
  return (await obterItemPorCodigo(db, codigo))!.id;
}

describe("os 10 tipos padrão", () => {
  it("já vêm cadastrados, com categoria e prefixo", async () => {
    const tipos = await listarTiposComContagem(db);
    expect(tipos.map((t) => `${t.prefixo}:${t.categoria}`)).toEqual([
      "DSK:computador",
      "NTB:computador",
      "DCK:periferico",
      "HST:periferico",
      "MON:periferico",
      "MOU:periferico",
      "TEC:periferico",
      "WEB:periferico",
      "IMP:outro",
      "NBK:outro",
    ]);
  });
});

describe("código automático", () => {
  it("o primeiro de cada tipo é 0001, e os seguintes vêm em sequência", async () => {
    expect(await novo("DSK")).toBe("DSK0001");
    expect(await novo("DSK")).toBe("DSK0002");
    expect(await novo("MON")).toBe("MON0001");
    expect(await novo("DSK")).toBe("DSK0003");
  });

  it("um código excluído nunca é reaproveitado", async () => {
    await novo("MON");
    await novo("MON");
    const terceiro = await novo("MON");
    await excluirItem(db, await idDe(terceiro));
    expect(await novo("MON")).toBe("MON0004");
  });

  it("dois cadastros ao mesmo tempo recebem códigos diferentes", async () => {
    const codigos = await Promise.all(Array.from({ length: 5 }, () => novo("TEC")));
    expect(new Set(codigos).size).toBe(5);
  });

  it("acima de 9999 o número só continua crescendo", () => {
    expect(montarCodigo("DSK", 7)).toBe("DSK0007");
    expect(montarCodigo("DSK", 10000)).toBe("DSK10000");
  });

  it("mudar o tipo dá ao item o próximo código do tipo novo", async () => {
    await novo("MON");
    await novo("MON");
    await novo("NTB");
    const notebook = await novo("NTB");
    const r = await editarItem(db, await idDe(notebook), dados({ tipoId: tipo.MON }));
    expect(r).toEqual({ salvo: true, codigoAntigo: "NTB0002", codigo: "MON0003" });
    expect(await novo("NTB")).toBe("NTB0003");
  });

  it("salvar sem mudar o tipo mantém o código", async () => {
    const codigo = await novo("DSK");
    const r = await editarItem(db, await idDe(codigo), dados({ tipoId: tipo.DSK, marca: "Dell" }));
    expect(r).toMatchObject({ salvo: true, codigo: "DSK0001" });
  });
});

describe("campos de computador", () => {
  const hardware = {
    hostname: "FIN-PC-03",
    processador: "Intel Core i5",
    memoriaRam: "16 GB",
    armazenamento: "SSD 512 GB",
    sistemaOperacional: "Windows 11 Pro",
  };

  it("ficam guardados nos computadores", async () => {
    const codigo = await novo("DSK", hardware);
    expect(await obterItemPorCodigo(db, codigo)).toMatchObject(hardware);
  });

  it("ficam vazios nos outros tipos", async () => {
    const codigo = await novo("MON", hardware);
    const item = await obterItemPorCodigo(db, codigo);
    expect(item).toMatchObject({ hostname: null, processador: null, memoriaRam: null, armazenamento: null, sistemaOperacional: null });
  });

  it("são apagados quando um desktop vira monitor", async () => {
    const codigo = await novo("DSK", hardware);
    const r = await editarItem(db, await idDe(codigo), dados({ tipoId: tipo.MON, ...hardware }));
    if (!r.salvo) throw new Error();
    expect(await obterItemPorCodigo(db, r.codigo)).toMatchObject({ hostname: null, processador: null });
  });
});

describe("formulário de item", () => {
  const vazio = {
    tipoId: "", marca: "", modelo: "", numeroSerie: "", usuarioId: "", status: "em_estoque", condicao: "", hostname: "", processador: "",
    memoriaRam: "", armazenamento: "", sistemaOperacional: "", dataCompra: "", garantiaAte: "", observacoes: "",
  };

  it("pede o tipo", () => {
    const r = regrasDoItem.safeParse(vazio);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["tipoId"], message: "Escolha o tipo." });
  });

  it("guarda campos vazios como 'não informado' e tira os espaços", () => {
    const r = regrasDoItem.safeParse({ ...vazio, tipoId: "3", marca: "  Dell  " });
    expect(r.success && r.data).toMatchObject({ tipoId: 3, marca: "Dell", modelo: null, dataCompra: null });
  });

  it("recusa datas que não existem e textos longos demais", () => {
    const r = regrasDoItem.safeParse({ ...vazio, tipoId: "1", dataCompra: "2026-02-30", hostname: "x".repeat(64) });
    const mensagens = Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path[0], i.message]));
    expect(mensagens).toEqual({ dataCompra: "Data inválida.", hostname: "Use no máximo 63 caracteres." });
  });
});

describe("tipos de item", () => {
  it("o prefixo vira maiúsculo, sem espaços, e precisa ter de 2 a 5 letras sem acento", () => {
    expect(regrasDoPrefixo.parse(" t a b ")).toBe("TAB");
    for (const ruim of ["T", "TABLET", "TÁB", "T4B", ""]) {
      expect(regrasDoPrefixo.safeParse(ruim).error?.issues[0].message).toBe("Use de 2 a 5 letras, sem acento.");
    }
  });

  it("cria um tipo novo com o seu próprio contador", async () => {
    const r = await criarTipo(db, { nome: "Tablet", categoria: "outro", prefixo: "TAB" });
    if (!r.criado) throw new Error("não criou o tipo");
    tipo.TAB = r.tipo.id;
    expect(await novo("TAB")).toBe("TAB0001");
    expect(await novo("TAB")).toBe("TAB0002");
  });

  it("não repete nome (sem diferença de maiúsculas) nem prefixo", async () => {
    expect(await criarTipo(db, { nome: "MONITOR", categoria: "outro", prefixo: "MON" })).toEqual({
      criado: false,
      erros: { nome: "Já existe um tipo com este nome.", prefixo: "Já existe um tipo com este prefixo." },
    });
  });

  it("o banco também recusa um prefixo fora do formato", async () => {
    await expect(db.insert(tiposDeItem).values({ nome: "X", prefixo: "x1" })).rejects.toThrow();
  });

  it("a categoria muda quando nada se perde", () => {
    expect(podeMudarCategoria("periferico", "outro", true)).toBe(true);
    expect(podeMudarCategoria("outro", "computador", true)).toBe(true);
    expect(podeMudarCategoria("computador", "periferico", false)).toBe(true);
    expect(podeMudarCategoria("computador", "periferico", true)).toBe(false);
  });

  it("um tipo de computador com itens não deixa de ser Computador", async () => {
    await novo("NTB");
    expect(await editarTipo(db, tipo.NTB, { nome: "Notebook", categoria: "periferico" })).toMatchObject({
      salvo: false,
      erros: { categoria: expect.stringContaining("só deixa de ser Computador sem itens") },
    });
    expect(await editarTipo(db, tipo.MON, { nome: "Monitores", categoria: "outro" })).toEqual({ salvo: true });
  });

  it("só exclui tipos sem nenhum item, contando os descartados", async () => {
    await novo("WEB", { status: "descartado" });
    expect(await excluirTipo(db, tipo.WEB)).toEqual({ excluido: false, motivo: "tem_itens" });
    expect(await excluirTipo(db, tipo.DCK)).toEqual({ excluido: true, nome: "Dock" });
  });

  it("conta os itens de cada tipo, separando os descartados", async () => {
    await novo("MOU");
    await novo("MOU", { status: "descartado" });
    const mouse = (await listarTiposComContagem(db)).find((t) => t.prefixo === "MOU");
    expect(mouse).toMatchObject({ itensAtivos: 1, itensDescartados: 1 });
  });
});

describe("Inventário", () => {
  beforeEach(async () => {
    await novo("DSK", { status: "em_uso" });
    await novo("NTB", { status: "em_manutencao" });
    await novo("MON", { status: "em_uso" });
    await novo("MON");
    await novo("TEC", { status: "descartado" });
    await novo("IMP");
  });

  const codigos = async (filtros: Parameters<typeof listarItens>[1]) =>
    (await listarItens(db, filtros)).itens.map((i) => i.codigo);

  it("sem filtros mostra tudo menos os descartados, em ordem de código", async () => {
    expect(await codigos({ pagina: 1 })).toEqual(["DSK0001", "IMP0001", "MON0001", "MON0002", "NTB0001"]);
  });

  it("filtra por categoria e por status, e os filtros se combinam", async () => {
    expect(await codigos({ pagina: 1, categoria: "periferico" })).toEqual(["MON0001", "MON0002"]);
    expect(await codigos({ pagina: 1, status: "em_uso" })).toEqual(["DSK0001", "MON0001"]);
    expect(await codigos({ pagina: 1, categoria: "periferico", status: "em_uso" })).toEqual(["MON0001"]);
  });

  it("os descartados só aparecem no filtro Descartado", async () => {
    expect(await codigos({ pagina: 1, status: "descartado" })).toEqual(["TEC0001"]);
  });

  it("o resumo nunca conta os descartados e usa singular e plural certos", async () => {
    const totais = await totaisDoInventario(db);
    expect(resumoDoInventario(totais, 5, false)).toBe("5 itens · 2 computadores, 2 periféricos, 1 outro");
    expect(resumoDoInventario(totais, 1, true)).toBe("Mostrando 1 de 5 itens");
    expect(resumoDoInventario({ total: 1, porCategoria: { computador: 1, periferico: 0, outro: 0 } }, 1, false)).toBe(
      "1 item · 1 computador",
    );
  });

  it("pagina de 50 em 50", async () => {
    for (let i = 0; i < 52; i++) await novo("MOU");
    const primeira = await listarItens(db, { pagina: 1 });
    const segunda = await listarItens(db, { pagina: 2 });
    expect(primeira).toMatchObject({ total: 57, paginas: 2, pagina: 1 });
    expect(primeira.itens).toHaveLength(50);
    expect(segunda.itens).toHaveLength(7);
    expect((await listarItens(db, { pagina: 99 })).pagina).toBe(2);
  });
});

describe("busca rápida", () => {
  beforeEach(async () => {
    await novo("DSK", { hostname: "FIN-PC-03", marca: "Dell", modelo: "OptiPlex 7090" });
    await novo("MON", { marca: "Dell", modelo: "P2422H", numeroSerie: "CN0ABC123" });
    await novo("HST", { status: "descartado", marca: "Jabra" });
  });

  const busca = async (termo: string) => (await buscarItens(db, termo)).map((i) => i.codigo).sort();

  it("acha pelo código, hostname, série, marca, modelo e tipo, sem diferença de maiúsculas", async () => {
    expect(await busca("mon")).toEqual(["MON0001"]);
    expect(await busca("fin-pc")).toEqual(["DSK0001"]);
    expect(await busca("cn0abc")).toEqual(["MON0001"]);
    expect(await busca("dell")).toEqual(["DSK0001", "MON0001"]);
    expect(await busca("dell p24")).toEqual(["MON0001"]);
    expect(await busca("optiplex")).toEqual(["DSK0001"]);
    expect(await busca("desktop")).toEqual(["DSK0001"]);
  });

  it("inclui os descartados", async () => {
    expect(await busca("jabra")).toEqual(["HST0001"]);
  });

  it("trata % e _ como texto comum", async () => {
    expect(await busca("%")).toEqual([]);
  });

  it("sem texto mostra os atualizados por último, no máximo 8", async () => {
    for (let i = 0; i < 10; i++) await novo("MOU");
    const recentes = await buscarItens(db, "");
    expect(recentes).toHaveLength(8);
    const ultimo = recentes[0];
    await db.update(itens).set({ atualizadoEm: sql`now() + interval '1 hour'` }).where(eq(itens.codigo, "DSK0001"));
    expect((await buscarItens(db, ""))[0].codigo).toBe("DSK0001");
    expect(ultimo.codigo).toMatch(/^MOU/);
  });
});

describe("Início", () => {
  const HOJE = "2026-11-05";

  it("sem nada, os totais são zero e não há o que avisar", async () => {
    const p = await painelDoInicio(db, HOJE);
    expect(p).toMatchObject({ total: 0, emUso: 0, emEstoque: 0, emManutencao: 0, garantias: [], recentes: [] });
  });

  it("os totais estão certos e os descartados não contam", async () => {
    await novo("DSK", { status: "em_uso" });
    await novo("MON", { status: "em_uso" });
    await novo("TEC");
    await novo("NTB", { status: "em_manutencao" });
    await novo("MOU", { status: "descartado" });
    const p = await painelDoInicio(db, HOJE);
    expect(p).toMatchObject({ total: 4, emUso: 2, emEstoque: 1, emManutencao: 1 });
    expect(p.porCategoria).toEqual({ computador: 2, periferico: 2, outro: 0 });
    expect(p.itensEmManutencao.map((i) => i.codigo)).toEqual(["NTB0001"]);
  });

  it("avisa as garantias que vencem de hoje até 60 dias, da mais próxima para a mais distante", async () => {
    await novo("NTB", { garantiaAte: "2026-12-19" }); // em 44 dias
    await novo("DSK", { garantiaAte: "2026-11-05" }); // hoje
    await novo("MON", { garantiaAte: "2027-01-04" }); // em 60 dias: entra
    await novo("MON", { garantiaAte: "2027-01-05" }); // em 61 dias: não entra
    await novo("TEC", { garantiaAte: "2026-11-04" }); // já venceu: não entra
    await novo("MOU", { garantiaAte: "2026-11-10", status: "descartado" }); // descartado: não entra
    const p = await painelDoInicio(db, HOJE);
    expect(p.garantias.map((i) => i.codigo)).toEqual(["DSK0001", "NTB0001", "MON0001"]);
  });

  it("mostra no máximo 5 garantias e 5 recentes", async () => {
    for (let i = 0; i < 7; i++) await novo("MOU", { garantiaAte: "2026-11-20" });
    const p = await painelDoInicio(db, HOJE);
    expect(p.garantias).toHaveLength(5);
    expect(p.recentes).toHaveLength(5);
  });
});
