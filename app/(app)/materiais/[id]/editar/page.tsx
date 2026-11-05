import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { ExcluirMaterial } from "@/components/materiais/excluir";
import { FormularioDoMaterial } from "@/components/materiais/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { listarLocais } from "@/lib/locais/servico";
import { obterMaterial } from "@/lib/materiais/servico";

export const metadata: Metadata = { title: "Editar material" };

type Props = PageProps<"/materiais/[id]/editar">;

export default function PaginaEditarMaterial({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-[460px] max-w-2xl rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Edicao params={params} />
    </Suspense>
  );
}

async function Edicao({ params }: Pick<Props, "params">) {
  await exigirSessao();
  const id = Number((await params).id);
  const db = obterBanco();
  const material = Number.isInteger(id) && id > 0 ? await obterMaterial(db, id) : null;
  if (!material) notFound();
  const locais = await listarLocais(db);

  return (
    <>
      <Trilha
        partes={[
          { rotulo: "Materiais", href: "/materiais" },
          { rotulo: material.nome, href: `/materiais/${id}` },
          { rotulo: "Editar" },
        ]}
      />
      <div className="flex max-w-2xl flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina titulo="Editar material" subtitulo="A quantidade muda pela Entrada, Saída ou Ajuste de contagem." />
        {/* Só material que nunca teve saída pode ser excluído. */}
        {material.temSaidas ? null : <ExcluirMaterial id={id} nome={material.nome} />}
      </div>
      <div className="mt-8">
        <FormularioDoMaterial material={material} locais={locais.map(({ id: i, caminho }) => ({ id: i, caminho }))} />
      </div>
    </>
  );
}
