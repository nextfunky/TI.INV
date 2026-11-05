"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Atalhos do painel lateral: Esc fecha; ↑ e ↓ abrem o item de cima ou de baixo.
 * Não atrapalham quem está digitando num campo ou com uma janela aberta.
 */
export function TeclasDoPainel({ fechar, anterior, proximo }: { fechar: string; anterior?: string; proximo?: string }) {
  const router = useRouter();

  useEffect(() => {
    function aoApertar(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector("dialog[open]")) return;
      const destino = e.key === "Escape" ? fechar : e.key === "ArrowDown" ? proximo : e.key === "ArrowUp" ? anterior : undefined;
      if (!destino) return;
      e.preventDefault();
      router.push(destino, { scroll: false });
    }
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [router, fechar, anterior, proximo]);

  return null;
}
