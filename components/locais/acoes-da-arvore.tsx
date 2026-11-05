"use client";

import Link from "next/link";
import { useState } from "react";

import { ExcluirLocal } from "./formulario";

const ACAO =
  "rounded-md px-2 py-1 text-13 font-medium transition-[color,background-color,opacity] duration-150 hover:bg-gray-100";

/**
 * As ações de cada linha da árvore: "+ Dentro", "Editar" e "Excluir" (só nos
 * vazios). No computador aparecem ao passar o mouse; no celular, sempre.
 */
export function AcoesDaArvore({ id, caminho, vazio }: { id: number; caminho: string; vazio: boolean }) {
  const [excluindo, setExcluindo] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
      <Link href={`/locais/novo?pai=${id}`} className={`${ACAO} text-accent`}>
        + Dentro
      </Link>
      <Link href={`/locais/${id}/editar`} className={`${ACAO} text-gray-600 hover:text-gray-900`}>
        Editar
      </Link>
      {vazio ? (
        <>
          <button type="button" onClick={() => setExcluindo(true)} className={`${ACAO} text-descartado hover:bg-red-50`}>
            Excluir
          </button>
          <ExcluirLocal id={id} caminho={caminho} aberta={excluindo} aoFechar={() => setExcluindo(false)} />
        </>
      ) : null}
    </div>
  );
}
