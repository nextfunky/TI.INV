"use client";

import { useEffect, useRef } from "react";

import type { EstadoDoFormulario } from "@/lib/formulario";

/**
 * Depois de enviar, se algo precisa ser corrigido, leva o cursor ao
 * primeiro campo com erro (ou, num erro geral, ao campo indicado).
 */
export function useFocarErro(estado: EstadoDoFormulario, seErroGeral?: string) {
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formulario.current;
    if (!form) return;
    const alvo =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      (estado.erroGeral && seErroGeral ? form.querySelector<HTMLElement>(seErroGeral) : null);
    alvo?.focus();
  }, [estado, seErroGeral]);

  return formulario;
}
