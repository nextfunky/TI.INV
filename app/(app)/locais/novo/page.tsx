import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDoLocal } from "@/components/locais/formulario";
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
      <CabecalhoDaPagina titulo="Novo local" subtitulo="Uma filial, andar, setor, sala... o que fizer sentido para a empresa." />
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
  const locais = await listarLocais(obterBanco());
  // Vindo de "+ Dentro", o local de cima já vem escolhido.
  const paiId = typeof pai === "string" && locais.some((l) => String(l.id) === pai) ? pai : "";
  // A chave faz o formulário recomeçar quando o local de cima muda (o Next
  // guarda a página aberta antes, com os valores antigos).
  return (
    <FormularioDoLocal
      key={paiId || "principal"}
      opcoes={locais.map(({ id, caminho }) => ({ id, caminho }))}
      iniciais={{ nome: "", paiId }}
    />
  );
}
