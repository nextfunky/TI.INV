"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SEM_VALOR, type FiltroDeCaracteristicaNaTela } from "@/lib/caracteristicas/filtros";
import { cx } from "@/lib/classes";
import { enderecoDoInventario, type FiltrosDoInventario } from "@/lib/itens/filtros";
import { CATEGORIAS, CONDICOES, NOME_DA_CATEGORIA, NOME_DA_CONDICAO, type Categoria, type Condicao } from "@/lib/itens/valores";
import { comOsParametros } from "@/lib/resumo/tabela";

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

/** Um filtro por característica: as opções, mais "Não informado". Um valor que veio do endereço e não está nas opções continua visível. */
export function SelecaoDeCaracteristica({
  caracteristica: c,
  valor,
  aoMudar,
}: {
  caracteristica: FiltroDeCaracteristicaNaTela;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <Selecao
      id={`filtro-caracteristica-${c.id}`}
      name={`c${c.id}`}
      rotulo={c.nome}
      ativa={Boolean(valor)}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
    >
      <option value="">{c.nome}: todos</option>
      {c.opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
      {valor && valor !== SEM_VALOR && !c.opcoes.some((o) => o.valor === valor) ? <option value={valor}>{valor}</option> : null}
      <option value={SEM_VALOR}>Não informado</option>
    </Selecao>
  );
}

/**
 * Busca na lista e os filtros de categoria, tipo, características do tipo,
 * condição e local. Escolher na lista já aplica o filtro; a busca vale ao
 * apertar Enter. Sem JavaScript, o formulário também funciona (com o botão
 * "Filtrar").
 */
export function BuscaESelecoes({
  filtros,
  tipos,
  locais,
  caracteristicas,
  manter,
}: {
  filtros: FiltrosDoInventario;
  tipos: TipoNaLista[];
  locais: Array<{ id: number; caminho: string }>;
  caracteristicas: FiltroDeCaracteristicaNaTela[];
  manter: Record<string, string>;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(filtros.busca ?? "");

  function aplicar(mudanca: Partial<FiltrosDoInventario>) {
    const endereco = enderecoDoInventario({ ...filtros, busca: busca.trim() || undefined, pagina: 1, ...mudanca });
    // Trocar de tipo muda as características: elas saem, e o cruzamento do Resumo volta ao padrão.
    const trocouDeTipo = "tipo" in mudanca && mudanca.tipo !== filtros.tipo;
    router.push(comOsParametros(endereco, trocouDeTipo ? (manter.visao ? { visao: manter.visao } : {}) : manter));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aplicar({});
  }

  return (
    <form action="/inventario" method="get" onSubmit={aoEnviar} role="search" className="flex flex-wrap items-center gap-2">
      {/* Para funcionar sem JavaScript, os outros filtros vão junto. */}
      {filtros.status ? <input type="hidden" name="status" value={filtros.status} /> : null}
      {filtros.pessoa ? <input type="hidden" name="pessoa" value={filtros.pessoa} /> : null}
      {Object.entries(manter).map(([chave, valor]) => (
        <input key={chave} type="hidden" name={chave} value={valor} />
      ))}

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
              router.push(comOsParametros(enderecoDoInventario({ ...filtros, busca: undefined, pagina: 1 }), manter));
            }}
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>

      <Selecao
        id="filtro-categoria"
        name="categoria"
        rotulo="Categoria"
        ativa={Boolean(filtros.categoria)}
        value={filtros.categoria ?? ""}
        onChange={(e) => {
          const categoria = (e.target.value || undefined) as Categoria | undefined;
          // O tipo escolhido sai se não for da categoria nova.
          const tipoContinua = !categoria || tipos.find((t) => t.id === filtros.tipo)?.categoria === categoria;
          aplicar({ categoria, tipo: tipoContinua ? filtros.tipo : undefined, caracteristicas: tipoContinua ? filtros.caracteristicas : {} });
        }}
      >
        <option value="">Todas as categorias</option>
        {CATEGORIAS.filter((c) => tipos.some((t) => t.categoria === c)).map((c) => (
          <option key={c} value={c}>
            {NOME_DA_CATEGORIA[c].filtro}
          </option>
        ))}
      </Selecao>

      <Selecao
        id="filtro-tipo"
        name="tipo"
        rotulo="Tipo"
        ativa={Boolean(filtros.tipo)}
        value={filtros.tipo ?? ""}
        onChange={(e) => aplicar({ tipo: e.target.value ? Number(e.target.value) : undefined, caracteristicas: {} })}
      >
        <option value="">Todos os tipos</option>
        {CATEGORIAS.filter((c) => !filtros.categoria || c === filtros.categoria).map((c) => {
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

      {caracteristicas.map((c) => (
        <SelecaoDeCaracteristica
          key={c.id}
          caracteristica={c}
          valor={filtros.caracteristicas?.[c.id] ?? ""}
          aoMudar={(valor) => aplicar({ caracteristicas: { ...filtros.caracteristicas, [c.id]: valor } })}
        />
      ))}

      <Selecao
        id="filtro-condicao"
        name="condicao"
        rotulo="Condição"
        ativa={Boolean(filtros.condicao)}
        value={filtros.condicao ?? ""}
        onChange={(e) => aplicar({ condicao: (e.target.value || undefined) as Condicao | "nenhuma" | undefined })}
      >
        <option value="">Qualquer condição</option>
        {CONDICOES.map((c) => (
          <option key={c} value={c}>
            {NOME_DA_CONDICAO[c]}
          </option>
        ))}
        <option value="nenhuma">Não informada</option>
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
