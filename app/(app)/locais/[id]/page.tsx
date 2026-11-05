import { ChevronRight, Folder, List, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Avatar } from "@/components/avatar";
import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando } from "@/components/cabecalho-da-pagina";
import { TabelaDeItens } from "@/components/inventario/tabela-de-itens";
import { TrazerItens, TrazerPessoas } from "@/components/locais/trazer";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { caminhoDeCima } from "@/lib/locais/arvore";
import { contagensDosLocais, itensSemUsuarioDoLocal, listarLocais, pessoasDoLocal } from "@/lib/locais/servico";
import { juntar, plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Local" };

type Props = PageProps<"/locais/[id]">;

export default function PaginaDoLocal({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-64 rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Local params={params} />
    </Suspense>
  );
}

function Bloco({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <h2 className="px-6 text-base font-semibold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

async function Local({ params }: Pick<Props, "params">) {
  await exigirSessao();
  const id = Number((await params).id);
  const db = obterBanco();
  const [locais, contagens] = await Promise.all([listarLocais(db), contagensDosLocais(db)]);
  const local = locais.find((l) => l.id === id);
  if (!local) notFound();

  const [pessoas, itens] = await Promise.all([pessoasDoLocal(db, id), itensSemUsuarioDoLocal(db, id)]);
  const filhos = locais.filter((l) => l.paiId === id);
  const deCima = caminhoDeCima(local.caminho);
  // Mostra o caminho só das pessoas que estão num local de dentro.
  const relativo = (caminho: string) => caminho.slice(local.caminho.length + 3);

  return (
    <>
      <Trilha partes={[{ rotulo: "Locais", href: "/locais" }, { rotulo: local.nome }]} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-gray-100 text-gray-600">
            <Folder aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] break-words">{local.nome}</h1>
            <p className="mt-1 text-gray-500">
              {juntar(
                deCima ? `Departamento de ${deCima}` : "Unidade",
                plural(pessoas.length, "pessoa", "pessoas"),
                plural(itens.length, "item sem usuário", "itens sem usuário"),
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/inventario?local=${id}`} className={classesDoBotao("secundario")}>
            <List aria-hidden="true" />
            Ver no inventário
          </Link>
          <Link href={`/locais/${id}/editar`} className={classesDoBotao("secundario")}>
            <Pencil aria-hidden="true" />
            Editar
          </Link>
        </div>
      </div>

      {local.paiId === null ? (
        <Bloco
          titulo="Departamentos"
          acao={
            <Link href={`/locais/novo?pai=${id}`} className={classesDoBotao("secundario")}>
              + Novo departamento
            </Link>
          }
        >
          {filhos.length ? (
          <ul className="rounded-xl border border-gray-200 bg-white">
            {filhos.map((f) => {
              const c = contagens.get(f.id);
              return (
                <li key={f.id} className="border-b border-gray-100 last:border-b-0">
                  <Link
                    href={`/locais/${f.id}`}
                    className="group flex min-h-14 items-center gap-3 px-6 py-2 transition-colors duration-150 hover:bg-gray-50"
                  >
                    <Folder aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 font-medium">{f.nome}</span>
                    <span className="text-13 text-gray-500">
                      {c && (c.pessoas || c.itensSemUsuario)
                        ? juntar(
                            c.pessoas ? plural(c.pessoas, "pessoa", "pessoas") : null,
                            c.itensSemUsuario ? plural(c.itensSemUsuario, "item", "itens") : null,
                          )
                        : "Vazio"}
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 text-gray-300 group-hover:text-gray-500" />
                  </Link>
                </li>
              );
            })}
          </ul>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white">
              <p className="px-6 py-5 text-gray-500">Nenhum departamento nesta unidade ainda.</p>
            </div>
          )}
        </Bloco>
      ) : null}

      <Bloco titulo="Pessoas" acao={<TrazerPessoas localId={id} nome={local.nome} />}>
        <div className="rounded-xl border border-gray-200 bg-white">
          {pessoas.length ? (
            <ul>
              {pessoas.map((p) => (
                <li key={p.id} className="border-b border-gray-100 last:border-b-0">
                  <Link
                    href={`/colaboradores/${p.id}`}
                    className="group flex min-h-14 items-center gap-3 px-6 py-2 transition-colors duration-150 hover:bg-gray-50"
                  >
                    <Avatar nome={p.nome} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.nome}</span>
                      {p.localId !== id ? <span className="block text-13 text-gray-500">{relativo(p.caminho)}</span> : null}
                    </span>
                    <span className="text-gray-500">{p.itens === 0 ? "Nenhum item" : plural(p.itens, "item", "itens")}</span>
                    <ChevronRight aria-hidden="true" className="size-4 text-gray-300 group-hover:text-gray-500" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-5 text-gray-500">Ninguém neste local ainda.</p>
          )}
        </div>
      </Bloco>

      <Bloco titulo="Itens sem usuário" acao={<TrazerItens localId={id} nome={local.nome} />}>
        {itens.length ? (
          <TabelaDeItens itens={itens} mostrarUsuario={false} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white">
            <p className="px-6 py-5 text-gray-500">
              Nenhum item sem usuário neste local. Os itens que estão com alguém ficam onde a pessoa está.
            </p>
          </div>
        )}
      </Bloco>
    </>
  );
}
