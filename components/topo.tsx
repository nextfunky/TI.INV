import Link from "next/link";
import { Suspense } from "react";

import { exigirSessao } from "@/lib/auth/sessao";

import { AcoesDoTopo } from "./acoes-do-topo";
import { Logo } from "./logo";
import { MenuDaConta } from "./menu-da-conta";
import { MenuMovel, MenuPrincipal } from "./menu-principal";

/**
 * O topo de todas as telas (menos o Login).
 * O menu principal (Colaboradores, Locais...) só ganha itens quando as telas
 * existirem, para não haver link que leva a lugar nenhum.
 */
export function Topo() {
  return (
    <header className="relative border-b border-gray-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-2.5 lg:group-has-[[data-painel]]/app:max-w-[1600px]">
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-2 text-sm font-semibold text-gray-900 xl:mr-4">
          <Logo />
          {/* Entre o celular e telas grandes, o nome sai para caber o menu. */}
          <span className="lg:max-xl:hidden">Inventário de TI</span>
        </Link>

        <Suspense fallback={<MenuPrincipal marcar={false} />}>
          <MenuPrincipal />
        </Suspense>

        <div className="ml-auto flex items-center gap-2">
          <AcoesDoTopo />
          <Suspense fallback={<div className="size-8 rounded-full border border-gray-200 bg-gray-100" />}>
            <Conta />
          </Suspense>
          <Suspense fallback={<div className="size-9 lg:hidden" />}>
            <MenuMovel />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function Conta() {
  const sessao = await exigirSessao();
  return <MenuDaConta usuario={sessao.usuario} />;
}
