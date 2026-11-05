import { Plus } from "lucide-react";
import Link from "next/link";

import { classesDoBotao } from "./botao";
import { BuscaRapida } from "./busca-rapida";

/** A busca ("Buscar item…", Ctrl+K) e o + Novo item, o único botão azul. No celular, só os ícones. */
export function AcoesDoTopo() {
  return (
    <>
      <BuscaRapida />
      <Link href="/inventario/novo" aria-label="Novo item" className={classesDoBotao("primario", "gap-1.5 max-sm:w-9 max-sm:px-0")}>
        <Plus aria-hidden="true" />
        <span className="max-sm:hidden">Novo item</span>
      </Link>
    </>
  );
}
