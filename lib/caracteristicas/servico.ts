import { and, asc, eq, isNotNull, sql } from "drizzle-orm";

import { definicoesDeCaracteristicas, itens, materiais } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import type { Grupo } from "@/lib/materiais/valores";

import type { FiltroDeCaracteristicaNaTela } from "./filtros";
import { compararValores, valorFormatado } from "./regras";
import type { Caracteristica } from "./valores";

export type CaracteristicaCompleta = Caracteristica & { tipoId: number | null; grupo: Grupo | null; ordem: number };

const CAMPOS = {
  id: definicoesDeCaracteristicas.id,
  nome: definicoesDeCaracteristicas.nome,
  tipo: definicoesDeCaracteristicas.tipo,
  opcoes: definicoesDeCaracteristicas.opcoes,
  unidade: definicoesDeCaracteristicas.unidade,
  tipoId: definicoesDeCaracteristicas.tipoId,
  grupo: definicoesDeCaracteristicas.grupo,
  ordem: definicoesDeCaracteristicas.ordem,
};

/** Todas as características, na ordem de cada tipo/grupo. */
export async function listarCaracteristicas(db: Banco): Promise<CaracteristicaCompleta[]> {
  return db.select(CAMPOS).from(definicoesDeCaracteristicas).orderBy(asc(definicoesDeCaracteristicas.ordem), asc(definicoesDeCaracteristicas.id));
}

export async function caracteristicasDoTipo(db: Banco, tipoId: number): Promise<CaracteristicaCompleta[]> {
  return db
    .select(CAMPOS)
    .from(definicoesDeCaracteristicas)
    .where(eq(definicoesDeCaracteristicas.tipoId, tipoId))
    .orderBy(asc(definicoesDeCaracteristicas.ordem), asc(definicoesDeCaracteristicas.id));
}

export async function caracteristicasDoGrupo(db: Banco, grupo: Grupo): Promise<CaracteristicaCompleta[]> {
  return db
    .select(CAMPOS)
    .from(definicoesDeCaracteristicas)
    .where(eq(definicoesDeCaracteristicas.grupo, grupo))
    .orderBy(asc(definicoesDeCaracteristicas.ordem), asc(definicoesDeCaracteristicas.id));
}

/** Para as telas: { tipoId: [características] }. */
export function porTipo(lista: CaracteristicaCompleta[]): Record<number, Caracteristica[]> {
  const mapa: Record<number, Caracteristica[]> = {};
  for (const c of lista) if (c.tipoId !== null) (mapa[c.tipoId] ??= []).push(simples(c));
  return mapa;
}

/** Para as telas: { grupo: [características] }. */
export function porGrupo(lista: CaracteristicaCompleta[]): Partial<Record<Grupo, Caracteristica[]>> {
  const mapa: Partial<Record<Grupo, Caracteristica[]>> = {};
  for (const c of lista) if (c.grupo !== null) (mapa[c.grupo] ??= []).push(simples(c));
  return mapa;
}

export function simples(c: CaracteristicaCompleta): Caracteristica {
  return { id: c.id, nome: c.nome, tipo: c.tipo, opcoes: c.opcoes, unidade: c.unidade };
}

/** Os valores já usados numa característica (para os filtros de número, como o Comprimento). */
export async function valoresUsados(db: Banco, c: Pick<CaracteristicaCompleta, "id" | "tipoId" | "grupo">): Promise<string[]> {
  const chave = String(c.id);
  if (c.tipoId !== null) {
    const linhas = await db
      .selectDistinct({ v: sql<string>`${itens.caracteristicas} ->> ${chave}` })
      .from(itens)
      .where(and(eq(itens.tipoId, c.tipoId), isNotNull(sql`${itens.caracteristicas} ->> ${chave}`)));
    return linhas.map((l) => l.v);
  }
  const linhas = await db
    .selectDistinct({ v: sql<string>`${materiais.caracteristicas} ->> ${chave}` })
    .from(materiais)
    .where(and(eq(materiais.grupo, c.grupo!), isNotNull(sql`${materiais.caracteristicas} ->> ${chave}`)));
  return linhas.map((l) => l.v);
}

/**
 * As escolhas dos filtros por característica (as de texto livre ficam de fora):
 * as opções da lista, ou os números já usados (ex.: os comprimentos que existem).
 */
export async function opcoesDosFiltros(db: Banco, lista: CaracteristicaCompleta[]): Promise<FiltroDeCaracteristicaNaTela[]> {
  const filtros: FiltroDeCaracteristicaNaTela[] = [];
  for (const c of lista.filter((c) => c.tipo !== "texto")) {
    const valores = c.tipo === "lista" ? c.opcoes : (await valoresUsados(db, c)).sort((a, b) => compararValores(c, a, b));
    filtros.push({ id: c.id, nome: c.nome, opcoes: valores.map((v) => ({ valor: v, rotulo: valorFormatado(c, v) })) });
  }
  return filtros;
}
