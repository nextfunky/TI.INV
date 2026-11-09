"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth/sessao";
import { avisar } from "@/lib/aviso";
import { obterBanco } from "@/lib/db";
import type { EstadoDoFormulario } from "@/lib/formulario";
import { plural } from "@/lib/texto/plural";

import {
  criarCaracteristica,
  editarCaracteristica,
  excluirCaracteristica,
  lerDono,
  moverCaracteristica,
  nomeDoDono,
  telaDoDono,
  type DadosDaCaracteristica,
} from "./configuracao";

function atualizarTelas() {
  revalidatePath("/", "layout");
}

/** Lê o formulário: nome, tipo, unidade e as linhas de opção (o texto e o que era antes). */
function lerDados(dados: FormData): { dados: DadosDaCaracteristica; valores: Record<string, string> } {
  const texto = (campo: string) => {
    const v = dados.get(campo);
    return typeof v === "string" ? v : "";
  };
  const textos = dados.getAll("opcao").map((v) => (typeof v === "string" ? v : ""));
  const originais = dados.getAll("original").map((v) => (typeof v === "string" ? v : ""));
  const opcoes = textos.map((valor, i) => ({ valor, original: originais[i] ?? "" })).slice(0, 200);
  const lidos = { nome: texto("nome"), tipo: texto("tipo"), unidade: texto("unidade"), opcoes };
  // As linhas de opção ficam no próprio formulário (controladas); só os campos simples voltam.
  return { dados: lidos, valores: { nome: lidos.nome, tipo: lidos.tipo, unidade: lidos.unidade } };
}

export async function cadastrarCaracteristica(dono: string, _estado: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const db = obterBanco();
  const lido = lerDono(dono);
  if (!lido || !(await nomeDoDono(db, lido))) {
    await avisar("Este tipo não existe mais.", "erro");
    redirect("/configuracoes/tipos");
  }
  const { dados, valores } = lerDados(formulario);
  const resultado = await criarCaracteristica(db, lido, dados);
  if (!resultado.criada) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar(`${resultado.nome} cadastrada.`);
  redirect(telaDoDono(lido));
}

export async function salvarCaracteristica(id: number, _estado: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const { dados, valores } = lerDados(formulario);
  const resultado = await editarCaracteristica(obterBanco(), id, dados);
  if (!resultado.salva && "naoEncontrada" in resultado) {
    await avisar("Esta característica não existe mais.", "erro");
    redirect("/configuracoes/tipos");
  }
  if (!resultado.salva) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar(
    resultado.renomeadas
      ? `Alterações salvas. ${plural(resultado.renomeadas, "cadastro foi atualizado", "cadastros foram atualizados")} com o novo nome da opção.`
      : "Alterações salvas.",
  );
  redirect(dono(formulario));
}

/** Para onde voltar depois de salvar (a tela do tipo ou do grupo), conferido. */
function dono(formulario: FormData): string {
  const lido = lerDono(String(formulario.get("dono") ?? ""));
  return lido ? telaDoDono(lido) : "/configuracoes/tipos";
}

export async function apagarCaracteristica(id: number): Promise<void> {
  await exigirSessao();
  const resultado = await excluirCaracteristica(obterBanco(), id);
  atualizarTelas();
  if (!resultado.excluida) {
    await avisar("Esta característica não existe mais.", "erro");
    redirect("/configuracoes/tipos");
  }
  await avisar(
    resultado.valoresApagados
      ? `${resultado.nome} excluída (e tirada de ${plural(resultado.valoresApagados, "cadastro", "cadastros")}).`
      : `${resultado.nome} excluída.`,
  );
  redirect(telaDoDono(resultado.dono));
}

export async function reordenarCaracteristica(id: number, direcao: "subir" | "descer"): Promise<void> {
  await exigirSessao();
  if (direcao !== "subir" && direcao !== "descer") return;
  const dono = await moverCaracteristica(obterBanco(), id, direcao);
  atualizarTelas();
  if (!dono) {
    await avisar("Esta característica não existe mais.", "erro");
    redirect("/configuracoes/tipos");
  }
}
