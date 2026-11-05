import type { ReactNode } from "react";

/**
 * Barra presa na borda de baixo da tela, nos formulários longos.
 * À esquerda a ação de perigo (se houver); à direita, Salvar por último.
 */
export function BarraDeAcoes({ esquerda, children }: { esquerda?: ReactNode; children: ReactNode }) {
  return (
    <>
      {/* Espaço para a barra não cobrir o último campo. */}
      <div aria-hidden="true" className="h-20" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
          <div className="mr-auto">{esquerda}</div>
          {children}
        </div>
      </div>
    </>
  );
}
