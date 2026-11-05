import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioEditarLocal } from "@/components/locais/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
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
  const departamento = local.paiId !== null;

  return (
    <>
      <Trilha partes={[{ rotulo: "Locais", href: "/locais" }, { rotulo: local.nome, href: `/locais/${id}` }, { rotulo: "Editar" }]} />
      <CabecalhoDaPagina
        titulo={departamento ? "Editar departamento" : "Editar unidade"}
        subtitulo={
          departamento
            ? "Mudar a unidade leva junto as pessoas e os itens do departamento."
            : "Mudar o nome também atualiza os departamentos desta unidade."
        }
      />
      <div className="mt-8">
        <FormularioEditarLocal
          local={{ id, nome: local.nome, paiId: local.paiId, caminho: local.caminho, podeExcluir: Boolean(contagens.get(id)?.vazio) }}
          unidades={locais.filter((l) => l.paiId === null).map(({ id: i, nome }) => ({ id: i, nome }))}
        />
      </div>
    </>
  );
}
