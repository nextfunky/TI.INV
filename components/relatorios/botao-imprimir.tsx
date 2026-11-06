"use client";

import { Printer } from "lucide-react";

import { classesDoBotao } from "../botao";

/** Abre a janela de impressão do navegador (lá também dá para "Salvar como PDF"). */
export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={classesDoBotao("primario")}>
      <Printer aria-hidden="true" />
      Imprimir / Salvar PDF
    </button>
  );
}
