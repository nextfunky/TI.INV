import { z } from "zod";

import { dataValida } from "@/lib/texto/data";

import { CATEGORIAS, STATUS } from "./valores";

/** Os campos dos formulários de item e de tipo, com as mensagens que aparecem na tela. */

const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres.`)
    .transform((v) => v || null);

const dataOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || dataValida(v), "Data inválida.")
  .transform((v) => v || null);

export const CAMPOS_DO_ITEM = [
  "tipoId",
  "marca",
  "modelo",
  "numeroSerie",
  "status",
  "hostname",
  "processador",
  "memoriaRam",
  "armazenamento",
  "sistemaOperacional",
  "dataCompra",
  "garantiaAte",
  "observacoes",
] as const;

export const CAMPOS_DE_COMPUTADOR = [
  "hostname",
  "processador",
  "memoriaRam",
  "armazenamento",
  "sistemaOperacional",
] as const;

export const regrasDoItem = z.object({
  tipoId: z
    .string()
    .regex(/^\d+$/, "Escolha o tipo.")
    .transform(Number),
  marca: textoOpcional(60),
  modelo: textoOpcional(100),
  numeroSerie: textoOpcional(100),
  status: z.enum(STATUS, { message: "Escolha o status." }),
  hostname: textoOpcional(63),
  processador: textoOpcional(100),
  memoriaRam: textoOpcional(30),
  armazenamento: textoOpcional(60),
  sistemaOperacional: textoOpcional(60),
  dataCompra: dataOpcional,
  garantiaAte: dataOpcional,
  observacoes: textoOpcional(5000),
});

export type DadosDoItem = z.output<typeof regrasDoItem>;

export const regrasDoTipo = z.object({
  nome: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1, "Informe o nome.").max(60, "Use no máximo 60 caracteres.")),
  categoria: z.enum(CATEGORIAS, { message: "Escolha a categoria." }),
});

/** Ao salvar, os espaços são tirados e as letras ficam maiúsculas. */
export const regrasDoPrefixo = z
  .string()
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2,5}$/, "Use de 2 a 5 letras, sem acento."));

export type DadosDoTipo = z.output<typeof regrasDoTipo>;
