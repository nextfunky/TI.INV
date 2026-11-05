"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth/sessao";
import { avisar } from "@/lib/aviso";
import { obterBanco } from "@/lib/db";
import { errosPorCampo, lerFormulario, type EstadoDoFormulario } from "@/lib/formulario";

import { enderecoInterno } from "./painel";
import { CAMPOS_DO_ITEM, regrasDoItem, regrasDoPrefixo, regrasDoTipo } from "./regras";
import { criarItem, editarItem, excluirItem } from "./servico";
import { criarTipo, editarTipo, excluirTipo } from "./tipos";

/** Depois de qualquer mudança, as telas já abertas mostram os dados novos. */
function atualizarTelas() {
  revalidatePath("/", "layout");
}

// ─── Itens ────────────────────────────────────────────────────────────────

export async function cadastrarItem(_estado: EstadoDoFormulario, dados: FormData): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, CAMPOS_DO_ITEM);

  const validacao = regrasDoItem.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await criarItem(obterBanco(), validacao.data);
  if (!resultado.criado) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar(`${resultado.codigo} cadastrado.`);
  // "Salvar e cadastrar outro": abre um formulário novo, repetindo o que é igual.
  if (dados.get("depois") === "outro") redirect(`/inventario/novo?repetir=${resultado.codigo}`);
  redirect(`/inventario/${resultado.codigo}`);
}

export async function salvarItem(
  id: number,
  _estado: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, CAMPOS_DO_ITEM);

  const validacao = regrasDoItem.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await editarItem(obterBanco(), id, validacao.data);
  if (!resultado.salvo && "naoEncontrado" in resultado) {
    await avisar("Este item não existe mais.", "erro");
    redirect("/inventario");
  }
  if (!resultado.salvo) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar(
    resultado.codigo === resultado.codigoAntigo
      ? "Alterações salvas."
      : `Alterações salvas. Com o novo tipo, ${resultado.codigoAntigo} virou ${resultado.codigo}.`,
  );
  redirect(`/inventario/${resultado.codigo}`);
}

/** Exclui o item. Do painel lateral, volta para a lista em que ele estava (sem o painel). */
export async function apagarItem(id: number, voltarPara?: string): Promise<void> {
  await exigirSessao();
  const codigo = await excluirItem(obterBanco(), id);
  atualizarTelas();
  await avisar(codigo ? `${codigo} excluído.` : "Este item não existe mais.", codigo ? "sucesso" : "erro");
  redirect(enderecoInterno(voltarPara) ?? "/inventario");
}

// ─── Tipos de item ────────────────────────────────────────────────────────

export async function cadastrarTipo(_estado: EstadoDoFormulario, dados: FormData): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["nome", "categoria", "prefixo"]);

  const tipo = regrasDoTipo.safeParse(valores);
  const prefixo = regrasDoPrefixo.safeParse(valores.prefixo);
  if (!tipo.success || !prefixo.success) {
    return {
      erros: {
        ...(tipo.success ? {} : errosPorCampo(tipo.error)),
        ...(prefixo.success ? {} : { prefixo: prefixo.error.issues[0].message }),
      },
      valores,
    };
  }

  const resultado = await criarTipo(obterBanco(), { ...tipo.data, prefixo: prefixo.data });
  if (!resultado.criado) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar(`${resultado.tipo.nome} cadastrado.`);
  redirect("/configuracoes/tipos");
}

export async function salvarTipo(
  id: number,
  _estado: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  await exigirSessao();
  const valores = lerFormulario(dados, ["nome", "categoria"]);

  const validacao = regrasDoTipo.safeParse(valores);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const resultado = await editarTipo(obterBanco(), id, validacao.data);
  if (!resultado.salvo && "naoEncontrado" in resultado) {
    await avisar("Este tipo não existe mais.", "erro");
    redirect("/configuracoes/tipos");
  }
  if (!resultado.salvo) return { erros: resultado.erros, valores };

  atualizarTelas();
  await avisar("Alterações salvas.");
  redirect("/configuracoes/tipos");
}

export async function apagarTipo(id: number): Promise<void> {
  await exigirSessao();
  const resultado = await excluirTipo(obterBanco(), id);
  if (!resultado.excluido && resultado.motivo === "tem_itens") {
    await avisar("Este tipo ainda tem itens. Mude o tipo deles antes de excluir.", "erro");
    redirect(`/configuracoes/tipos/${id}`);
  }

  atualizarTelas();
  await avisar(resultado.excluido ? `${resultado.nome} excluído.` : "Este tipo não existe mais.", resultado.excluido ? "sucesso" : "erro");
  redirect("/configuracoes/tipos");
}
