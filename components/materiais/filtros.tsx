"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { cx } from "@/lib/classes";
import { enderecoDosMateriais, type FiltrosDosMateriais } from "@/lib/materiais/filtros";
import { GRUPOS, NOME_DO_GRUPO, type Grupo } from "@/lib/materiais/valores";

import { Selecao } from "../inventario/busca-e-selecoes";

/** Busca e filtro por grupo na lista de materiais. Escolher o grupo já aplica; a busca vale ao apertar Enter. */
export function FiltrosDosMateriaisNaTela({ filtros }: { filtros: FiltrosDosMateriais }) {
  const router = useRouter();
  const [busca, setBusca] = useState(filtros.busca ?? "");

  function aplicar(mudanca: Partial<FiltrosDosMateriais>) {
    router.push(enderecoDosMateriais({ ...filtros, busca: busca.trim() || undefined, ...mudanca }));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aplicar({});
  }

  return (
    <form action="/materiais" method="get" onSubmit={aoEnviar} role="search" className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-auto">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
        <label htmlFor="busca-de-materiais" className="sr-only">
          Buscar materiais
        </label>
        <input
          id="busca-de-materiais"
          name="q"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome, marca, local…"
          className={cx(
            "h-8 w-full rounded-full border bg-white pr-8 pl-9 text-13 transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-4 focus:ring-accent/12 focus:outline-none sm:w-64 [&::-webkit-search-cancel-button]:hidden",
            filtros.busca ? "border-accent" : "border-gray-200 hover:border-gray-300",
          )}
        />
        {filtros.busca ? (
          <button
            type="button"
            aria-label="Limpar a busca"
            onClick={() => {
              setBusca("");
              router.push(enderecoDosMateriais({ ...filtros, busca: undefined }));
            }}
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>

      <Selecao
        id="filtro-grupo"
        name="grupo"
        rotulo="Grupo"
        ativa={Boolean(filtros.grupo)}
        value={filtros.grupo ?? ""}
        onChange={(e) => aplicar({ grupo: (e.target.value || undefined) as Grupo | undefined })}
      >
        <option value="">Todos os grupos</option>
        {GRUPOS.map((g) => (
          <option key={g} value={g}>
            {NOME_DO_GRUPO[g]}
          </option>
        ))}
      </Selecao>

      <noscript>
        <button type="submit" className="h-8 rounded-full border border-gray-200 bg-white px-3 text-13">
          Filtrar
        </button>
      </noscript>
    </form>
  );
}
