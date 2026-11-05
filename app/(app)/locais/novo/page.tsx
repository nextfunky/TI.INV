import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioNovoLocal } from "@/components/locais/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { listarLocais } from "@/lib/locais/servico";

export const metadata: Metadata = { title: "Novo local" };

type Props = PageProps<"/locais/novo">;

export default function PaginaNovoLocal({ searchParams }: Props) {
  return (
    <>
      <Trilha partes={[{ rotulo: "Locais", href: "/locais" }, { rotulo: "Novo local" }]} />
      <CabecalhoDaPagina
        titulo="Novo local"
        subtitulo="Uma unidade da empresa e, se quiser, um departamento dentro dela."
      />
      <div className="mt-8">
        <Suspense fallback={<div aria-hidden="true" className="h-64 max-w-lg rounded-xl border border-gray-200 bg-white" />}>
          <Formulario searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Formulario({ searchParams }: Pick<Props, "searchParams">) {
  await exigirSessao();
  const { pai } = await searchParams;
  const unidades = (await listarLocais(obterBanco())).filter((l) => l.paiId === null);
  // Vindo de "+ Departamento", a unidade já vem escolhida.
  const unidadeInicial = typeof pai === "string" && unidades.some((u) => String(u.id) === pai) ? pai : "";
  // A chave faz o formulário recomeçar quando a unidade de partida muda (o Next
  // guarda a página aberta antes, com os valores antigos).
  return (
    <FormularioNovoLocal
      key={unidadeInicial || "nova"}
      unidades={unidades.map(({ id, nome }) => ({ id, nome }))}
      unidadeInicial={unidadeInicial}
    />
  );
}
