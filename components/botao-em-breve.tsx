import type { ReactNode } from "react";

import { classesDoBotao, type VarianteDoBotao } from "./botao";

/**
 * Botão que já aparece no lugar certo, mas ainda não funciona.
 * Fica apagado e, ao passar o mouse ou focar pelo teclado, avisa quando chega.
 */
export function BotaoEmBreve({
  id,
  children,
  quando,
  variante = "secundario",
}: {
  id: string;
  children: ReactNode;
  quando: string;
  variante?: VarianteDoBotao;
}) {
  const idDaDica = `${id}-dica`;
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={idDaDica}
        className={classesDoBotao(variante, "cursor-not-allowed opacity-50")}
      >
        {children}
      </button>
      <span
        id={idDaDica}
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 z-40 mt-2 rounded-md bg-gray-900 px-2 py-1 text-12 whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {quando}
      </span>
    </span>
  );
}
