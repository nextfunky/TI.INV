import { ChevronRight, Plus, Search, Boxes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { FiltrosDosMateriaisNaTela } from "@/components/materiais/filtros";
import { exigirSessao } from "@/lib/auth/sessao";
import { cx } from "@/lib/classes";
import { obterBanco } from "@/lib/db";
import { lerFiltrosDosMateriais } from "@/lib/materiais/filtros";
import { listarMateriais, resumoDosMateriais } from "@/lib/materiais/servico";
import { NOME_DO_GRUPO } from "@/lib/materiais/valores";
import { juntar, plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Materiais" };

type Props = PageProps<"/materiais">;

export default function PaginaMateriais({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-8 max-w-md rounded-full bg-gray-100" />
          <div className="mt-6 h-80 rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

const numero = (n: number) => n.toLocaleString("pt-BR");

async function Lista({ searchParams }: Pick<Props, "searchParams">) {
  await exigirSessao();
  const filtros = lerFiltrosDosMateriais(await searchParams);
  const db = obterBanco();
  const [resumo, lista] = await Promise.all([resumoDosMateriais(db), listarMateriais(db, filtros)]);
  const filtrando = Boolean(filtros.busca || filtros.grupo);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina
          titulo="Materiais"
          subtitulo={
            resumo.materiais
              ? juntar(plural(resumo.materiais, "material", "materiais"), plural(resumo.unidades, "unidade em estoque", "unidades em estoque"))
              : "O que é controlado por quantidade: cabos, toners, mousepads…"
          }
        />
        <Link href="/materiais/novo" className={classesDoBotao("secundario")}>
          <Plus aria-hidden="true" />
          Novo material
        </Link>
      </div>

      {resumo.materiais ? (
        <div className="mt-8">
          <FiltrosDosMateriaisNaTela filtros={filtros} />
        </div>
      ) : null}

      <div className="mt-6">
        {lista.length ? (
          <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
                  <th scope="col" className="py-3 pr-4 pl-6 font-medium">
                    Material
                  </th>
                  <th scope="col" className="w-48 py-3 pr-4 font-medium">
                    Grupo
                  </th>
                  <th scope="col" className="w-56 py-3 pr-4 font-medium">
                    Local
                  </th>
                  <th scope="col" className="w-28 py-3 pr-4 text-right font-medium">
                    Quantidade
                  </th>
                  <th scope="col" className="w-12 py-3 pr-6">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr
                    key={m.id}
                    className="group relative border-b border-gray-100 transition-colors duration-150 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="py-2.5 pr-4 pl-6 align-middle">
                      <Link
                        href={`/materiais/${m.id}`}
                        className="font-medium text-gray-900 after:absolute after:inset-0 after:content-['']"
                      >
                        {m.nome}
                      </Link>
                      {m.marcaModelo ? <p className="text-13 text-gray-500">{m.marcaModelo}</p> : null}
                    </td>
                    <td className="py-2.5 pr-4 align-middle text-gray-600">{NOME_DO_GRUPO[m.grupo]}</td>
                    <td className="max-w-56 py-2.5 pr-4 align-middle">
                      <p className="truncate text-gray-600">{m.caminho ?? <span className="text-gray-500">Sem local definido</span>}</p>
                    </td>
                    <td
                      className={cx(
                        "py-2.5 pr-4 text-right align-middle font-mono tabular-nums",
                        m.quantidade === 0 ? "text-gray-400" : "text-gray-900",
                      )}
                    >
                      {numero(m.quantidade)}
                    </td>
                    <td className="py-2.5 pr-6 align-middle">
                      <ChevronRight aria-hidden="true" className="size-4 text-gray-300 group-hover:text-gray-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white">
            {filtrando ? (
              <EstadoVazio
                icone={Search}
                titulo="Nenhum material encontrado"
                texto="Tente outra busca ou outro grupo."
                acao={
                  <Link href="/materiais" className={classesDoBotao("secundario")}>
                    Limpar filtros
                  </Link>
                }
              />
            ) : (
              <EstadoVazio
                icone={Boxes}
                titulo="Nenhum material cadastrado"
                texto="Cadastre o que é controlado por quantidade, como cabos, toners e mousepads."
                acao={
                  <Link href="/materiais/novo" className={classesDoBotao("secundario")}>
                    <Plus aria-hidden="true" />
                    Novo material
                  </Link>
                }
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
