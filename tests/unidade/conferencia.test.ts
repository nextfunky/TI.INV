import { readFileSync } from "node:fs";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { criarColaborador } from "@/lib/colaboradores/servico";
import { tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import type { DadosDoItem } from "@/lib/itens/regras";
import { criarItem } from "@/lib/itens/servico";
import { criarLocal } from "@/lib/locais/servico";
import { criarMaterial } from "@/lib/materiais/servico";
import { dadosDaConferencia } from "@/lib/relatorios/conferencia";
import { lerPedidoDeConferencia } from "@/lib/relatorios/pedido";

import { criarBancoDeTeste } from "./banco-de-teste";

let db: Banco;
let fechar: () => Promise<void>;
const MIGRACOES = ["0002_tipos-padrao", "0007_importacao", "0008_categorias-novas"];

beforeAll(async () => {
  ({ db, fechar } = await criarBancoDeTeste());
});

afterAll(async () => {
  await fechar();
});

let filial = 0;
let jales = 0;

beforeEach(async () => {
  await db.execute(sql`truncate table historico_de_itens, movimentos_de_material, materiais, itens, colaboradores, locais, tipos_de_item restart identity`);
  // Os tipos como no sistema de verdade: os 10 de início, os 12 da planilha e as categorias novas.
  await db.execute(sql.raw(readFileSync(`drizzle/${MIGRACOES[0]}.sql`, "utf8")));
  await db.execute(sql.raw(readFileSync(`drizzle/${MIGRACOES[1]}.sql`, "utf8").split("--> statement-breakpoint").at(-1)!));
  for (const parte of readFileSync(`drizzle/${MIGRACOES[2]}.sql`, "utf8").split("--> statement-breakpoint")) {
    if (parte.trim().startsWith("UPDATE") || parte.includes("\nUPDATE")) await db.execute(sql.raw(parte));
  }
  const a = await criarLocal(db, { nome: "Aparecida do Taboado", paiId: null });
  const b = await criarLocal(db, { nome: "Jales", paiId: null });
  filial = a.criado ? a.local.id : 0;
  jales = b.criado ? b.local.id : 0;
});

async function novo(prefixo: string, dados: Partial<DadosDoItem> = {}) {
  const [tipo] = await db.select({ id: tiposDeItem.id }).from(tiposDeItem).where(eq(tiposDeItem.prefixo, prefixo));
  const r = await criarItem(db, {
    tipoId: tipo.id, marca: null, modelo: null, numeroSerie: null, usuarioId: null, localId: filial, status: "em_estoque",
    condicao: null, hostname: null, processador: null, memoriaRam: null, armazenamento: null, sistemaOperacional: null,
    dataCompra: null, garantiaAte: null, observacoes: null, ...dados,
  });
  if (!r.criado) throw new Error(JSON.stringify(r.erros));
  return r.codigo;
}

describe("o pedido do relatório (endereço)", () => {
  it("lê o que conferir, as categorias e os grupos (repetidos ou separados por vírgula)", () => {
    const p = lerPedidoDeConferencia({ itens: "1", materiais: "1", categorias: ["periferico", "inventada"], grupos: "cabos,rede_e_rack", local: "3" });
    expect(p).toMatchObject({
      itens: true,
      materiais: true,
      filtrosDosItens: { categorias: ["periferico"], local: 3 },
      filtrosDosMateriais: { grupos: ["cabos", "rede_e_rack"], local: 3 },
    });
  });

  it("sem dizer o que conferir, vale só os itens; os filtros do Inventário passam junto", () => {
    expect(lerPedidoDeConferencia({ categoria: "periferico", status: "em_estoque", q: "dell" })).toMatchObject({
      itens: true,
      materiais: false,
      filtrosDosItens: { categoria: "periferico", status: "em_estoque", busca: "dell", categorias: [] },
    });
  });
});

describe("os dados da conferência", () => {
  it("itens por tipo (na ordem das categorias), sem descartados, com os filtros em frases", async () => {
    await novo("TEL", { marca: "Cisco" });
    await novo("MOU", { marca: "Dell" });
    await novo("MON", { marca: "LG" });
    await novo("DSK", { marca: "Dell", hostname: "FIN-PC-01" });
    await novo("MOU", { status: "descartado" });

    const tudo = await dadosDaConferencia(db, lerPedidoDeConferencia({}));
    expect(tudo.itens!.total).toBe(4);
    expect(tudo.itens!.porTipo.map((g) => [g.tipo, g.itens.length])).toEqual([
      ["Desktop", 1],
      ["Monitor", 1],
      ["Mouse", 1],
      ["Telefone", 1],
    ]);
    expect(tudo.filtros).toEqual(["Sem os descartados"]);
    expect(tudo.materiais).toBeNull();

    const perifericos = await dadosDaConferencia(db, lerPedidoDeConferencia({ categorias: ["periferico", "telefonia"] }));
    expect(perifericos.itens!.porTipo.map((g) => g.tipo)).toEqual(["Monitor", "Mouse", "Telefone"]);
    expect(perifericos.filtros).toContain("Categorias: Periféricos, Telefonia");
  });

  it("materiais por grupo, com as unidades, filtrando por grupo e local", async () => {
    const base = { marcaModelo: null, condicao: null, observacoes: null } as const;
    await criarMaterial(db, { ...base, nome: "Patch Cord", grupo: "rede_e_rack", localId: filial, quantidade: 64 });
    await criarMaterial(db, { ...base, nome: "Patch Cord", grupo: "rede_e_rack", localId: jales, quantidade: 28 });
    await criarMaterial(db, { ...base, nome: "Cabo HDMI", grupo: "cabos", localId: filial, quantidade: 3 });

    const todos = await dadosDaConferencia(db, lerPedidoDeConferencia({ materiais: "1" }));
    expect(todos.itens).toBeNull();
    expect(todos.materiais).toMatchObject({ total: 3, unidades: 95 });
    expect(todos.materiais!.porGrupo.map((g) => [g.grupo, g.materiais.length])).toEqual([
      ["cabos", 1],
      ["rede_e_rack", 2],
    ]);

    const daFilial = await dadosDaConferencia(db, lerPedidoDeConferencia({ materiais: "1", grupos: "rede_e_rack", local: String(filial) }));
    expect(daFilial.materiais).toMatchObject({ total: 1, unidades: 64 });
    expect(daFilial.filtros).toEqual(["Local: Aparecida do Taboado", "Grupos de material: Rede e rack"]);
  });

  it("descreve tipo, pessoa e busca", async () => {
    const ana = await criarColaborador(db, "Ana Teste");
    const [tipo] = await db.select({ id: tiposDeItem.id }).from(tiposDeItem).where(eq(tiposDeItem.prefixo, "NTB"));
    const r = await dadosDaConferencia(
      db,
      lerPedidoDeConferencia({ tipo: String(tipo.id), pessoa: String(ana.criado ? ana.colaborador.id : 0), q: "avell" }),
    );
    expect(r.filtros).toEqual(["Tipo: Notebook", "Sem os descartados", "Com: Ana Teste", "Busca nos itens: “avell”"]);
  });
});
