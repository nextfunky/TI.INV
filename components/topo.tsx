import Link from "next/link";
import { Suspense } from "react";

import { exigirSessao } from "@/lib/auth/sessao";

import { AcoesDoTopo } from "./acoes-do-topo";
import { Logo } from "./logo";
import { MenuDaConta } from "./menu-da-conta";
import { MenuPrincipal } from "./menu-principal";

/**
 * O topo de todas as telas (menos o Login).
 * O menu principal (Colaboradores, Locais...) só ganha itens quando as telas
 * existirem, para não haver link que leva a lugar nenhum.
 */
export function Topo() {
  return (
    <header className="border-b border-gray-200 bg-white">
      {/* No celular: logo e avatar na primeira linha, os botões embaixo. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2.5 px-6 py-2.5 lg:group-has-[[data-painel]]/app:max-w-[1600px]">
        <Link href="/" className="mr-auto flex items-center gap-2 text-sm font-semibold text-gray-900 sm:mr-4">
          <Logo />
          Inventário de TI
        </Link>

        <Suspense fallback={<MenuPrincipal marcar={false} />}>
          <MenuPrincipal />
        </Suspense>

        <Suspense fallback={<div className="size-8 rounded-full border border-gray-200 bg-gray-100 sm:order-last sm:ml-1" />}>
          <Conta />
        </Suspense>

        <AcoesDoTopo />
      </div>
    </header>
  );
}

async function Conta() {
  const sessao = await exigirSessao();
  return <MenuDaConta usuario={sessao.usuario} />;
}
