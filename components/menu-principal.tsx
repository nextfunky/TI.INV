"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cx } from "@/lib/classes";

/**
 * As telas do sistema, na ordem de uso. Mapa e Relatórios entram quando
 * ficarem prontos, para não haver link que leva a lugar nenhum.
 */
const TELAS = [
  { href: "/", rotulo: "Início" },
  { href: "/inventario", rotulo: "Inventário" },
  { href: "/materiais", rotulo: "Materiais" },
  { href: "/colaboradores", rotulo: "Colaboradores" },
  { href: "/locais", rotulo: "Locais" },
  { href: "/historico", rotulo: "Histórico" },
];

function estaNaTela(atual: string | null, href: string): boolean {
  if (!atual) return false;
  return href === "/" ? atual === "/" : atual === href || atual.startsWith(`${href}/`);
}

/** O menu do computador (a partir de telas médias-grandes). No celular, quem mostra as telas é o ☰. */
export function MenuPrincipal({ marcar = true }: { marcar?: boolean }) {
  return marcar ? <ComPagina /> : <Links atual={null} />;
}

function ComPagina() {
  return <Links atual={usePathname()} />;
}

function Links({ atual }: { atual: string | null }) {
  return (
    <nav aria-label="Principal" className="hidden items-center gap-0.5 lg:flex">
      {TELAS.map(({ href, rotulo }) => {
        const ativa = estaNaTela(atual, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativa ? "page" : undefined}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
              ativa ? "bg-gray-100 font-medium text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

/** O ☰ do celular e de telas estreitas: abre a lista das telas logo abaixo do topo. */
export function MenuMovel() {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  // Fecha ao trocar de página.
  const [paginaAnterior, setPaginaAnterior] = useState(atual);
  if (atual !== paginaAnterior) {
    setPaginaAnterior(atual);
    setAberto(false);
  }

  // Fecha com Esc ou com um clique fora.
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
    <div ref={caixa} className="lg:hidden">
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls="menu-movel"
        aria-label={aberto ? "Fechar o menu" : "Abrir o menu"}
        onClick={() => setAberto((a) => !a)}
        className="flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors duration-150 hover:border-gray-300"
      >
        {aberto ? <X aria-hidden="true" className="size-4" /> : <Menu aria-hidden="true" className="size-4" />}
      </button>
      <nav
        id="menu-movel"
        aria-label="Principal"
        hidden={!aberto}
        className="absolute inset-x-0 top-full z-40 animate-aparecer border-b border-gray-200 bg-white px-4 py-2 shadow-menu"
      >
        {TELAS.map(({ href, rotulo }) => {
          const ativa = estaNaTela(atual, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativa ? "page" : undefined}
              className={cx(
                "block rounded-lg px-3 py-2.5 text-15 transition-colors duration-150",
                ativa ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700 hover:bg-gray-50",
              )}
            >
              {rotulo}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
