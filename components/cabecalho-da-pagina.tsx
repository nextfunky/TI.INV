import type { ReactNode } from "react";

/** Título da página (24px) com a frase de apoio em cinza logo abaixo. */
export function CabecalhoDaPagina({ titulo, subtitulo }: { titulo: ReactNode; subtitulo?: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">{titulo}</h1>
      {subtitulo ? <p className="mt-1 text-gray-500">{subtitulo}</p> : null}
    </div>
  );
}

/** Espaço reservado enquanto o cabeçalho carrega (evita que a tela pule). */
export function CabecalhoCarregando() {
  return (
    <div aria-hidden="true">
      <div className="h-8 w-40 rounded-md bg-gray-100" />
      <div className="mt-1 h-5 w-56 rounded-md bg-gray-100" />
    </div>
  );
}
