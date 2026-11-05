import { List, MapPin, Package, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Avatar } from "@/components/avatar";
import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando } from "@/components/cabecalho-da-pagina";
import { DevolverItem } from "@/components/colaboradores/devolver";
import { ExcluirColaborador } from "@/components/colaboradores/excluir";
import { VincularItens } from "@/components/colaboradores/vincular-itens";
import { EstadoVazio } from "@/components/estado-vazio";
import { TabelaDeItens } from "@/components/inventario/tabela-de-itens";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { itensDaPessoa, obterColaborador } from "@/lib/colaboradores/servico";
import { materiaisDaPessoa } from "@/lib/materiais/servico";
import { formatarDataHora } from "@/lib/texto/data";
import { obterBanco } from "@/lib/db";
import { tituloDoItem } from "@/lib/itens/nomes";
import { plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Colaborador" };

type Props = PageProps<"/colaboradores/[id]">;

export default function PaginaDaPessoa({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-64 rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Pessoa params={params} />
    </Suspense>
  );
}

async function Pessoa({ params }: Pick<Props, "params">) {
  await exigirSessao();
  const id = Number((await params).id);
  const db = obterBanco();
  const pessoa = Number.isInteger(id) && id > 0 ? await obterColaborador(db, id) : null;
  if (!pessoa) notFound();
  const [itens, materiais] = await Promise.all([itensDaPessoa(db, pessoa.id), materiaisDaPessoa(db, pessoa.id)]);

  return (
    <>
      <Trilha partes={[{ rotulo: "Colaboradores", href: "/colaboradores" }, { rotulo: pessoa.nome }]} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar nome={pessoa.nome} tamanho={48} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] break-words">{pessoa.nome}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-gray-500">
              <span>
                {pessoa.itensAtivos === 0
                  ? "Nenhum item com esta pessoa"
                  : `${plural(pessoa.itensAtivos, "item", "itens")} com esta pessoa`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {pessoa.localId && pessoa.caminho ? (
                  <Link href={`/locais/${pessoa.localId}`} className="transition-colors duration-150 hover:text-gray-900">
                    {pessoa.caminho}
                  </Link>
                ) : (
                  "Sem local definido"
                )}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Só quem nunca teve itens (nem descartados) nem recebeu material pode ser excluído. */}
          {pessoa.totalDeItens === 0 && materiais.length === 0 ? <ExcluirColaborador id={pessoa.id} nome={pessoa.nome} /> : null}
          {pessoa.itensAtivos > 0 ? (
            <Link href={`/inventario?pessoa=${pessoa.id}`} className={classesDoBotao("secundario")}>
              <List aria-hidden="true" />
              Ver no inventário
            </Link>
          ) : null}
          {/* Sem itens, o "Vincular itens" aparece no meio da página. */}
          {pessoa.itensAtivos > 0 ? <VincularItens pessoaId={pessoa.id} nome={pessoa.nome} /> : null}
          <Link href={`/colaboradores/${pessoa.id}/editar`} className={classesDoBotao("secundario")}>
            <Pencil aria-hidden="true" />
            Editar
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {itens.length ? (
          <TabelaDeItens
            itens={itens}
            mostrarUsuario={false}
            acao={(item) => (
              <DevolverItem
                pessoaId={pessoa.id}
                pessoa={pessoa.nome}
                item={{ id: item.id, codigo: item.codigo, titulo: tituloDoItem(item), status: item.status }}
              />
            )}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white">
            <EstadoVazio
              icone={Package}
              titulo="Nenhum item com esta pessoa"
              texto="Vincule itens que já estão cadastrados, ou cadastre um item novo."
              acao={
                <div className="flex flex-wrap justify-center gap-2">
                  <VincularItens pessoaId={pessoa.id} nome={pessoa.nome} />
                  <Link href="/inventario/novo" className={classesDoBotao("secundario")}>
                    <Plus aria-hidden="true" />
                    Novo item
                  </Link>
                </div>
              }
            />
          </div>
        )}
      </div>

      {materiais.length ? (
        <section aria-labelledby="materiais-entregues" className="mt-10">
          <h2 id="materiais-entregues" className="px-6 pb-3 text-base font-semibold">
            Materiais entregues
          </h2>
          <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
                  <th scope="col" className="w-40 py-3 pr-4 pl-6 font-medium">
                    Data
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Material
                  </th>
                  <th scope="col" className="w-20 py-3 pr-4 text-right font-medium">
                    Qtd.
                  </th>
                  <th scope="col" className="py-3 pr-6 font-medium">
                    Observação
                  </th>
                </tr>
              </thead>
              <tbody>
                {materiais.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-3 pr-4 pl-6 align-top text-13 whitespace-nowrap text-gray-500 tabular-nums">
                      {formatarDataHora(m.criadoEm)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <Link href={`/materiais/${m.material.id}`} className="font-medium text-gray-900 hover:text-accent">
                        {m.material.nome}
                      </Link>
                      {m.material.marcaModelo ? <p className="text-13 text-gray-500">{m.material.marcaModelo}</p> : null}
                    </td>
                    <td className="py-3 pr-4 text-right align-top font-mono text-13 tabular-nums">{m.quantidade.toLocaleString("pt-BR")}</td>
                    <td className="py-3 pr-6 align-top text-gray-600">{m.observacao ?? <span className="text-gray-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
