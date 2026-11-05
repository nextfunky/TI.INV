"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth/sessao";
import { avisar } from "@/lib/aviso";
import { obterBanco } from "@/lib/db";
import { errosPorCampo, lerFormulario, type EstadoDoFormulario } from "@/lib/formulario";
import { regrasDoColaborador } from "@/lib/itens/regras";

import { criarColaborador, devolverItem, editarColaborador, excluirColaborador, vincularItens } from "./servico";

function atualizarTelas() {
  revalidatePath("/", "layout");
}

export async function cadastrarColaborador(
  _estado: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["nome"]);
  const validacao = regrasDoColaborador.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await criarColaborador(obterBanco(), validacao.data.nome);
  if (!resultado.criado) return { erros: { nome: resultado.erro }, valores };

  atualizarTelas();
  await avisar(`Cadastro de ${resultado.colaborador.nome} criado.`);
  redirect(`/colaboradores/${resultado.colaborador.id}`);
}

export async function salvarColaborador(
  id: number,
  _estado: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["nome"]);
  const validacao = regrasDoColaborador.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await editarColaborador(obterBanco(), id, validacao.data.nome);
  if (!resultado.salvo && "naoEncontrado" in resultado) {
    await avisar("Esta pessoa não está mais no cadastro.", "erro");
    redirect("/colaboradores");
  }
  if (!resultado.salvo) return { erros: { nome: resultado.erro }, valores };

  atualizarTelas();
  await avisar("Alterações salvas.");
  redirect(`/colaboradores/${id}`);
}

export async function apagarColaborador(id: number): Promise<void> {
  await exigirSessao();
  const resultado = await excluirColaborador(obterBanco(), id);
  if (!resultado.excluido && resultado.motivo === "tem_itens") {
    await avisar(`${resultado.nome} ainda tem itens. Passe-os para outra pessoa antes de excluir.`, "erro");
    redirect(`/colaboradores/${id}`);
  }
  atualizarTelas();
  await avisar(resultado.excluido ? `Cadastro de ${resultado.nome} excluído.` : "Esta pessoa não está mais no cadastro.");
  redirect("/colaboradores");
}

export type ResultadoDoCadastroRapido =
  | { ok: true; colaborador: { id: number; nome: string } }
  | { ok: false; erro: string };

/** "+ Novo colaborador" dentro do formulário de item: cadastra sem sair da página. */
export async function cadastrarColaboradorRapido(nome: string): Promise<ResultadoDoCadastroRapido> {
  await exigirSessao();
  const validacao = regrasDoColaborador.safeParse({ nome });
  if (!validacao.success) return { ok: false, erro: validacao.error.issues[0].message };

  const resultado = await criarColaborador(obterBanco(), validacao.data.nome);
  if (!resultado.criado) return { ok: false, erro: resultado.erro };

  revalidatePath("/colaboradores");
  return { ok: true, colaborador: { id: resultado.colaborador.id, nome: resultado.colaborador.nome } };
}

export type ResultadoDaAcao = { ok: true; mensagem: string } | { ok: false; erro: string };

function idsValidos(ids: unknown): number[] | null {
  if (!Array.isArray(ids) || ids.length > 200) return null;
  const numeros = ids.map(Number);
  return numeros.every((n) => Number.isInteger(n) && n > 0) ? [...new Set(numeros)] : null;
}

/** "Vincular itens" na página da pessoa: passa vários itens para ela de uma vez. */
export async function vincularItensAPessoa(pessoaId: number, itemIds: number[]): Promise<ResultadoDaAcao> {
  await exigirSessao();
  const ids = idsValidos(itemIds);
  if (!ids || !Number.isInteger(pessoaId)) return { ok: false, erro: "Escolha os itens da lista." };

  const resultado = await vincularItens(obterBanco(), pessoaId, ids);
  if (!resultado.ok) return { ok: false, erro: "Esta pessoa não está mais no cadastro." };
  if (!resultado.codigos.length) return { ok: false, erro: "Nenhum item foi vinculado." };

  atualizarTelas();
  const { codigos, nome } = resultado;
  return {
    ok: true,
    mensagem: codigos.length === 1 ? `${codigos[0]} agora está com ${nome}.` : `${codigos.length} itens agora estão com ${nome}.`,
  };
}

/** "Devolver" na página da pessoa: tira o item dela (e, se estava em uso, volta para o estoque). */
export async function devolverItemDaPessoa(pessoaId: number, itemId: number, nome: string): Promise<ResultadoDaAcao> {
  await exigirSessao();
  const resultado = await devolverItem(obterBanco(), pessoaId, itemId);
  if (!resultado) return { ok: false, erro: "Este item já não estava com esta pessoa." };

  atualizarTelas();
  return {
    ok: true,
    mensagem: resultado.voltouAoEstoque
      ? `${resultado.codigo} voltou para o estoque.`
      : `${resultado.codigo} não está mais com ${nome}.`,
  };
}
