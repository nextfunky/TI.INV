import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { IconeDoTipo } from "@/components/icone-do-tipo";
import { exigirSessao } from "@/lib/auth/sessao";
import { listarCaracteristicas } from "@/lib/caracteristicas/servico";
import { obterBanco } from "@/lib/db";
import { listarTiposComContagem, type TipoComContagem } from "@/lib/itens/tipos";
import { CATEGORIAS, NOME_DA_CATEGORIA } from "@/lib/itens/valores";
import { plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Tipos de item" };

export default function PaginaTipos() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina
          titulo="Tipos de item"
          subtitulo="O que cada item é. O prefixo forma o código: MON gera MON0001, MON0002... Em cada tipo, ajuste as características."
        />
        <Link href="/configuracoes/tipos/novo" className={classesDoBotao("secundario")}>
          <Plus aria-hidden="true" />
          Novo tipo
        </Link>
      </div>
      <div className="mt-8">
        <Suspense fallback={<div aria-hidden="true" className="h-[600px] rounded-xl border border-gray-200 bg-white" />}>
          <Lista />
        </Suspense>
      </div>
    </>
  );
}

function contagem(tipo: TipoComContagem, caracteristicas: string[]): string {
  const ativos = tipo.itensAtivos === 0 ? "Nenhum item" : plural(tipo.itensAtivos, "item", "itens");
  return [ativos, tipo.itensDescartados ? plural(tipo.itensDescartados, "descartado", "descartados") : null, caracteristicas.join(", ") || null]
    .filter(Boolean)
    .join(" · ");
}

async function Lista() {
  await exigirSessao();
  const db = obterBanco();
  const [tipos, caracteristicas] = await Promise.all([listarTiposComContagem(db), listarCaracteristicas(db)]);
  const nomes = (tipoId: number) => caracteristicas.filter((c) => c.tipoId === tipoId).map((c) => c.nome);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {CATEGORIAS.map((categoria) => {
        const doGrupo = tipos.filter((t) => t.categoria === categoria);
        if (!doGrupo.length) return null;
        return (
          <section key={categoria} className="border-t border-gray-100 first:border-t-0">
            <h2 className="px-6 pt-5 pb-2 text-13 font-medium text-gray-500">{NOME_DA_CATEGORIA[categoria].filtro}</h2>
            <ul className="px-2 pb-2">
              {doGrupo.map((tipo) => (
                <li key={tipo.id}>
                  <Link
                    href={`/configuracoes/tipos/${tipo.id}`}
                    className="group flex min-h-14 items-center gap-4 rounded-lg px-4 py-2 transition-colors duration-150 hover:bg-gray-50"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <IconeDoTipo icone={tipo.icone} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{tipo.nome}</span>
                      <span className="block text-13 text-gray-500">{contagem(tipo, nomes(tipo.id))}</span>
                    </span>
                    <span className="font-mono text-13 text-gray-500">{tipo.prefixo}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 text-gray-300 transition-colors duration-150 group-hover:text-gray-500"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
