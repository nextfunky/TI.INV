import { z } from "zod";

import { CONDICOES } from "@/lib/itens/valores";

import { GRUPOS, QUANTIDADE_MAXIMA } from "./valores";

/** Os campos dos formulários de material e de movimento, com as mensagens que aparecem na tela. */

const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres.`)
    .transform((v) => v || null);

const idOpcional = (mensagem: string) =>
  z
    .string()
    .regex(/^\d*$/, mensagem)
    .transform((v) => (v ? Number(v) : null));

/** Um número inteiro, sem sinal, até o máximo. */
const quantidade = (mensagemVazia: string, minimo: 0 | 1) =>
  z
    .string()
    .trim()
    .min(1, mensagemVazia)
    .regex(/^\d+$/, "Use só números inteiros, sem vírgula.")
    .transform(Number)
    .refine((n) => n >= minimo, minimo === 1 ? "Informe uma quantidade maior que zero." : "Informe a quantidade.")
    .refine((n) => n <= QUANTIDADE_MAXIMA, `Use no máximo ${QUANTIDADE_MAXIMA.toLocaleString("pt-BR")}.`);

export const CAMPOS_DO_MATERIAL = ["nome", "marcaModelo", "compativelCom", "grupo", "localId", "condicao", "observacoes"] as const;

export const regrasDoMaterial = z.object({
  nome: z.string().trim().min(1, "Informe o nome do material.").max(100, "Use no máximo 100 caracteres."),
  marcaModelo: textoOpcional(100),
  compativelCom: textoOpcional(100),
  grupo: z.enum(GRUPOS, { message: "Escolha o grupo." }),
  localId: idOpcional("Escolha um local da lista."),
  condicao: z
    .union([z.enum(CONDICOES), z.literal("")], { message: "Escolha a condição." })
    .transform((v) => v || null),
  observacoes: textoOpcional(5000),
});

export type DadosDoMaterial = z.output<typeof regrasDoMaterial>;

/** No cadastro, vem junto a quantidade que já existe (vazio = 0). */
export const regrasDoNovoMaterial = regrasDoMaterial.extend({
  quantidade: z
    .string()
    .transform((v) => v.trim() || "0")
    .pipe(quantidade("Informe a quantidade.", 0)),
});

export const regrasDaEntrada = z.object({
  quantidade: quantidade("Informe quantos chegaram.", 1),
  observacao: textoOpcional(500),
});

export const regrasDaSaida = z.object({
  quantidade: quantidade("Informe quantos saíram.", 1),
  colaboradorId: idOpcional("Escolha uma pessoa da lista."),
  observacao: textoOpcional(500),
});

export const regrasDoAjuste = z.object({
  contagem: quantidade("Informe quantos você contou.", 0),
  observacao: textoOpcional(500),
});
