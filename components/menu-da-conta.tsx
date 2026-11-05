"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { sair } from "@/lib/auth/acoes";
import { iniciais } from "@/lib/texto/iniciais";

const ITEM =
  "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-gray-900 transition-colors duration-150 hover:bg-gray-50";

/** O avatar no canto do topo e o painel com "Alterar senha" e "Sair". */
export function MenuDaConta({ usuario }: { usuario: string }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const idDoPainel = useId();
  const pathname = usePathname();

  // Fecha ao trocar de página.
  const [paginaAnterior, setPaginaAnterior] = useState(pathname);
  if (pathname !== paginaAnterior) {
    setPaginaAnterior(pathname);
    setAberto(false);
  }

  // Fecha com Esc ou com um clique fora do painel.
  useEffect(() => {
    if (!aberto) return;
    function aoClicar(e: PointerEvent) {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    }
    document.addEventListener("pointerdown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative sm:order-last sm:ml-1">
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls={idDoPainel}
        aria-label={`Conta: ${usuario}`}
        onClick={() => setAberto((a) => !a)}
        className="flex size-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-12 font-semibold text-gray-700 transition-colors duration-150 hover:border-gray-300"
      >
        {iniciais(usuario)}
      </button>

      <div
        id={idDoPainel}
        hidden={!aberto}
        className="absolute top-full right-0 z-40 mt-2 w-56 animate-aparecer rounded-xl border border-gray-200 bg-white p-1.5 shadow-menu"
      >
        <p className="px-3 pt-1.5 pb-2 text-13 text-gray-500">
          Conectado como <span className="font-medium break-words text-gray-900">{usuario}</span>
        </p>
        <Link href="/configuracoes/senha" className={ITEM}>
          Alterar senha
        </Link>
        <div className="my-1.5 border-t border-gray-100" />
        <form action={sair}>
          <button type="submit" className={ITEM}>
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
