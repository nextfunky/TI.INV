"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { errosPorCampo, lerFormulario, type EstadoDoFormulario } from "@/lib/formulario";

import { devolverItemPara, entregarItem, mudarLocalDoItem, type ResultadoDaAcaoRapida } from "./movimentos";

/** O que as janelas Entregar, Devolver e Mudar de local recebem de volta. */
export type EstadoDaAcaoRapida = EstadoDoFormulario & { feito?: { mensagem: string; vez: number } };

const observacao = z
  .string()
  .trim()
  .max(500, "Use no máximo 500 caracteres.")
  .transform((v) => v || null);
const id = (mensagem: string) => z.string().regex(/^\d+$/, mensagem).transform(Number);
const idOpcional = (mensagem: string) =>
  z
    .string()
    .regex(/^\d*$/, mensagem)
    .transform((v) => (v ? Number(v) : null));

function resposta(r: ResultadoDaAcaoRapida, valores: Record<string, string>, mensagem: (r: Extract<ResultadoDaAcaoRapida, { ok: true }>) => string): EstadoDaAcaoRapida {
  if (r.ok) {
    revalidatePath("/", "layout");
    return { feito: { mensagem: mensagem(r), vez: Date.now() } };
  }
  return { erros: r.erros, erroGeral: r.erro, valores };
}

export async function entregar(itemId: number, _e: EstadoDaAcaoRapida, dados: FormData): Promise<EstadoDaAcaoRapida> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["pessoaId", "observacao"]);
  const v = z.object({ pessoaId: id("Escolha a pessoa."), observacao }).safeParse(valores);
  if (!v.success) return { erros: errosPorCampo(v.error), valores };
  const r = await entregarItem(obterBanco(), itemId, v.data.pessoaId, v.data.observacao);
  return resposta(r, valores, (ok) => `${ok.codigo} agora está com ${ok.pessoa}.`);
}

export async function devolver(itemId: number, _e: EstadoDaAcaoRapida, dados: FormData): Promise<EstadoDaAcaoRapida> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["localId", "observacao"]);
  const v = z.object({ localId: idOpcional("Escolha um local da lista."), observacao }).safeParse(valores);
  if (!v.success) return { erros: errosPorCampo(v.error), valores };
  const r = await devolverItemPara(obterBanco(), itemId, v.data.localId, v.data.observacao);
  return resposta(r, valores, (ok) => (ok.local ? `${ok.codigo} devolvido para ${ok.local}.` : `${ok.codigo} devolvido.`));
}

export async function mudarLocal(itemId: number, _e: EstadoDaAcaoRapida, dados: FormData): Promise<EstadoDaAcaoRapida> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["localId", "observacao"]);
  const v = z.object({ localId: idOpcional("Escolha um local da lista."), observacao }).safeParse(valores);
  if (!v.success) return { erros: errosPorCampo(v.error), valores };
  const r = await mudarLocalDoItem(obterBanco(), itemId, v.data.localId, v.data.observacao);
  return resposta(r, valores, (ok) => `${ok.codigo} agora está em ${ok.local ?? "Sem local definido"}.`);
}
