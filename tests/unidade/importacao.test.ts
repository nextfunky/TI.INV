import { readFileSync } from "node:fs";

import { eq, sql } from "drizzle-orm";
import readXlsxFile from "read-excel-file/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { criarColaborador } from "@/lib/colaboradores/servico";
import { tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import {
  COLUNAS_DOS_ITENS,
  COLUNAS_DOS_MATERIAIS,
  lerPlanilha,
  partesDoLocal,
  type AbaLida,
  type Celula,
} from "@/lib/importacao/planilha";
import { historicoDoItem } from "@/lib/historico/servico";
import { importarPlanilha, previaDaImportacao } from "@/lib/importacao/servico";
import { listarItens } from "@/lib/itens/consultas";
import { criarItem, obterItemPorCodigo } from "@/lib/itens/servico";
import { criarLocal, listarLocais } from "@/lib/locais/servico";
import { listarMateriais, movimentosDoMaterial } from "@/lib/materiais/servico";

import { criarBancoDeTeste } from "./banco-de-teste";

let db: Banco;
let fechar: () => Promise<void>;
const TIPOS_PADRAO = readFileSync("drizzle/0002_tipos-padrao.sql", "utf8");
const TIPOS_NOVOS = readFileSync("drizzle/0007_importacao.sql", "utf8").split("--> statement-breakpoint").at(-1)!;

beforeAll(async () => {
  ({ db, fechar } = await criarBancoDeTeste());
});

afterAll(async () => {
  await fechar();
});

beforeEach(async () => {
  await db.execute(
    sql`truncate table historico_de_itens, importacoes, movimentos_de_material, materiais, itens, colaboradores, locais, tipos_de_item restart identity`,
  );
  await db.execute(sql.raw(TIPOS_PADRAO));
  await db.execute(sql.raw(TIPOS_NOVOS));
});

/** Monta uma aba a partir de objetos { coluna: valor }, com o cabeçalho na primeira linha. */
function aba(nome: string, colunas: readonly string[], linhas: Array<Record<string, Celula>>): AbaLida {
  return { nome, linhas: [[...colunas], ...linhas.map((l) => colunas.map((c) => l[c] ?? null))] };
}
const itens = (...linhas: Array<Record<string, Celula>>) => aba("Itens", COLUNAS_DOS_ITENS, linhas);
const materiais = (...linhas: Array<Record<string, Celula>>) => aba("Materiais", COLUNAS_DOS_MATERIAIS, linhas);

describe("o modelo de importação", () => {
  it("tem as abas e as colunas que o sistema lê", async () => {
    const abas = await readXlsxFile(readFileSync("public/modelo-de-importacao.xlsx"));
    expect(abas.map((a) => a.sheet)).toEqual(["Itens", "Materiais", "Instruções"]);
    expect(abas[0].data[0]).toEqual([...COLUNAS_DOS_ITENS]);
    expect(abas[1].data[0]).toEqual([...COLUNAS_DOS_MATERIAIS]);
    expect(lerPlanilha(abas.map((a) => ({ nome: a.sheet, linhas: a.data as Celula[][] }))).erros).toEqual([
      { aba: "Arquivo", mensagem: "A planilha não tem nenhuma linha preenchida." },
    ]);
  });
});

describe("leitura da planilha (sem banco)", () => {
  it("lê itens e materiais, aceitando nomes sem acento e em outra caixa", () => {
    const lida = lerPlanilha([
      itens(
        { Tipo: "Desktop", Marca: "Dell", Status: "em manutencao", Condição: "BOM", Local: "Filial 04 > Financeiro", "Data de compra": "15/03/2025" },
        { Tipo: "Monitor", Usuário: "  Ana   Paula " },
      ),
      materiais({ Nome: "Cabo HDMI", Grupo: "cabos", Quantidade: 7, Local: "Filial 04" }),
    ]);
    expect(lida.erros).toEqual([]);
    expect(lida.itens[0]).toMatchObject({
      linha: 2,
      tipo: "Desktop",
      local: "Filial 04 > Financeiro",
      dados: { marca: "Dell", status: "em_manutencao", condicao: "bom", dataCompra: "2025-03-15" },
    });
    // Com usuário e sem status, o item já entra "Em uso" (como no formulário).
    expect(lida.itens[1]).toMatchObject({ usuario: "Ana Paula", dados: { status: "em_uso", condicao: null } });
    expect(lida.materiais[0]).toMatchObject({ linha: 2, dados: { nome: "Cabo HDMI", grupo: "cabos", quantidade: 7 } });
  });

  it("aceita datas do Excel e pula linhas vazias", () => {
    const lida = lerPlanilha([
      { nome: "itens", linhas: [[...COLUNAS_DOS_ITENS], [], COLUNAS_DOS_ITENS.map((c) => (c === "Tipo" ? "Mouse" : c === "Garantia até" ? new Date(Date.UTC(2027, 0, 31)) : null))] },
    ]);
    expect(lida.erros).toEqual([]);
    expect(lida.itens).toMatchObject([{ linha: 3, dados: { garantiaAte: "2027-01-31" } }]);
  });

  it("explica cada problema com a aba e a linha", () => {
    const lida = lerPlanilha([
      itens(
        { Marca: "Dell" },
        { Tipo: "Mouse", Status: "Estocado", Condição: "Ótimo" },
        { Tipo: "Mouse", Local: "A › B › C", "Data de compra": "31/02/2025" },
        { Tipo: "Mouse", Usuário: "Ana", Local: "Filial 04" },
        { Tipo: "Mouse", Marca: "x".repeat(61) },
      ),
      materiais(
        { Nome: "Cabo", Grupo: "Cabinhos", Quantidade: 2 },
        { Nome: "", Grupo: "Cabos", Quantidade: "1,5" },
        { Nome: "Toner", Grupo: "Impressão", Quantidade: 2.5 },
      ),
    ]);
    expect(lida.itens).toEqual([]);
    expect(lida.materiais).toEqual([]);
    expect(lida.erros.map((e) => `${e.aba} ${e.linha}: ${e.mensagem}`)).toEqual([
      "Itens 2: Informe o tipo.",
      "Itens 3: Status “Estocado” não existe. Use Em uso, Em estoque, Em manutenção ou Descartado.",
      "Itens 3: Condição “Ótimo” não existe. Use Novo, Bom, Usado, Regular ou Defeituoso, ou deixe em branco.",
      "Itens 4: Local: use “Unidade” ou “Unidade › Departamento”.",
      "Itens 4: Data de compra: data inválida. Use dd/mm/aaaa.",
      "Itens 5: Com o Usuário preenchido, deixe o Local em branco: o item fica onde a pessoa está.",
      "Itens 6: Marca: Use no máximo 60 caracteres.",
      "Materiais 2: Grupo “Cabinhos” não existe. Os grupos estão na aba Instruções.",
      "Materiais 3: Nome: Informe o nome do material.",
      "Materiais 3: Quantidade: Use só números inteiros, sem vírgula.",
      "Materiais 4: Quantidade: Use só números inteiros, sem vírgula.",
    ]);
  });

  it("avisa quando faltam as abas ou as colunas obrigatórias", () => {
    expect(lerPlanilha([{ nome: "Planilha1", linhas: [["a"]] }]).erros[0].mensagem).toMatch(/Não encontramos as abas/);
    expect(lerPlanilha([{ nome: "Materiais", linhas: [["Nome", "Quantidade"], ["Cabo", 1]] }]).erros).toEqual([
      { aba: "Materiais", linha: 1, mensagem: "Falta a coluna “Grupo” no cabeçalho. Use o modelo de importação." },
    ]);
  });

  it("entende o local em um ou dois níveis", () => {
    expect(partesDoLocal("")).toEqual([]);
    expect(partesDoLocal("Filial 04")).toEqual(["Filial 04"]);
    expect(partesDoLocal(" Filial  04 ›  Estoque da TI ")).toEqual(["Filial 04", "Estoque da TI"]);
    expect(partesDoLocal("Filial 04 > RH")).toEqual(["Filial 04", "RH"]);
    expect(partesDoLocal("A › B › C")).toBeNull();
    expect(partesDoLocal("A ›")).toBeNull();
  });
});

describe("prévia e importação (com o banco)", () => {
  const planilha = () =>
    lerPlanilha([
      itens(
        { Tipo: "Telefone", Marca: "Cisco", Modelo: "CP-7821", Local: "Filial 04", Condição: "Novo" },
        { Tipo: "telefone", Marca: "Cisco", Modelo: "CP-7821", Local: "Filial 04", "Nº de série": "FCH123" },
        { Tipo: "Desktop", Marca: "Dell", Hostname: "FIN-PC-01", Usuário: "Carla Dias" },
        { Tipo: "Monitor", Hostname: "ignorado", Local: "FILIAL 04 › Estoque da TI" },
      ),
      materiais(
        { Nome: "Patch Cord", "Marca / modelo": "Cat 5e Azul 1,5 m", Grupo: "Rede e rack", Quantidade: 64, Local: "Filial 04" },
        { Nome: "Suporte", Grupo: "Periféricos", Quantidade: 0 },
      ),
    ]);

  it("a prévia mostra o que vai entrar e não grava nada", async () => {
    await criarLocal(db, { nome: "Filial 04", paiId: null });
    const previa = await previaDaImportacao(db, planilha(), "abc");
    expect(previa.erros).toEqual([]);
    expect(previa.resumo).toEqual({
      itens: 4,
      porTipo: [
        { nome: "Telefone", quantidade: 2 },
        { nome: "Desktop", quantidade: 1 },
        { nome: "Monitor", quantidade: 1 },
      ],
      materiais: 2,
      unidades: 64,
      locaisNovos: ["FILIAL 04 › Estoque da TI"],
      pessoasNovas: ["Carla Dias"],
    });
    expect((await listarItens(db, { pagina: 1 })).total).toBe(0);
  });

  it("grava tudo: locais, pessoas, códigos em ordem e a entrada dos materiais", async () => {
    await criarLocal(db, { nome: "Filial 04", paiId: null });
    // Já existe um telefone: os da planilha continuam a numeração.
    const [tel] = await db.select({ id: tiposDeItem.id }).from(tiposDeItem).where(eq(tiposDeItem.prefixo, "TEL"));
    await criarItem(db, {
      tipoId: tel.id, marca: null, modelo: null, numeroSerie: null, usuarioId: null, localId: null, status: "em_estoque",
      condicao: null, hostname: null, processador: null, memoriaRam: null, armazenamento: null, sistemaOperacional: null,
      dataCompra: null, garantiaAte: null, observacoes: null,
    });

    const r = await importarPlanilha(db, planilha(), { hash: "abc", nome: "inventario.xlsx" });
    expect(r).toEqual({ ok: true, itens: 4, materiais: 2 });

    expect(await obterItemPorCodigo(db, "TEL0002")).toMatchObject({ marca: "Cisco", condicao: "novo", local: { caminho: "Filial 04" } });
    expect(await obterItemPorCodigo(db, "TEL0003")).toMatchObject({ numeroSerie: "FCH123" });
    // Cada item importado começa o histórico com o cadastro.
    const importado = (await obterItemPorCodigo(db, "TEL0003"))!;
    expect(await historicoDoItem(db, importado.id)).toMatchObject([{ evento: "cadastro", paraLocal: "Filial 04", observacao: "Importado de inventario.xlsx" }]);
    expect(await obterItemPorCodigo(db, "DSK0001")).toMatchObject({ hostname: "FIN-PC-01", status: "em_uso", usuario: { nome: "Carla Dias" } });
    // Campos de computador não valem para monitor; o departamento novo fica dentro da unidade que já existia.
    expect(await obterItemPorCodigo(db, "MON0001")).toMatchObject({ hostname: null, local: { caminho: "Filial 04 › Estoque da TI" } });
    expect((await listarLocais(db)).map((l) => l.caminho)).toEqual(["Filial 04", "Filial 04 › Estoque da TI"]);

    const lista = await listarMateriais(db);
    // Em ordem de grupo: Rede e rack vem antes de Periféricos.
    expect(lista.map((m) => [m.nome, m.quantidade, m.caminho])).toEqual([
      ["Patch Cord", 64, "Filial 04"],
      ["Suporte", 0, null],
    ]);
    const patch = lista.find((m) => m.nome === "Patch Cord")!;
    expect(await movimentosDoMaterial(db, patch.id)).toMatchObject([{ tipo: "entrada", quantidade: 64, observacao: "Importado da planilha" }]);
  });

  it("o mesmo arquivo não entra duas vezes", async () => {
    expect((await importarPlanilha(db, planilha(), { hash: "abc", nome: "a.xlsx" })).ok).toBe(true);
    const segunda = await importarPlanilha(db, planilha(), { hash: "abc", nome: "a.xlsx" });
    expect(segunda).toMatchObject({ ok: false, erros: [{ aba: "Arquivo", mensagem: expect.stringMatching(/^Este arquivo já foi importado em /) }] });
    expect((await previaDaImportacao(db, planilha(), "abc")).erros[0].mensagem).toMatch(/já foi importado/);
    expect((await listarItens(db, { pagina: 1 })).total).toBe(4);
  });

  it("tipo que não existe e nº de série repetido impedem tudo; material igual só avisa", async () => {
    await criarColaborador(db, "Carla Dias");
    const [dsk] = await db.select({ id: tiposDeItem.id }).from(tiposDeItem).where(eq(tiposDeItem.prefixo, "DSK"));
    await criarItem(db, {
      tipoId: dsk.id, marca: null, modelo: null, numeroSerie: "ABC-1", usuarioId: null, localId: null, status: "em_estoque",
      condicao: null, hostname: null, processador: null, memoriaRam: null, armazenamento: null, sistemaOperacional: null,
      dataCompra: null, garantiaAte: null, observacoes: null,
    });
    await importarPlanilha(db, lerPlanilha([materiais({ Nome: "Toner", Grupo: "Impressão", Quantidade: 1 })]), { hash: "x", nome: "x.xlsx" });

    const lida = lerPlanilha([
      itens(
        { Tipo: "Telefonee" },
        { Tipo: "Mouse", "Nº de série": "abc-1" },
        { Tipo: "Mouse", "Nº de série": "Z9" },
        { Tipo: "Mouse", "Nº de série": "z9" },
        { Tipo: "Mouse", Usuário: "carla dias" },
      ),
      materiais({ Nome: "toner", Grupo: "Impressão", Quantidade: 1 }),
    ]);
    const previa = await previaDaImportacao(db, lida, "y");
    expect(previa.erros.map((e) => `${e.linha}: ${e.mensagem}`)).toEqual([
      "2: Tipo “Telefonee” não existe. Use um dos tipos da aba Instruções, ou cadastre o tipo antes em Tipos de item.",
      "3: Nº de série “abc-1” já está no item DSK0001.",
      "5: Nº de série “z9” repete o da linha 4.",
    ]);
    expect(previa.avisos.map((a) => a.mensagem)).toEqual(["Já existe “toner” sem local. Vai virar um segundo cadastro."]);
    // A pessoa já existe (mesmo nome, outra caixa): não é nova.
    expect(previa.resumo.pessoasNovas).toEqual([]);

    expect(await importarPlanilha(db, lida, { hash: "y", nome: "y.xlsx" })).toMatchObject({ ok: false });
    expect((await listarItens(db, { pagina: 1 })).total).toBe(1);
  });
});
