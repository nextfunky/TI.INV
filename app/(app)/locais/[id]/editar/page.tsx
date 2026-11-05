import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDoLocal } from "@/components/locais/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { comOsDeDentro } from "@/lib/locais/arvore";
import { contagensDosLocais, listarLocais } from "@/lib/locais/servico";

export const metadata: Metadata = { title: "Editar local" };

type Props = PageProps<"/locais/[id]/editar">;

export default function PaginaEditarLocal({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-64 max-w-lg rounded-xl border border-gray-200 bg-white" />
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
  const [locais, contagens] = await Promise.all([listarLocais(db), contagensDosLocais(db)]);
  const local = locais.find((l) => l.id === id);
  if (!local) notFound();

  // A lista "Dentro de" não oferece o próprio local nem os que estão dentro dele.
  const proibidos = new Set(comOsDeDentro(locais, id));

  return (
    <>
      <Trilha partes={[{ rotulo: "Locais", href: "/locais" }, { rotulo: local.nome, href: `/locais/${id}` }, { rotulo: "Editar" }]} />
      <CabecalhoDaPagina
        titulo="Editar local"
        subtitulo="Mudar o nome ou o lugar também atualiza os locais que estão dentro deste."
      />
      <div className="mt-8">
        <FormularioDoLocal
          opcoes={locais.filter((l) => !proibidos.has(l.id)).map(({ id: i, caminho }) => ({ id: i, caminho }))}
          iniciais={{ nome: local.nome, paiId: local.paiId ? String(local.paiId) : "" }}
          local={{ id, caminho: local.caminho, podeExcluir: Boolean(contagens.get(id)?.vazio) }}
        />
      </div>
    </>
  );
}
