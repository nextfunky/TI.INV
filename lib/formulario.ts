import type { z } from "zod";

/** O que uma ação de formulário devolve para a tela quando algo precisa ser corrigido. */
export type EstadoDoFormulario = {
  /** Erro de cada campo: { usuario: "Informe o usuário." } */
  erros?: Record<string, string>;
  /** Erro que vale para o formulário todo, mostrado na faixa vermelha. */
  erroGeral?: string;
  /** Valores para manter preenchidos (nunca as senhas). */
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoDoFormulario = {};

/** Transforma os erros do Zod em { campo: "mensagem" }, com o primeiro erro de cada campo. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const problema of erro.issues) {
    const campo = String(problema.path[0] ?? "");
    if (campo && !erros[campo]) erros[campo] = problema.message;
  }
  return erros;
}

/** Lê os campos de texto de um formulário. Campos ausentes viram "". */
export function lerFormulario<const K extends string>(dados: FormData, campos: readonly K[]) {
  const valores = {} as Record<K, string>;
  for (const campo of campos) {
    const valor = dados.get(campo);
    valores[campo] = typeof valor === "string" ? valor : "";
  }
  return valores;
}
