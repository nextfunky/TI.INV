import { z } from "zod";

/** Os campos dos formulários de conta, com as mensagens que aparecem na tela. */

const usuario = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe o usuário.")
  .min(3, "Use pelo menos 3 caracteres.")
  .max(40, "Use no máximo 40 caracteres.")
  .regex(/^[a-z0-9._-]+$/, "Use só letras sem acento, números, ponto, hífen ou sublinhado.");

const novaSenha = z
  .string()
  .min(1, "Informe a senha.")
  .min(8, "Use no mínimo 8 caracteres.")
  .max(200, "Use no máximo 200 caracteres.");

const SENHAS_DIFERENTES = "As senhas não são iguais.";

export const regrasPrimeiroAcesso = z
  .object({
    usuario,
    senha: novaSenha,
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { path: ["confirmacao"], message: SENHAS_DIFERENTES });

export const regrasEntrar = z.object({
  usuario: z.string().trim().toLowerCase().min(1, "Informe o usuário."),
  senha: z.string().min(1, "Informe a senha."),
});

export const regrasAlterarSenha = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual."),
    novaSenha,
    confirmacao: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmacao, { path: ["confirmacao"], message: SENHAS_DIFERENTES });

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
