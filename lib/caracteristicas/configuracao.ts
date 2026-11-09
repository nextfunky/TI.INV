import { and, asc, count, eq, isNotNull, sql, type SQL } from "drizzle-orm";

import { definicoesDeCaracteristicas, itens, materiais, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { GRUPOS, NOME_DO_GRUPO, type Grupo } from "@/lib/materiais/valores";

import type { CaracteristicaCompleta } from "./servico";
import { OPCOES_NO_MAXIMO, TIPOS_DE_CARACTERISTICA, type TipoDeCaracteristica } from "./valores";

/**
 * Criar, editar, ordenar e excluir características (em Configurações). Não
 * dependem do Next: recebem o banco como parâmetro.
 */

/** De quem é a característica: de um tipo de item ou de um grupo de material. */
export type Dono = { tipoId: number } | { grupo: Grupo };

export const NOME_NO_MAXIMO = 40;
export const OPCAO_NO_MAXIMO = 40;
export const UNIDADE_NO_MAXIMO = 12;

/** "tipo:3" ou "grupo:cabos" (como vai no endereço e nas ações), conferido. */
export function lerDono(texto: string): Dono | null {
  const tipo = /^tipo:(\d{1,9})$/.exec(texto);
  if (tipo) return { tipoId: Number(tipo[1]) };
  const grupo = GRUPOS.find((g) => texto === `grupo:${g}`);
  return grupo ? { grupo } : null;
}

export function textoDoDono(dono: Dono): string {
  return "tipoId" in dono ? `tipo:${dono.tipoId}` : `grupo:${dono.grupo}`;
}

/** A tela do dono, para onde se volta depois de salvar. */
export function telaDoDono(dono: Dono): string {
  return "tipoId" in dono ? `/configuracoes/tipos/${dono.tipoId}` : `/configuracoes/grupos/${dono.grupo}`;
}

export function donoDe(c: Pick<CaracteristicaCompleta, "tipoId" | "grupo">): Dono {
  return c.tipoId !== null ? { tipoId: c.tipoId } : { grupo: c.grupo! };
}

function doDono(dono: Dono): SQL {
  return "tipoId" in dono ? eq(definicoesDeCaracteristicas.tipoId, dono.tipoId) : eq(definicoesDeCaracteristicas.grupo, dono.grupo);
}

/** O nome do dono para as telas ("Mouse", "Impressão"), ou null se o tipo não existe. */
export async function nomeDoDono(db: Banco, dono: Dono): Promise<string | null> {
  if ("grupo" in dono) return NOME_DO_GRUPO[dono.grupo];
  const [tipo] = await db.select({ nome: tiposDeItem.nome }).from(tiposDeItem).where(eq(tiposDeItem.id, dono.tipoId));
  return tipo?.nome ?? null;
}

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

export async function obterCaracteristica(db: Banco, id: number): Promise<CaracteristicaCompleta | null> {
  const [c] = await db.select(CAMPOS).from(definicoesDeCaracteristicas).where(eq(definicoesDeCaracteristicas.id, id));
  return c ?? null;
}

export async function caracteristicasDoDono(db: Banco, dono: Dono): Promise<CaracteristicaCompleta[]> {
  return db
    .select(CAMPOS)
    .from(definicoesDeCaracteristicas)
    .where(doDono(dono))
    .orderBy(asc(definicoesDeCaracteristicas.ordem), asc(definicoesDeCaracteristicas.id));
}

/** A coluna de valores e a condição "é deste dono" (os itens do tipo, ou os materiais do grupo). */
function cadastrosDoDono(dono: Dono) {
  return "tipoId" in dono
    ? { tabela: itens, coluna: itens.caracteristicas, condicao: eq(itens.tipoId, dono.tipoId) }
    : { tabela: materiais, coluna: materiais.caracteristicas, condicao: eq(materiais.grupo, dono.grupo) };
}

/** Quantos cadastros usam cada valor desta característica: { "Preto": 4, "Ciano": 1 }. */
export async function usoDosValores(db: Banco, c: Pick<CaracteristicaCompleta, "id" | "tipoId" | "grupo">): Promise<Record<string, number>> {
  const { tabela, coluna, condicao } = cadastrosDoDono(donoDe(c));
  // A chave vai escrita na consulta (é o id, um número) para o "group by" reconhecer a mesma expressão.
  const valor = sql<string>`${coluna} ->> ${sql.raw(`'${Number(c.id)}'`)}`;
  const linhas = await db
    .select({ valor, total: count() })
    .from(tabela)
    .where(and(condicao, isNotNull(valor)))
    .groupBy(valor);
  return Object.fromEntries(linhas.map((l) => [l.valor, l.total]));
}

/** O que o formulário manda (já sem espaços sobrando). */
export type DadosDaCaracteristica = {
  nome: string;
  tipo: string;
  unidade: string;
  /** As linhas de opção: o texto atual e o que era antes ("" para uma opção nova). */
  opcoes: Array<{ valor: string; original: string }>;
};

type Conferido = { nome: string; tipo: TipoDeCaracteristica; unidade: string | null; opcoes: string[]; renomear: Array<{ de: string; para: string }> };

/**
 * Confere os dados. Na edição, `atual` traz as opções de antes e quantos
 * cadastros usam cada uma: uma opção em uso pode mudar de nome (os cadastros
 * mudam junto), mas não pode sair da lista.
 */
function conferir(
  dados: DadosDaCaracteristica,
  atual: { tipo: TipoDeCaracteristica; opcoes: string[]; uso: Record<string, number> } | null,
): { ok: true; dados: Conferido } | { ok: false; erros: Record<string, string> } {
  const erros: Record<string, string> = {};
  const nome = dados.nome.trim().replace(/\s+/g, " ");
  if (!nome) erros.nome = "Informe o nome.";
  else if (nome.length > NOME_NO_MAXIMO) erros.nome = `Use no máximo ${NOME_NO_MAXIMO} caracteres.`;

  // O tipo do campo não muda depois de criado (os valores guardados dependem dele).
  const tipo = atual ? atual.tipo : TIPOS_DE_CARACTERISTICA.find((t) => t === dados.tipo);
  if (!tipo) erros.tipo = "Escolha o tipo do campo.";

  const unidade = dados.unidade.trim();
  if (tipo === "numero" && unidade.length > UNIDADE_NO_MAXIMO) erros.unidade = `Use no máximo ${UNIDADE_NO_MAXIMO} caracteres.`;

  const opcoes: string[] = [];
  const renomear: Array<{ de: string; para: string }> = [];
  if (tipo === "lista") {
    const linhas = dados.opcoes.map((o) => ({ valor: o.valor.trim().replace(/\s+/g, " "), original: o.original }));
    const vistas = new Set<string>();
    for (const linha of linhas) {
      if (!linha.valor) continue;
      const chave = linha.valor.toLocaleLowerCase("pt-BR");
      if (linha.valor.length > OPCAO_NO_MAXIMO) erros.opcoes ??= `Cada opção pode ter no máximo ${OPCAO_NO_MAXIMO} caracteres (“${linha.valor.slice(0, 20)}…”).`;
      else if (vistas.has(chave)) erros.opcoes ??= `A opção “${linha.valor}” aparece duas vezes.`;
      vistas.add(chave);
      opcoes.push(linha.valor);
      if (atual && linha.original && atual.opcoes.includes(linha.original) && linha.original !== linha.valor) {
        renomear.push({ de: linha.original, para: linha.valor });
      }
    }
    if (!opcoes.length) erros.opcoes ??= "Informe pelo menos uma opção.";
    else if (opcoes.length > OPCOES_NO_MAXIMO) erros.opcoes ??= `Use no máximo ${OPCOES_NO_MAXIMO} opções.`;

    // Uma opção em uso que sumiu da lista (e não foi renomeada).
    if (atual) {
      const mantidas = new Set(linhas.filter((l) => l.valor && l.original).map((l) => l.original));
      const tiradas = atual.opcoes.filter((o) => !mantidas.has(o) && atual.uso[o]);
      if (tiradas.length) {
        const o = tiradas[0];
        erros.opcoes ??= `“${o}” está em ${atual.uso[o] === 1 ? "1 cadastro" : `${atual.uso[o]} cadastros`}. Troque o valor neles antes de tirar a opção (ou só mude o nome dela).`;
      }
    }
  }

  if (Object.keys(erros).length || !tipo) return { ok: false, erros };
  return { ok: true, dados: { nome, tipo, unidade: tipo === "numero" ? unidade || null : null, opcoes, renomear } };
}

async function nomeEmUso(db: Banco, dono: Dono, nome: string, menosId?: number): Promise<boolean> {
  const mesmos = await db
    .select({ id: definicoesDeCaracteristicas.id })
    .from(definicoesDeCaracteristicas)
    .where(and(doDono(dono), sql`lower(${definicoesDeCaracteristicas.nome}) = lower(${nome})`));
  return mesmos.some((m) => m.id !== menosId);
}

export async function criarCaracteristica(
  db: Banco,
  dono: Dono,
  dados: DadosDaCaracteristica,
): Promise<{ criada: true; id: number; nome: string } | { criada: false; erros: Record<string, string> }> {
  const conferido = conferir(dados, null);
  if (!conferido.ok) return { criada: false, erros: conferido.erros };
  const { nome, tipo, unidade, opcoes } = conferido.dados;
  if (await nomeEmUso(db, dono, nome)) return { criada: false, erros: { nome: `Já existe “${nome}” aqui.` } };

  const [{ maior }] = await db
    .select({ maior: sql<number>`coalesce(max(${definicoesDeCaracteristicas.ordem}), 0)` })
    .from(definicoesDeCaracteristicas)
    .where(doDono(dono));
  const [nova] = await db
    .insert(definicoesDeCaracteristicas)
    .values({
      ...("tipoId" in dono ? { tipoId: dono.tipoId } : { grupo: dono.grupo }),
      nome,
      tipo,
      unidade,
      opcoes,
      ordem: Number(maior) + 1,
    })
    .returning({ id: definicoesDeCaracteristicas.id });
  return { criada: true, id: nova.id, nome };
}

/**
 * Salva as mudanças. Renomear uma opção muda o valor em todos os cadastros
 * que a usavam (ex.: "Cat5e" → "Cat 5e" nos patch cords).
 */
export async function editarCaracteristica(
  db: Banco,
  id: number,
  dados: DadosDaCaracteristica,
): Promise<{ salva: true; nome: string; renomeadas: number } | { salva: false; erros: Record<string, string> } | { salva: false; naoEncontrada: true }> {
  return db.transaction(async (tx) => {
    const atual = await obterCaracteristica(tx, id);
    if (!atual) return { salva: false as const, naoEncontrada: true as const };
    const dono = donoDe(atual);
    const uso = atual.tipo === "lista" ? await usoDosValores(tx, atual) : {};
    const conferido = conferir(dados, { tipo: atual.tipo, opcoes: atual.opcoes, uso });
    if (!conferido.ok) return { salva: false as const, erros: conferido.erros };
    const { nome, unidade, opcoes, renomear } = conferido.dados;
    if (await nomeEmUso(tx, dono, nome, id)) return { salva: false as const, erros: { nome: `Já existe “${nome}” aqui.` } };

    await tx.update(definicoesDeCaracteristicas).set({ nome, unidade, opcoes }).where(eq(definicoesDeCaracteristicas.id, id));

    // Renomeia os valores guardados. Em duas etapas (para um nome temporário) para
    // dar certo mesmo quando duas opções trocam de nome entre si.
    const { tabela, coluna, condicao } = cadastrosDoDono(dono);
    const chave = String(id);
    let renomeadas = 0;
    // Mais comprido que qualquer opção, então nunca se confunde com um valor de verdade.
    const temporario = (i: number) => `${"~".repeat(OPCAO_NO_MAXIMO)}renomeando-${i}`;
    for (const [i, { de }] of renomear.entries()) {
      const mudados = await tx
        .update(tabela)
        .set({ caracteristicas: sql`jsonb_set(${coluna}, ARRAY[${chave}]::text[], to_jsonb(${temporario(i)}::text))` })
        .where(and(condicao, sql`${coluna} ->> ${chave} = ${de}`))
        .returning({ id: sql`1` });
      renomeadas += mudados.length;
    }
    for (const [i, { para }] of renomear.entries()) {
      await tx
        .update(tabela)
        .set({ caracteristicas: sql`jsonb_set(${coluna}, ARRAY[${chave}]::text[], to_jsonb(${para}::text))` })
        .where(and(condicao, sql`${coluna} ->> ${chave} = ${temporario(i)}`));
    }
    return { salva: true as const, nome, renomeadas };
  });
}

/** Exclui a característica e apaga o valor dela em todos os cadastros. */
export async function excluirCaracteristica(
  db: Banco,
  id: number,
): Promise<{ excluida: true; nome: string; dono: Dono; valoresApagados: number } | { excluida: false }> {
  return db.transaction(async (tx) => {
    const atual = await obterCaracteristica(tx, id);
    if (!atual) return { excluida: false as const };
    const dono = donoDe(atual);
    const { tabela, coluna, condicao } = cadastrosDoDono(dono);
    const chave = String(id);
    const mudados = await tx
      .update(tabela)
      .set({ caracteristicas: sql`${coluna} - ${chave}::text` })
      .where(and(condicao, sql`${coluna} ? ${chave}::text`))
      .returning({ id: sql`1` });
    await tx.delete(definicoesDeCaracteristicas).where(eq(definicoesDeCaracteristicas.id, id));
    return { excluida: true as const, nome: atual.nome, dono, valoresApagados: mudados.length };
  });
}

/** Quantos cadastros têm algum valor nesta característica (para a confirmação de excluir). */
export async function cadastrosComValor(db: Banco, c: Pick<CaracteristicaCompleta, "id" | "tipoId" | "grupo">): Promise<number> {
  const { tabela, coluna, condicao } = cadastrosDoDono(donoDe(c));
  const [{ total }] = await db
    .select({ total: count() })
    .from(tabela)
    .where(and(condicao, sql`${coluna} ? ${String(c.id)}::text`));
  return total;
}

/** Sobe ou desce uma posição (a ordem dos campos no formulário, nas etiquetas e nos filtros). */
export async function moverCaracteristica(db: Banco, id: number, direcao: "subir" | "descer"): Promise<Dono | null> {
  return db.transaction(async (tx) => {
    const atual = await obterCaracteristica(tx, id);
    if (!atual) return null;
    const dono = donoDe(atual);
    const lista = await caracteristicasDoDono(tx, dono);
    const i = lista.findIndex((c) => c.id === id);
    const j = direcao === "subir" ? i - 1 : i + 1;
    if (j < 0 || j >= lista.length) return dono;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    // Renumera tudo (1, 2, 3…), o que também conserta ordens repetidas.
    for (const [posicao, c] of lista.entries()) {
      await tx.update(definicoesDeCaracteristicas).set({ ordem: posicao + 1 }).where(eq(definicoesDeCaracteristicas.id, c.id));
    }
    return dono;
  });
}

/** Para a tela "Grupos de material": quantas características e quantos materiais cada grupo tem. */
export async function resumoDosGrupos(db: Banco): Promise<Array<{ grupo: Grupo; caracteristicas: string[]; materiais: number }>> {
  const [definicoes, contagem] = await Promise.all([
    db
      .select({ grupo: definicoesDeCaracteristicas.grupo, nome: definicoesDeCaracteristicas.nome })
      .from(definicoesDeCaracteristicas)
      .where(isNotNull(definicoesDeCaracteristicas.grupo))
      .orderBy(asc(definicoesDeCaracteristicas.ordem), asc(definicoesDeCaracteristicas.id)),
    db.select({ grupo: materiais.grupo, total: count() }).from(materiais).groupBy(materiais.grupo),
  ]);
  return GRUPOS.map((grupo) => ({
    grupo,
    caracteristicas: definicoes.filter((d) => d.grupo === grupo).map((d) => d.nome),
    materiais: contagem.find((c) => c.grupo === grupo)?.total ?? 0,
  }));
}
