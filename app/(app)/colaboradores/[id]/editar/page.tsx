import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDoColaborador } from "@/components/colaboradores/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterColaborador } from "@/lib/colaboradores/servico";
import { obterBanco } from "@/lib/db";
import { listarLocais } from "@/lib/locais/servico";

export const metadata: Metadata = { title: "Editar colaborador" };

type Props = PageProps<"/colaboradores/[id]/editar">;

export default function PaginaEditarColaborador({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-40 max-w-lg rounded-xl border border-gray-200 bg-white" />
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
  const pessoa = Number.isInteger(id) && id > 0 ? await obterColaborador(db, id) : null;
  if (!pessoa) notFound();
  const locais = await listarLocais(db);

  return (
    <>
      <Trilha
        partes={[
          { rotulo: "Colaboradores", href: "/colaboradores" },
          { rotulo: pessoa.nome, href: `/colaboradores/${pessoa.id}` },
          { rotulo: "Editar" },
        ]}
      />
      <CabecalhoDaPagina titulo="Editar colaborador" subtitulo="As mudanças valem para todos os itens desta pessoa." />
      <div className="mt-8">
        <FormularioDoColaborador
          pessoa={{ id: pessoa.id, nome: pessoa.nome, localId: pessoa.localId }}
          locais={locais.map(({ id: i, caminho }) => ({ id: i, caminho }))}
        />
      </div>
    </>
  );
}
