import { z } from "zod";

export { errosPorCampo, lerFormulario } from "@/lib/formulario";

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
