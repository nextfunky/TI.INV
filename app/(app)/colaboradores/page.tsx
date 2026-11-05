import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { Avatar } from "@/components/avatar";
import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { exigirSessao } from "@/lib/auth/sessao";
import { listarColaboradores, totalDeColaboradores } from "@/lib/colaboradores/servico";
import { obterBanco } from "@/lib/db";
import { plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Colaboradores" };

type Props = PageProps<"/colaboradores">;

export default function PaginaColaboradores({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-10 max-w-sm rounded-lg bg-gray-100" />
          <div className="mt-6 h-80 rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

function endereco(busca: string | undefined, pagina: number) {
  const p = new URLSearchParams();
  if (busca) p.set("busca", busca);
  if (pagina > 1) p.set("pagina", String(pagina));
  const consulta = p.toString();
  return consulta ? `/colaboradores?${consulta}` : "/colaboradores";
}

async function Lista({ searchParams }: Pick<Props, "searchParams">) {
  await exigirSessao();
  const parametros = await searchParams;
  const busca = typeof parametros.busca === "string" ? parametros.busca.trim().slice(0, 120) || undefined : undefined;
  const paginaPedida = Number(parametros.pagina);
  const db = obterBanco();
  const [total, lista] = await Promise.all([
    totalDeColaboradores(db),
    listarColaboradores(db, { busca, pagina: Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1 }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina titulo="Colaboradores" subtitulo={plural(total, "pessoa", "pessoas")} />
        <Link href="/colaboradores/novo" className={classesDoBotao("secundario")}>
          <Plus aria-hidden="true" />
          Novo colaborador
        </Link>
      </div>

      <Form action="/colaboradores" className="relative mt-8 max-w-sm" role="search">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
        <label htmlFor="busca" className="sr-only">
          Buscar pelo nome
        </label>
        <input
          id="busca"
          name="busca"
          type="search"
          placeholder="Buscar pelo nome"
          defaultValue={busca}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-9 text-sm transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-4 focus:ring-accent/12 focus:outline-none"
        />
      </Form>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        {lista.colaboradores.length ? (
          <ul>
            {lista.colaboradores.map((c) => (
              <li key={c.id} className="border-b border-gray-100 last:border-b-0">
                <Link
                  href={`/colaboradores/${c.id}`}
                  className="group flex min-h-14 items-center gap-3 px-6 py-2.5 transition-colors duration-150 hover:bg-gray-50"
                >
                  <Avatar nome={c.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.nome}</span>
                    <span className="block truncate text-13 text-gray-500">{c.caminho ?? "Sem local definido"}</span>
                  </span>
                  <span className="text-gray-500">{c.itens === 0 ? "Nenhum item" : plural(c.itens, "item", "itens")}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 text-gray-300 transition-colors duration-150 group-hover:text-gray-500"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : busca ? (
          <EstadoVazio
            icone={Search}
            titulo={`Ninguém encontrado com “${busca}”`}
            acao={
              <Link href="/colaboradores" className={classesDoBotao("secundario")}>
                Limpar busca
              </Link>
            }
          />
        ) : (
          <EstadoVazio
            icone={Users}
            titulo="Nenhum colaborador cadastrado"
            texto="Cadastre as pessoas que usam os equipamentos."
            acao={
              <Link href="/colaboradores/novo" className={classesDoBotao("secundario")}>
                <Plus aria-hidden="true" />
                Novo colaborador
              </Link>
            }
          />
        )}
      </div>

      {lista.paginas > 1 ? (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-4">
          <p className="text-13 text-gray-500">
            Página {lista.pagina} de {lista.paginas}
          </p>
          <div className="flex gap-2">
            {lista.pagina > 1 ? (
              <Link href={endereco(busca, lista.pagina - 1)} className={classesDoBotao("secundario")}>
                <ChevronLeft aria-hidden="true" />
                Anterior
              </Link>
            ) : null}
            {lista.pagina < lista.paginas ? (
              <Link href={endereco(busca, lista.pagina + 1)} className={classesDoBotao("secundario")}>
                Próxima
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
