import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "./botao";
import { BuscaRapida } from "./busca-rapida";
import { BotaoVerInventario } from "./botao-ver-inventario";

/** Os três botões do topo: Ver inventário, Editar item e + Novo item (o único azul). */
export function AcoesDoTopo() {
  return (
    <div className="order-last flex w-full flex-wrap items-center gap-2 sm:order-none sm:ml-auto sm:w-auto">
      {/* O botão sabe em que página está; até saber, aparece sem destaque. */}
      <Suspense fallback={<BotaoVerInventario marcado={false} />}>
        <BotaoVerInventario />
      </Suspense>
      <BuscaRapida />
      <Link href="/inventario/novo" className={classesDoBotao("primario", "gap-1.5")}>
        <Plus aria-hidden="true" />
        Novo item
      </Link>
    </div>
  );
}
