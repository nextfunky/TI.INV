import type { ComponentProps } from "react";

import { cx } from "@/lib/classes";

export type VarianteDoBotao = "primario" | "secundario" | "fantasma" | "perigo" | "perigoSolido";

const BASE =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors duration-150 [&_svg]:size-4 [&_svg]:shrink-0";

const VARIANTES: Record<VarianteDoBotao, string> = {
  primario: "bg-accent text-white hover:bg-accent-hover",
  secundario: "border border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50",
  fantasma: "text-accent hover:bg-gray-100",
  perigo: "text-descartado hover:bg-red-50",
  perigoSolido: "bg-descartado text-white hover:bg-red-700",
};

/** As classes de um botão, para usar também em links (<Link className={...}>). */
export function classesDoBotao(variante: VarianteDoBotao = "secundario", extra?: string) {
  return cx(BASE, VARIANTES[variante], "disabled:pointer-events-none disabled:opacity-60", extra);
}

type PropsDoBotao = ComponentProps<"button"> & { variante?: VarianteDoBotao };

export function Botao({ variante = "secundario", className, type = "button", ...props }: PropsDoBotao) {
  return <button type={type} className={classesDoBotao(variante, className)} {...props} />;
}
