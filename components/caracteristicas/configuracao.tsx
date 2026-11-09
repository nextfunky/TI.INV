import { ArrowDown, ArrowUp, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { reordenarCaracteristica } from "@/lib/caracteristicas/acoes";
import type { CaracteristicaCompleta } from "@/lib/caracteristicas/servico";

import { classesDoBotao } from "../botao";

/** "Lista: Preto, Ciano, Magenta" · "Número (m)" · "Texto livre". */
function descricao(c: CaracteristicaCompleta): string {
  if (c.tipo === "lista") return `Lista: ${c.opcoes.join(", ")}`;
  if (c.tipo === "numero") return c.unidade ? `Número (${c.unidade})` : "Número";
  return "Texto livre";
}

/**
 * As características de um tipo de item ou de um grupo de material, em
 * Configurações: a ordem (↑/↓), o link para editar e o "+ Nova característica".
 */
export function CaracteristicasNaConfiguracao({
  caracteristicas,
  novaHref,
  nomeDoDono,
}: {
  caracteristicas: CaracteristicaCompleta[];
  /** /configuracoes/caracteristicas/nova?tipo=3 (ou ?grupo=cabos). */
  novaHref: string;
  nomeDoDono: string;
}) {
  const BOTAO = "flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <section aria-labelledby="titulo-caracteristicas" className="max-w-lg">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-caracteristicas" className="text-base font-semibold">
            Características
          </h2>
          <p className="mt-0.5 text-13 text-gray-500">
            Campos próprios de {nomeDoDono}: aparecem no cadastro, na lista, nos filtros e no Resumo.
          </p>
        </div>
        <Link href={novaHref} className={classesDoBotao("secundario")}>
          <Plus aria-hidden="true" />
          Nova característica
        </Link>
      </div>
      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        {caracteristicas.length ? (
          <ul className="divide-y divide-gray-100">
            {caracteristicas.map((c, i) => (
              <li key={c.id} className="flex items-center gap-1 py-1.5 pr-2 pl-1">
                <div className="flex shrink-0">
                  <form action={reordenarCaracteristica.bind(null, c.id, "subir")}>
                    <button type="submit" aria-label={`Subir ${c.nome}`} disabled={i === 0} className={BOTAO}>
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </button>
                  </form>
                  <form action={reordenarCaracteristica.bind(null, c.id, "descer")}>
                    <button type="submit" aria-label={`Descer ${c.nome}`} disabled={i === caracteristicas.length - 1} className={BOTAO}>
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </button>
                  </form>
                </div>
                <Link
                  href={`/configuracoes/caracteristicas/${c.id}`}
                  className="group flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-1.5 transition-colors duration-150 hover:bg-gray-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.nome}</span>
                    <span className="block truncate text-13 text-gray-500">{descricao(c)}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-300 transition-colors duration-150 group-hover:text-gray-500" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-5 text-sm text-gray-500">Nenhuma característica ainda. Ex.: a cor, o tamanho, o tipo de conexão.</p>
        )}
      </div>
    </section>
  );
}
