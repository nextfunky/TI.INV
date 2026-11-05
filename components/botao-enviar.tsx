"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { classesDoBotao, type VarianteDoBotao } from "./botao";

/** Botão de enviar formulário. Enquanto o servidor responde, mostra o texto de espera. */
export function BotaoEnviar({
  children,
  enviando,
  variante = "primario",
  className,
}: {
  children: ReactNode;
  enviando: string;
  variante?: VarianteDoBotao;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-disabled={pending}
      onClick={(e) => pending && e.preventDefault()}
      className={classesDoBotao(variante, className)}
    >
      {pending ? enviando : children}
    </button>
  );
}
