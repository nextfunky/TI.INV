"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth/sessao";
import { avisar } from "@/lib/aviso";
import { obterBanco } from "@/lib/db";
import { plural } from "@/lib/texto/plural";

import { lerArquivoEnviado } from "./arquivo";
import type { ErroDaPlanilha } from "./planilha";
import { importarPlanilha, previaDaImportacao, type Previa } from "./servico";

/** O máximo de problemas mandados para a tela (o total vem junto). */
const ERROS_NA_TELA = 200;

export type RespostaDaLeitura =
  | { ok: true; arquivo: string; previa: Omit<Previa, "erros"> & { erros: ErroDaPlanilha[]; totalDeErros: number } }
  | { ok: false; erro: string };

/** "Ler planilha": abre o arquivo e mostra a prévia. Não grava nada. */
export async function lerPlanilhaEnviada(dados: FormData): Promise<RespostaDaLeitura> {
  await exigirSessao();
  const lido = await lerArquivoEnviado(dados);
  if ("erro" in lido) return { ok: false, erro: lido.erro };
  const previa = await previaDaImportacao(obterBanco(), lido.planilha, lido.hash);
  return {
    ok: true,
    arquivo: lido.nome,
    previa: { ...previa, erros: previa.erros.slice(0, ERROS_NA_TELA), avisos: previa.avisos.slice(0, ERROS_NA_TELA), totalDeErros: previa.erros.length },
  };
}

export type RespostaDaImportacao = { ok: false; erro?: string; erros?: ErroDaPlanilha[]; totalDeErros?: number };

/** "Importar": lê o arquivo de novo, confere tudo outra vez e grava (tudo ou nada). */
export async function importarPlanilhaEnviada(dados: FormData): Promise<RespostaDaImportacao> {
  await exigirSessao();
  const lido = await lerArquivoEnviado(dados);
  if ("erro" in lido) return { ok: false, erro: lido.erro };
  const resultado = await importarPlanilha(obterBanco(), lido.planilha, { hash: lido.hash, nome: lido.nome });
  if (!resultado.ok) return { ok: false, erros: resultado.erros.slice(0, ERROS_NA_TELA), totalDeErros: resultado.erros.length };

  revalidatePath("/", "layout");
  const partes = [
    resultado.itens ? plural(resultado.itens, "item", "itens") : null,
    resultado.materiais ? plural(resultado.materiais, "material", "materiais") : null,
  ].filter(Boolean);
  await avisar(`Importação concluída: ${partes.join(" e ")}.`);
  redirect("/inventario");
}
