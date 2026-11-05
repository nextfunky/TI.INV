import { List, Package, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Avatar } from "@/components/avatar";
import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando } from "@/components/cabecalho-da-pagina";
import { ExcluirColaborador } from "@/components/colaboradores/excluir";
import { EstadoVazio } from "@/components/estado-vazio";
import { TabelaDeItens } from "@/components/inventario/tabela-de-itens";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { itensDaPessoa, obterColaborador } from "@/lib/colaboradores/servico";
import { obterBanco } from "@/lib/db";
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
  const itens = await itensDaPessoa(db, pessoa.id);

  return (
    <>
      <Trilha partes={[{ rotulo: "Colaboradores", href: "/colaboradores" }, { rotulo: pessoa.nome }]} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar nome={pessoa.nome} tamanho={48} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] break-words">{pessoa.nome}</h1>
            <p className="mt-1 text-gray-500">
              {pessoa.itensAtivos === 0
                ? "Nenhum item com esta pessoa"
                : `${plural(pessoa.itensAtivos, "item", "itens")} com esta pessoa`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Só quem nunca teve itens (nem descartados) pode ser excluído. */}
          {pessoa.totalDeItens === 0 ? <ExcluirColaborador id={pessoa.id} nome={pessoa.nome} /> : null}
          {pessoa.itensAtivos > 0 ? (
            <Link href={`/inventario?pessoa=${pessoa.id}`} className={classesDoBotao("secundario")}>
              <List aria-hidden="true" />
              Ver no inventário
            </Link>
          ) : null}
          <Link href={`/colaboradores/${pessoa.id}/editar`} className={classesDoBotao("secundario")}>
            <Pencil aria-hidden="true" />
            Editar
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {itens.length ? (
          <TabelaDeItens itens={itens} mostrarUsuario={false} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white">
            <EstadoVazio
              icone={Package}
              titulo="Nenhum item com esta pessoa"
              texto="Ao cadastrar ou editar um item, escolha esta pessoa como usuário."
              acao={
                <Link href="/inventario/novo" className={classesDoBotao("secundario")}>
                  <Plus aria-hidden="true" />
                  Novo item
                </Link>
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
