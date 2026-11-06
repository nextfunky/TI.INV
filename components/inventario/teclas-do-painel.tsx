"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Atalhos do painel lateral: Esc fecha; ↑ e ↓ abrem o item de cima ou de baixo.
 * Não atrapalham quem está digitando num campo ou com uma janela aberta.
 *
 * As setas trocam o endereço sem criar uma entrada nova no histórico (o Voltar do
 * navegador sai da lista, em vez de passar item por item). E apertar várias vezes
 * seguidas conta todas, mesmo antes de a tela terminar de carregar.
 */
export function TeclasDoPainel({ fechar, enderecos = [], atual = -1 }: { fechar: string; enderecos?: string[]; atual?: number }) {
  const router = useRouter();
  const posicao = useRef(atual);

  // Quando a tela chega no item novo, a contagem parte dele.
  useEffect(() => {
    posicao.current = atual;
  }, [atual]);

  useEffect(() => {
    function aoApertar(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        router.push(fechar, { scroll: false });
        return;
      }
      const passo = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (!passo || posicao.current < 0) return;
      const nova = posicao.current + passo;
      if (nova < 0 || nova >= enderecos.length) return;
      e.preventDefault();
      posicao.current = nova;
      router.replace(enderecos[nova], { scroll: false });
    }
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [router, fechar, enderecos]);

  return null;
}
