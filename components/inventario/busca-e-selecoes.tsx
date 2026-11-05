"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { cx } from "@/lib/classes";
import { enderecoDoInventario, type FiltrosDoInventario } from "@/lib/itens/filtros";
import { CATEGORIAS, CONDICOES, NOME_DA_CATEGORIA, NOME_DA_CONDICAO, type Categoria, type Condicao } from "@/lib/itens/valores";

export type TipoNaLista = { id: number; nome: string; categoria: Categoria };

const PILULA =
  "h-8 cursor-pointer appearance-none rounded-full border bg-white pr-8 pl-3 text-13 transition-colors duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/12";

export function Selecao({
  id,
  rotulo,
  ativa,
  ...props
}: React.ComponentProps<"select"> & { id: string; rotulo: string; ativa: boolean }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <select
        id={id}
        className={cx(
          PILULA,
          "max-w-72",
          ativa ? "border-accent bg-accent-suave text-accent" : "border-gray-200 text-gray-600 hover:border-gray-300",
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2",
          ativa ? "text-accent" : "text-gray-500",
        )}
      />
    </div>
  );
}

/**
 * Busca na lista e os filtros de tipo e condição. Escolher na lista já aplica
 * o filtro; a busca vale ao apertar Enter. Sem JavaScript, o formulário
 * também funciona (com o botão "Filtrar").
 */
export function BuscaESelecoes({
  filtros,
  tipos,
  locais,
}: {
  filtros: FiltrosDoInventario;
  tipos: TipoNaLista[];
  locais: Array<{ id: number; caminho: string }>;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(filtros.busca ?? "");

  function aplicar(mudanca: Partial<FiltrosDoInventario>) {
    router.push(enderecoDoInventario({ ...filtros, busca: busca.trim() || undefined, pagina: 1, ...mudanca }));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aplicar({});
  }

  return (
    <form action="/inventario" method="get" onSubmit={aoEnviar} role="search" className="flex flex-wrap items-center gap-2">
      {/* Para funcionar sem JavaScript, os outros filtros vão junto. */}
      {filtros.categoria ? <input type="hidden" name="categoria" value={filtros.categoria} /> : null}
      {filtros.status ? <input type="hidden" name="status" value={filtros.status} /> : null}
      {filtros.pessoa ? <input type="hidden" name="pessoa" value={filtros.pessoa} /> : null}

      <div className="relative w-full sm:w-auto">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
        <label htmlFor="busca-na-lista" className="sr-only">
          Buscar na lista
        </label>
        <input
          id="busca-na-lista"
          name="q"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Código, marca, pessoa…"
          className={cx(
            "h-8 w-full rounded-full border sm:w-64 bg-white pr-8 pl-9 text-13 transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-4 focus:ring-accent/12 focus:outline-none [&::-webkit-search-cancel-button]:hidden",
            filtros.busca ? "border-accent" : "border-gray-200 hover:border-gray-300",
          )}
        />
        {filtros.busca ? (
          <button
            type="button"
            aria-label="Limpar a busca"
            onClick={() => {
              setBusca("");
              router.push(enderecoDoInventario({ ...filtros, busca: undefined, pagina: 1 }));
            }}
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>

      <Selecao
        id="filtro-tipo"
        name="tipo"
        rotulo="Tipo"
        ativa={Boolean(filtros.tipo)}
        value={filtros.tipo ?? ""}
        onChange={(e) => aplicar({ tipo: e.target.value ? Number(e.target.value) : undefined })}
      >
        <option value="">Todos os tipos</option>
        {CATEGORIAS.map((c) => {
          const doGrupo = tipos.filter((t) => t.categoria === c);
          if (!doGrupo.length) return null;
          return (
            <optgroup key={c} label={NOME_DA_CATEGORIA[c].filtro}>
              {doGrupo.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </optgroup>
          );
        })}
      </Selecao>

      <Selecao
        id="filtro-condicao"
        name="condicao"
        rotulo="Condição"
        ativa={Boolean(filtros.condicao)}
        value={filtros.condicao ?? ""}
        onChange={(e) => aplicar({ condicao: (e.target.value || undefined) as Condicao | undefined })}
      >
        <option value="">Qualquer condição</option>
        {CONDICOES.map((c) => (
          <option key={c} value={c}>
            {NOME_DA_CONDICAO[c]}
          </option>
        ))}
      </Selecao>

      <Selecao
        id="filtro-local"
        name="local"
        rotulo="Local"
        ativa={Boolean(filtros.local)}
        value={filtros.local ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          aplicar({ local: v === "sem" ? "sem" : v ? Number(v) : undefined });
        }}
      >
        <option value="">Todos os locais</option>
        <option value="sem">Sem local definido</option>
        {locais.map((l) => (
          <option key={l.id} value={l.id}>
            {l.caminho}
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
