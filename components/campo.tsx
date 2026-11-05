import type { ComponentProps } from "react";

import { cx } from "@/lib/classes";

const CLASSES_DO_CAMPO =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-4";

/**
 * Campo de texto com rótulo, dica e erro, ligados entre si para os
 * leitores de tela (aria-describedby / aria-invalid).
 */
export function CampoTexto({
  id,
  rotulo,
  dica,
  erro,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; rotulo: string; dica?: string; erro?: string }) {
  const idDaDica = dica && !erro ? `${id}-dica` : undefined;
  const idDoErro = erro ? `${id}-erro` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-13 font-medium text-gray-700">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={cx(idDoErro, idDaDica) || undefined}
        className={cx(
          CLASSES_DO_CAMPO,
          erro
            ? "border-descartado focus:border-descartado focus:ring-descartado/10"
            : "border-gray-300 focus:border-accent focus:ring-accent/12",
        )}
        {...props}
      />
      {erro ? (
        <p id={idDoErro} className="mt-1.5 text-13 text-descartado">
          {erro}
        </p>
      ) : null}
      {dica && !erro ? (
        <p id={idDaDica} className="mt-1.5 text-13 text-gray-500">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

/** Faixa vermelha no topo do formulário. */
export function FaixaDeErro({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-13 text-red-700">
      {children}
    </div>
  );
}
