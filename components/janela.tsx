"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cx } from "@/lib/classes";

/**
 * Janela (diálogo) centralizada, com o fundo escurecido.
 * Usa o <dialog> do navegador: fecha com Esc, prende o foco dentro dela e
 * fecha também com um clique fora.
 */
export function Janela({
  aberta,
  aoFechar,
  rotulo,
  noTopo = false,
  largura = "max-w-md",
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  /** Nome da janela para leitores de tela. */
  rotulo: string;
  /** No alto da tela (busca rápida), em vez de no centro. */
  noTopo?: boolean;
  largura?: string;
  children: ReactNode;
}) {
  const janela = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = janela.current;
    if (!el) return;
    if (aberta && !el.open) el.showModal();
    if (!aberta && el.open) el.close();
  }, [aberta]);

  return (
    <dialog
      ref={janela}
      aria-label={rotulo}
      onClose={aoFechar}
      onClick={(e) => {
        // Clique no fundo escuro (fora do conteúdo) fecha.
        if (e.target === e.currentTarget) aoFechar();
      }}
      className={cx(
        "w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-janela backdrop:bg-gray-900/30 open:animate-aparecer",
        largura,
        noTopo ? "mx-auto mt-24 mb-auto" : "m-auto",
      )}
    >
      {aberta ? children : null}
    </dialog>
  );
}

/** Conteúdo padrão de uma confirmação: título, texto e botões à direita. */
export function Confirmacao({ titulo, texto, botoes }: { titulo: string; texto: ReactNode; botoes: ReactNode }) {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold">{titulo}</h2>
      <div className="mt-2 text-gray-600">{texto}</div>
      <div className="mt-6 flex justify-end gap-2">{botoes}</div>
    </div>
  );
}
