"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth/sessao";
import { avisar } from "@/lib/aviso";
import { obterBanco } from "@/lib/db";
import { errosPorCampo, lerFormulario, type EstadoDoFormulario } from "@/lib/formulario";
import { regrasDoLocal } from "@/lib/itens/regras";
import { plural } from "@/lib/texto/plural";

import { criarLocal, editarLocal, excluirLocal, obterLocal, trazerItens, trazerPessoas } from "./servico";

function atualizarTelas() {
  revalidatePath("/", "layout");
}

export async function cadastrarLocal(_estado: EstadoDoFormulario, dados: FormData): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["nome", "paiId"]);
  const validacao = regrasDoLocal.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await criarLocal(obterBanco(), validacao.data);
  if (!resultado.criado) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar(`${resultado.local.caminho} cadastrado.`);
  redirect("/locais");
}

export async function salvarLocal(id: number, _estado: EstadoDoFormulario, dados: FormData): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["nome", "paiId"]);
  const validacao = regrasDoLocal.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await editarLocal(obterBanco(), id, validacao.data);
  if (!resultado.salvo && "naoEncontrado" in resultado) {
    await avisar("Este local não existe mais.", "erro");
    redirect("/locais");
  }
  if (!resultado.salvo) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar("Alterações salvas.");
  redirect("/locais");
}

export type ResultadoDaAcao = { ok: true; mensagem: string } | { ok: false; erro: string };

/**
 * Exclui um local vazio. Devolve o aviso para a própria tela mostrar (a
 * exclusão pode ser feita na árvore, sem trocar de página).
 */
export async function apagarLocal(id: number): Promise<ResultadoDaAcao> {
  await exigirSessao();
  const resultado = await excluirLocal(obterBanco(), id);
  if (!resultado.excluido && resultado.motivo === "nao_vazio") {
    return { ok: false, erro: `${resultado.caminho} ainda tem locais, pessoas ou itens. Mova-os antes de excluir.` };
  }
  atualizarTelas();
  return resultado.excluido
    ? { ok: true, mensagem: `${resultado.caminho} excluído.` }
    : { ok: false, erro: "Este local não existe mais." };
}

function idsValidos(ids: unknown): number[] | null {
  if (!Array.isArray(ids) || ids.length > 200) return null;
  const numeros = ids.map(Number);
  return numeros.every((n) => Number.isInteger(n) && n > 0) ? [...new Set(numeros)] : null;
}

/** "Trazer pessoas" na página do local: os itens delas vêm junto. */
export async function trazerPessoasAoLocal(localId: number, pessoaIds: number[]): Promise<ResultadoDaAcao> {
  await exigirSessao();
  const ids = idsValidos(pessoaIds);
  if (!ids) return { ok: false, erro: "Escolha as pessoas da lista." };
  const db = obterBanco();
  const local = await obterLocal(db, localId);
  const movidas = local ? await trazerPessoas(db, localId, ids) : null;
  if (!local || movidas === null) return { ok: false, erro: "Este local não existe mais." };
  if (!movidas) return { ok: false, erro: "Ninguém foi movido." };
  atualizarTelas();
  return { ok: true, mensagem: `${plural(movidas, "pessoa", "pessoas")} agora em ${local.caminho}.` };
}

/** "Trazer itens" na página do local: só itens sem usuário. */
export async function trazerItensAoLocal(localId: number, itemIds: number[]): Promise<ResultadoDaAcao> {
  await exigirSessao();
  const ids = idsValidos(itemIds);
  if (!ids) return { ok: false, erro: "Escolha os itens da lista." };
  const db = obterBanco();
  const local = await obterLocal(db, localId);
  const movidos = local ? await trazerItens(db, localId, ids) : null;
  if (!local || movidos === null) return { ok: false, erro: "Este local não existe mais." };
  if (!movidos) return { ok: false, erro: "Nenhum item foi movido." };
  atualizarTelas();
  return { ok: true, mensagem: `${plural(movidos, "item", "itens")} agora em ${local.caminho}.` };
}
