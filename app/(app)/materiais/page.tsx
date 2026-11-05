import { ChevronRight, Plus, Search, Boxes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { ComPainel, PainelCarregando } from "@/components/inventario/painel-do-item";
import { FiltrosDosMateriaisNaTela } from "@/components/materiais/filtros";
import { PainelDoMaterial } from "@/components/materiais/painel-do-material";
import { exigirSessao } from "@/lib/auth/sessao";
import { cx } from "@/lib/classes";
import { obterBanco } from "@/lib/db";
import { NOME_DA_CONDICAO } from "@/lib/itens/valores";
import { listarLocais } from "@/lib/locais/servico";
import { comMaterial, enderecoDosMateriais, lerFiltrosDosMateriais, materialDoEndereco } from "@/lib/materiais/filtros";
import { listarMateriais, resumoDosMateriais } from "@/lib/materiais/servico";
import { GRUPOS, NOME_DO_GRUPO } from "@/lib/materiais/valores";
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
  const parametros = await searchParams;
  const filtros = lerFiltrosDosMateriais(parametros);
  const aberto = materialDoEndereco(parametros);
  const db = obterBanco();
  const [resumo, lista, locais] = await Promise.all([resumoDosMateriais(db), listarMateriais(db, filtros), listarLocais(db)]);
  const filtrando = Boolean(filtros.busca || filtros.grupo || filtros.local);
  const endereco = enderecoDosMateriais(filtros);
  // A lista já vem em ordem de grupo: aqui só separa os grupos para os títulos.
  const grupos = GRUPOS.map((g) => ({ grupo: g, materiais: lista.filter((m) => m.grupo === g) })).filter((g) => g.materiais.length);

  const painel = aberto ? (
    <Suspense key={aberto} fallback={<PainelCarregando />}>
      <PainelDoMaterial id={aberto} lista={endereco} ids={lista.map((m) => m.id)} />
    </Suspense>
  ) : null;

  return (
    <ComPainel painel={painel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina
          titulo="Materiais"
          subtitulo={
            resumo.materiais
              ? filtrando
                ? `Mostrando ${plural(lista.length, "material", "materiais")} de ${resumo.materiais}`
                : juntar(plural(resumo.materiais, "material", "materiais"), plural(resumo.unidades, "unidade em estoque", "unidades em estoque"))
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
          <FiltrosDosMateriaisNaTela filtros={filtros} locais={locais.map(({ id, caminho }) => ({ id, caminho }))} />
        </div>
      ) : null}

      <div className="mt-6">
        {lista.length ? (
          <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
                  <th scope="col" className="py-3 pr-4 pl-6 font-medium">
                    Material
                  </th>
                  <th scope="col" className={cx("w-56 py-3 pr-4 font-medium", aberto !== null && "max-xl:hidden")}>
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
              {grupos.map(({ grupo, materiais }) => (
                <tbody key={grupo}>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th scope="colgroup" colSpan={4} className="py-2 pr-6 pl-6 text-13 font-medium text-gray-600">
                      {NOME_DO_GRUPO[grupo]} <span className="font-normal text-gray-500">· {materiais.length}</span>
                    </th>
                  </tr>
                  {materiais.map((m) => {
                    const selecionado = m.id === aberto;
                    return (
                      <tr
                        key={m.id}
                        aria-current={selecionado ? "true" : undefined}
                        className={cx(
                          "group relative border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50",
                          selecionado && "bg-gray-50 shadow-[inset_3px_0_0_var(--color-accent)]",
                        )}
                      >
                        <td className="py-2.5 pr-4 pl-6 align-middle">
                          <Link
                            href={comMaterial(endereco, m.id)}
                            scroll={false}
                            className="font-medium text-gray-900 after:absolute after:inset-0 after:content-['']"
                          >
                            {m.nome}
                          </Link>
                          {m.marcaModelo || m.condicao ? (
                            <p className="text-13 text-gray-500">
                              {juntar(m.marcaModelo, m.condicao ? NOME_DA_CONDICAO[m.condicao] : null)}
                            </p>
                          ) : null}
                        </td>
                        <td className={cx("max-w-56 py-2.5 pr-4 align-middle", aberto !== null && "max-xl:hidden")}>
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
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white">
            {filtrando ? (
              <EstadoVazio
                icone={Search}
                titulo="Nenhum material encontrado"
                texto="Tente outra busca ou outro filtro."
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
    </ComPainel>
  );
}
