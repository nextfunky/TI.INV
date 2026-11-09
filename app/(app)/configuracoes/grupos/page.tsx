import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { exigirSessao } from "@/lib/auth/sessao";
import { resumoDosGrupos } from "@/lib/caracteristicas/configuracao";
import { obterBanco } from "@/lib/db";
import { NOME_DO_GRUPO } from "@/lib/materiais/valores";
import { plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Grupos de material" };

export default function PaginaGrupos() {
  return (
    <>
      <CabecalhoDaPagina
        titulo="Grupos de material"
        subtitulo="Os grupos são fixos. Em cada um, ajuste as características: a cor do toner, o comprimento do cabo…"
      />
      <div className="mt-8">
        <Suspense fallback={<div aria-hidden="true" className="h-[600px] rounded-xl border border-gray-200 bg-white" />}>
          <Lista />
        </Suspense>
      </div>
    </>
  );
}

async function Lista() {
  await exigirSessao();
  const grupos = await resumoDosGrupos(obterBanco());

  return (
    <ul className="rounded-xl border border-gray-200 bg-white p-2">
      {grupos.map((g) => (
        <li key={g.grupo}>
          <Link
            href={`/configuracoes/grupos/${g.grupo}`}
            className="group flex min-h-14 items-center gap-4 rounded-lg px-4 py-2 transition-colors duration-150 hover:bg-gray-50"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{NOME_DO_GRUPO[g.grupo]}</span>
              <span className="block text-13 text-gray-500">
                {[g.materiais ? plural(g.materiais, "material", "materiais") : "Nenhum material", g.caracteristicas.join(", ") || "Sem características"].join(" · ")}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 text-gray-300 transition-colors duration-150 group-hover:text-gray-500" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
