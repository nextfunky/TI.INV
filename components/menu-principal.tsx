"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/lib/classes";

/**
 * O menu principal do topo. Só tem as telas que já existem: Mapa e Relatórios
 * entram quando ficarem prontos, para não haver link que leva a lugar nenhum.
 */
const TELAS = [
  { href: "/colaboradores", rotulo: "Colaboradores" },
  { href: "/locais", rotulo: "Locais" },
];

export function MenuPrincipal({ marcar = true }: { marcar?: boolean }) {
  return marcar ? <ComPagina /> : <Links atual={null} />;
}

function ComPagina() {
  return <Links atual={usePathname()} />;
}

function Links({ atual }: { atual: string | null }) {
  return (
    <nav aria-label="Principal" className="flex flex-wrap gap-1">
      {TELAS.map(({ href, rotulo }) => {
        const ativa = atual === href || Boolean(atual?.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativa ? "page" : undefined}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm transition-colors duration-150",
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
