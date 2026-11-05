import { eq, isNotNull, sql } from "drizzle-orm";

import { chaveDoNome, criarColaborador } from "@/lib/colaboradores/servico";
import { colaboradores, importacoes, itens, locais, materiais, movimentosDeMaterial, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { aplicarCategoria, montarCodigo } from "@/lib/itens/servico";
import type { Categoria } from "@/lib/itens/valores";
import { criarLocal } from "@/lib/locais/servico";
import { formatarDataHora } from "@/lib/texto/data";

import { caminhoDoLocal, comparavel, partesDoLocal, type ErroDaPlanilha, type PlanilhaLida } from "./planilha";

/**
 * A importação com o banco: confere tipos, locais, pessoas e números de série,
 * mostra a prévia e, ao confirmar, grava tudo numa transação só (ou nada).
 */

export type ResumoDaImportacao = {
  itens: number;
  porTipo: Array<{ nome: string; quantidade: number }>;
  materiais: number;
  unidades: number;
  locaisNovos: string[];
  pessoasNovas: string[];
};

export type Previa = { erros: ErroDaPlanilha[]; avisos: ErroDaPlanilha[]; resumo: ResumoDaImportacao };

type TipoDaImportacao = { id: number; nome: string; categoria: Categoria };

/** Confere a planilha lida contra o que já está no sistema. Não grava nada. */
async function conferir(db: Banco, lida: PlanilhaLida) {
  const erros: ErroDaPlanilha[] = [...lida.erros];
  const avisos: ErroDaPlanilha[] = [];

  // Uma consulta de cada vez: dentro da transação, o banco atende uma por vez.
  const tipos = await db.select({ id: tiposDeItem.id, nome: tiposDeItem.nome, categoria: tiposDeItem.categoria }).from(tiposDeItem);
  const todosOsLocais = await db.select({ id: locais.id, caminho: locais.caminho }).from(locais);
  const pessoas = await db.select({ id: colaboradores.id, chave: colaboradores.chave }).from(colaboradores);
  const series = await db.select({ codigo: itens.codigo, serie: itens.numeroSerie }).from(itens).where(isNotNull(itens.numeroSerie));
  const materiaisExistentes = await db
    .select({ nome: materiais.nome, marcaModelo: materiais.marcaModelo, caminho: locais.caminho })
    .from(materiais)
    .leftJoin(locais, eq(locais.id, materiais.localId));

  const tipoPorNome = new Map<string, TipoDaImportacao>(tipos.map((t) => [comparavel(t.nome), t]));
  const localPorCaminho = new Map(todosOsLocais.map((l) => [comparavel(l.caminho), l.id]));
  const pessoaPorChave = new Map(pessoas.map((p) => [p.chave, p.id]));
  const seriePorTexto = new Map(series.map((s) => [comparavel(s.serie!), s.codigo]));
  const chaveDoMaterial = (nome: string, marcaModelo: string | null, caminho: string | null) =>
    [nome, marcaModelo ?? "", caminho ?? ""].map(comparavel).join("|");
  const materiaisJaCadastrados = new Set(materiaisExistentes.map((m) => chaveDoMaterial(m.nome, m.marcaModelo, m.caminho)));

  // Locais e pessoas que ainda não existem (com a grafia da primeira vez em que aparecem).
  const locaisNovos = new Map<string, string[]>();
  const pessoasNovas = new Map<string, string>();
  function anotarLocal(local: string): string | null {
    const partes = partesDoLocal(local);
    if (!partes?.length) return null;
    const caminho = caminhoDoLocal(partes);
    const k = comparavel(caminho);
    if (!localPorCaminho.has(k) && !locaisNovos.has(k)) {
      // A unidade de um departamento novo também pode ser nova.
      if (partes.length === 2) {
        const ku = comparavel(partes[0]);
        if (!localPorCaminho.has(ku) && !locaisNovos.has(ku)) locaisNovos.set(ku, [partes[0]]);
      }
      locaisNovos.set(k, partes);
    }
    return k;
  }

  const seriesNaPlanilha = new Map<string, number>();
  const porTipo = new Map<string, number>();
  for (const item of lida.itens) {
    const tipo = tipoPorNome.get(comparavel(item.tipo));
    if (!tipo) {
      erros.push({
        aba: "Itens",
        linha: item.linha,
        mensagem: `Tipo “${item.tipo}” não existe. Use um dos tipos da aba Instruções, ou cadastre o tipo antes em Tipos de item.`,
      });
    } else {
      porTipo.set(tipo.nome, (porTipo.get(tipo.nome) ?? 0) + 1);
    }
    if (item.dados.numeroSerie) {
      const k = comparavel(item.dados.numeroSerie);
      if (seriePorTexto.has(k)) {
        erros.push({ aba: "Itens", linha: item.linha, mensagem: `Nº de série “${item.dados.numeroSerie}” já está no item ${seriePorTexto.get(k)}.` });
      } else if (seriesNaPlanilha.has(k)) {
        erros.push({ aba: "Itens", linha: item.linha, mensagem: `Nº de série “${item.dados.numeroSerie}” repete o da linha ${seriesNaPlanilha.get(k)}.` });
      } else {
        seriesNaPlanilha.set(k, item.linha);
      }
    }
    anotarLocal(item.local);
    if (item.usuario) {
      const k = chaveDoNome(item.usuario);
      if (!pessoaPorChave.has(k) && !pessoasNovas.has(k)) pessoasNovas.set(k, item.usuario);
    }
  }

  let unidades = 0;
  for (const material of lida.materiais) {
    unidades += material.dados.quantidade;
    const k = anotarLocal(material.local);
    const caminho = k ? caminhoDoLocal(partesDoLocal(material.local)!) : null;
    if (materiaisJaCadastrados.has(chaveDoMaterial(material.dados.nome, material.dados.marcaModelo, caminho))) {
      avisos.push({
        aba: "Materiais",
        linha: material.linha,
        mensagem: `Já existe “${[material.dados.nome, material.dados.marcaModelo].filter(Boolean).join(" · ")}” ${caminho ? `em ${caminho}` : "sem local"}. Vai virar um segundo cadastro.`,
      });
    }
  }

  const ordem = (a: { linha?: number; aba: string }, b: { linha?: number; aba: string }) =>
    a.aba.localeCompare(b.aba) || (a.linha ?? 0) - (b.linha ?? 0);
  const resumo: ResumoDaImportacao = {
    itens: lida.itens.length,
    porTipo: [...porTipo].map(([nome, quantidade]) => ({ nome, quantidade })).sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR")),
    materiais: lida.materiais.length,
    unidades,
    locaisNovos: [...locaisNovos.values()].map(caminhoDoLocal),
    pessoasNovas: [...pessoasNovas.values()],
  };
  return {
    previa: { erros: erros.sort(ordem), avisos: avisos.sort(ordem), resumo } satisfies Previa,
    tipoPorNome,
    localPorCaminho,
    pessoaPorChave,
    locaisNovos,
    pessoasNovas,
  };
}

async function jaImportado(db: Banco, hash: string) {
  const [linha] = await db.select({ criadoEm: importacoes.criadoEm }).from(importacoes).where(eq(importacoes.hash, hash));
  return linha ? { aba: "Arquivo", mensagem: `Este arquivo já foi importado em ${formatarDataHora(linha.criadoEm)}.` } : null;
}

/** A prévia: o que vai entrar e o que precisa ser corrigido. Não grava nada. */
export async function previaDaImportacao(db: Banco, lida: PlanilhaLida, hash: string): Promise<Previa> {
  const { previa } = await conferir(db, lida);
  const repetido = await jaImportado(db, hash);
  return repetido ? { ...previa, erros: [repetido, ...previa.erros] } : previa;
}

class FalhaNaImportacao extends Error {}

export type ResultadoDaImportacao =
  | { ok: true; itens: number; materiais: number }
  | { ok: false; erros: ErroDaPlanilha[] };

/** Grava a planilha: locais e pessoas novos, itens (com os códigos) e materiais. Tudo ou nada. */
export async function importarPlanilha(
  db: Banco,
  lida: PlanilhaLida,
  arquivo: { hash: string; nome: string },
): Promise<ResultadoDaImportacao> {
  try {
    return await db.transaction(async (tx): Promise<ResultadoDaImportacao> => {
      const repetido = await jaImportado(tx, arquivo.hash);
      if (repetido) return { ok: false, erros: [repetido] };
      const c = await conferir(tx, lida);
      if (c.previa.erros.length) return { ok: false, erros: c.previa.erros };

      // Locais novos: as unidades antes dos departamentos.
      const novos = [...c.locaisNovos.values()].sort((a, b) => a.length - b.length);
      for (const partes of novos) {
        const paiId = partes.length === 2 ? c.localPorCaminho.get(comparavel(partes[0])) ?? null : null;
        const r = await criarLocal(tx, { nome: partes.at(-1)!, paiId });
        if (!r.criado) throw new FalhaNaImportacao(`Não deu para criar o local “${caminhoDoLocal(partes)}”.`);
        c.localPorCaminho.set(comparavel(caminhoDoLocal(partes)), r.local.id);
      }
      const idDoLocal = (local: string) => {
        const partes = partesDoLocal(local);
        return partes?.length ? c.localPorCaminho.get(comparavel(caminhoDoLocal(partes)))! : null;
      };

      for (const [chave, nome] of c.pessoasNovas) {
        const r = await criarColaborador(tx, nome);
        if (!r.criado) throw new FalhaNaImportacao(`Não deu para cadastrar “${nome}”.`);
        c.pessoaPorChave.set(chave, r.colaborador.id);
      }

      // Códigos: reserva de uma vez os números de cada tipo, na ordem da planilha.
      const quantosPorTipo = new Map<number, number>();
      for (const item of lida.itens) {
        const tipo = c.tipoPorNome.get(comparavel(item.tipo))!;
        quantosPorTipo.set(tipo.id, (quantosPorTipo.get(tipo.id) ?? 0) + 1);
      }
      const proximo = new Map<number, { prefixo: string; numero: number }>();
      for (const [tipoId, quantos] of quantosPorTipo) {
        const [tipo] = await tx
          .update(tiposDeItem)
          .set({ ultimoNumero: sql`${tiposDeItem.ultimoNumero} + ${quantos}` })
          .where(eq(tiposDeItem.id, tipoId))
          .returning({ prefixo: tiposDeItem.prefixo, ultimo: tiposDeItem.ultimoNumero });
        proximo.set(tipoId, { prefixo: tipo.prefixo, numero: tipo.ultimo - quantos + 1 });
      }
      const novosItens = lida.itens.map((item) => {
        const tipo = c.tipoPorNome.get(comparavel(item.tipo))!;
        const vez = proximo.get(tipo.id)!;
        const codigo = montarCodigo(vez.prefixo, vez.numero++);
        const usuarioId = item.usuario ? c.pessoaPorChave.get(chaveDoNome(item.usuario))! : null;
        return {
          ...aplicarCategoria({ ...item.dados, tipoId: tipo.id, usuarioId, localId: idDoLocal(item.local) }, tipo.categoria),
          codigo,
        };
      });
      for (let i = 0; i < novosItens.length; i += 500) await tx.insert(itens).values(novosItens.slice(i, i + 500));

      for (let i = 0; i < lida.materiais.length; i += 500) {
        const parte = lida.materiais.slice(i, i + 500);
        const criados = await tx
          .insert(materiais)
          .values(parte.map((m) => ({ ...m.dados, localId: idDoLocal(m.local) })))
          .returning({ id: materiais.id, quantidade: materiais.quantidade });
        const entradas = criados
          .filter((m) => m.quantidade > 0)
          .map((m) => ({ materialId: m.id, tipo: "entrada" as const, quantidade: m.quantidade, saldo: m.quantidade, observacao: "Importado da planilha" }));
        if (entradas.length) await tx.insert(movimentosDeMaterial).values(entradas);
      }

      await tx.insert(importacoes).values({ hash: arquivo.hash, arquivo: arquivo.nome, itens: novosItens.length, materiais: lida.materiais.length });
      return { ok: true, itens: novosItens.length, materiais: lida.materiais.length };
    });
  } catch (e) {
    if (e instanceof FalhaNaImportacao) return { ok: false, erros: [{ aba: "Arquivo", mensagem: e.message }] };
    throw e;
  }
}
