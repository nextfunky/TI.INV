import type { ReactNode } from "react";

/** O cartão branco das telas sem login. */
export function CartaoPublico({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-login">{children}</div>;
}

/** Espaço reservado com a altura do cartão, enquanto ele carrega. */
export function CartaoCarregando({ altura = "h-64" }: { altura?: string }) {
  return (
    <div aria-hidden="true" className={`${altura} rounded-2xl border border-gray-200 bg-white shadow-login`} />
  );
}

export function NotaDeRodape({ children }: { children: ReactNode }) {
  return <p className="text-center text-12 text-gray-500">{children}</p>;
}
