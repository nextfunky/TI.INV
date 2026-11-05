"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth/sessao";
import { avisar } from "@/lib/aviso";
import { obterBanco } from "@/lib/db";
import { errosPorCampo, lerFormulario, type EstadoDoFormulario } from "@/lib/formulario";
import { enderecoInterno } from "@/lib/itens/painel";
import { plural } from "@/lib/texto/plural";

import { comMaterial } from "./filtros";
import { nomeDoMaterial } from "./nomes";

import { CAMPOS_DO_MATERIAL, regrasDaEntrada, regrasDaSaida, regrasDoAjuste, regrasDoMaterial, regrasDoNovoMaterial } from "./regras";
import {
  ajustarContagem,
  criarMaterial,
  editarMaterial,
  excluirMaterial,
  registrarEntrada,
  registrarSaida,
  type ResultadoDoMovimento,
} from "./servico";

function atualizarTelas() {
  revalidatePath("/", "layout");
}

const NAO_ENCONTRADO = "Este material não está mais no cadastro.";

export async function cadastrarMaterial(_estado: EstadoDoFormulario, dados: FormData): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, [...CAMPOS_DO_MATERIAL, "quantidade"]);
  const validacao = regrasDoNovoMaterial.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await criarMaterial(obterBanco(), validacao.data);
  if (!resultado.criado) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar(`Cadastro de ${nomeDoMaterial(resultado.material)} criado.`);
  redirect(comMaterial("/materiais", resultado.material.id));
}

export async function salvarMaterial(id: number, _estado: EstadoDoFormulario, dados: FormData): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, CAMPOS_DO_MATERIAL);
  const validacao = regrasDoMaterial.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await editarMaterial(obterBanco(), id, validacao.data);
  if (!resultado.salvo && "naoEncontrado" in resultado) {
    await avisar(NAO_ENCONTRADO, "erro");
    redirect("/materiais");
  }
  if (!resultado.salvo) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar("Alterações salvas.");
  redirect(comMaterial("/materiais", id));
}

/** Exclui o material. Do painel lateral, volta para a lista em que ele estava (sem o painel). */
export async function apagarMaterial(id: number, voltarPara?: string): Promise<void> {
  await exigirSessao();
  const resultado = await excluirMaterial(obterBanco(), id);
  if (!resultado.excluido && resultado.motivo === "tem_saidas") {
    await avisar(`${resultado.nome} já teve saídas. O cadastro fica, para guardar o histórico.`, "erro");
    redirect(comMaterial("/materiais", id));
  }
  atualizarTelas();
  await avisar(resultado.excluido ? `Cadastro de ${resultado.nome} excluído.` : NAO_ENCONTRADO);
  redirect(enderecoInterno(voltarPara) ?? "/materiais");
}

/** O que as janelas de Entrada, Saída e Ajuste recebem de volta. */
export type EstadoDoMovimento = EstadoDoFormulario & {
  /** Quando deu certo: o aviso e um número que muda a cada envio (para a janela saber que fechou). */
  feito?: { mensagem: string; vez: number };
};

function respostaDoMovimento(
  resultado: ResultadoDoMovimento,
  valores: Record<string, string>,
  mensagem: (r: Extract<ResultadoDoMovimento, { ok: true }>) => string,
): EstadoDoMovimento {
  if (resultado.ok) {
    atualizarTelas();
    return { feito: { mensagem: mensagem(resultado), vez: Date.now() } };
  }
  if ("naoEncontrado" in resultado) return { erroGeral: NAO_ENCONTRADO, valores };
  return { erros: resultado.erros, valores };
}

const emEstoque = (saldo: number) => (saldo === 0 ? "Não sobrou nenhum em estoque." : `Agora há ${saldo} em estoque.`);

export async function darEntrada(id: number, _estado: EstadoDoMovimento, dados: FormData): Promise<EstadoDoMovimento> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["quantidade", "observacao"]);
  const validacao = regrasDaEntrada.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };
  const resultado = await registrarEntrada(obterBanco(), id, validacao.data);
  return respostaDoMovimento(resultado, valores, (r) => `Entrada de ${validacao.data.quantidade} registrada. ${emEstoque(r.saldo)}`);
}

export async function darSaida(id: number, _estado: EstadoDoMovimento, dados: FormData): Promise<EstadoDoMovimento> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["quantidade", "colaboradorId", "observacao"]);
  const validacao = regrasDaSaida.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };
  const resultado = await registrarSaida(obterBanco(), id, validacao.data);
  return respostaDoMovimento(resultado, valores, (r) =>
    r.pessoa
      ? `Saída de ${validacao.data.quantidade} para ${r.pessoa} registrada. ${emEstoque(r.saldo)}`
      : `Saída de ${validacao.data.quantidade} registrada. ${emEstoque(r.saldo)}`,
  );
}

export async function ajustar(id: number, _estado: EstadoDoMovimento, dados: FormData): Promise<EstadoDoMovimento> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["contagem", "observacao"]);
  const validacao = regrasDoAjuste.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };
  const resultado = await ajustarContagem(obterBanco(), id, validacao.data);
  return respostaDoMovimento(resultado, valores, (r) => {
    const d = r.diferenca ?? 0;
    const diferenca = d > 0 ? plural(d, "a mais", "a mais") : plural(-d, "a menos", "a menos");
    return `Contagem ajustada (${diferenca}). ${emEstoque(r.saldo)}`;
  });
}
