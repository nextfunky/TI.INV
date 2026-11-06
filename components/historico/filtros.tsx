"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { cx } from "@/lib/classes";
import { enderecoDoHistorico, type FiltrosDoHistorico } from "@/lib/historico/filtros";
import { EVENTOS, NOME_DO_EVENTO, type Evento } from "@/lib/historico/valores";

import { Selecao } from "../inventario/busca-e-selecoes";

/** Busca e filtro por evento na tela Histórico. */
export function FiltrosDoHistoricoNaTela({ filtros }: { filtros: FiltrosDoHistorico }) {
  const router = useRouter();
  const [busca, setBusca] = useState(filtros.busca ?? "");
  const aplicar = (m: Partial<FiltrosDoHistorico>) => router.push(enderecoDoHistorico({ ...filtros, busca: busca.trim() || undefined, pagina: 1, ...m }));

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aplicar({});
  }

  return (
    <form action="/historico" method="get" onSubmit={aoEnviar} role="search" className="flex flex-wrap items-center gap-2">
      {filtros.item ? <input type="hidden" name="item" value={filtros.item} /> : null}
      <div className="relative w-full sm:w-auto">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
        <label htmlFor="busca-no-historico" className="sr-only">
          Buscar no histórico
        </label>
        <input
          id="busca-no-historico"
          name="q"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Código, pessoa, local…"
          className={cx(
            "h-8 w-full rounded-full border bg-white pr-3 pl-9 text-13 transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-4 focus:ring-accent/12 focus:outline-none sm:w-64",
            filtros.busca ? "border-accent" : "border-gray-200 hover:border-gray-300",
          )}
        />
      </div>
      <Selecao
        id="filtro-evento"
        name="evento"
        rotulo="Evento"
        ativa={Boolean(filtros.evento)}
        value={filtros.evento ?? ""}
        onChange={(e) => aplicar({ evento: (e.target.value || undefined) as Evento | undefined })}
      >
        <option value="">Todos os eventos</option>
        {EVENTOS.map((e) => (
          <option key={e} value={e}>
            {NOME_DO_EVENTO[e]}
          </option>
        ))}
      </Selecao>
      {filtros.item ? (
        <Link
          href={enderecoDoHistorico({ ...filtros, item: undefined, pagina: 1 })}
          aria-label={`Tirar o filtro: só ${filtros.item}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-accent bg-accent-suave px-3 font-mono text-13 text-accent"
        >
          {filtros.item}
          <X aria-hidden="true" className="size-3.5" />
        </Link>
      ) : null}
      <noscript>
        <button type="submit" className="h-8 rounded-full border border-gray-200 bg-white px-3 text-13">
          Filtrar
        </button>
      </noscript>
    </form>
  );
}
