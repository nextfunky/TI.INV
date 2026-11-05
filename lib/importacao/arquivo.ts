import "server-only";

import { createHash } from "node:crypto";

import readXlsxFile from "read-excel-file/node";

import { lerPlanilha, type PlanilhaLida } from "./planilha";

/** O maior arquivo aceito (o limite de envio do Next é 1 MB). */
export const TAMANHO_MAXIMO = 900 * 1024;

export type ArquivoLido = { nome: string; hash: string; planilha: PlanilhaLida };

/** Abre o .xlsx enviado e lê as abas. Devolve um erro simples se o arquivo não servir. */
export async function lerArquivoEnviado(dados: FormData): Promise<ArquivoLido | { erro: string }> {
  const arquivo = dados.get("planilha");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha o arquivo da planilha." };
  if (!/\.xlsx$/i.test(arquivo.name)) return { erro: "O arquivo precisa ser .xlsx (Excel). Salve a planilha como “Pasta de Trabalho do Excel”." };
  if (arquivo.size > TAMANHO_MAXIMO) return { erro: "O arquivo passa de 900 KB. Divida em arquivos menores." };

  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  try {
    const abas = await readXlsxFile(conteudo);
    return {
      nome: arquivo.name,
      hash: createHash("sha256").update(conteudo).digest("hex"),
      planilha: lerPlanilha(abas.map((a) => ({ nome: a.sheet, linhas: a.data as never })),),
    };
  } catch {
    return { erro: "Não conseguimos abrir o arquivo. Confira se é uma planilha .xlsx e se não está protegida por senha." };
  }
}
