import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDaCaracteristica } from "@/components/caracteristicas/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { lerDono, nomeDoDono, telaDoDono, textoDoDono } from "@/lib/caracteristicas/configuracao";
import { obterBanco } from "@/lib/db";

export const metadata: Metadata = { title: "Nova característica" };

type Props = PageProps<"/configuracoes/caracteristicas/nova">;

export default function PaginaNovaCaracteristica({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-96 max-w-lg rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Nova searchParams={searchParams} />
    </Suspense>
  );
}

async function Nova({ searchParams }: Pick<Props, "searchParams">) {
  await exigirSessao();
  const { tipo, grupo } = await searchParams;
  const dono = typeof tipo === "string" ? lerDono(`tipo:${tipo}`) : typeof grupo === "string" ? lerDono(`grupo:${grupo}`) : null;
  const nome = dono ? await nomeDoDono(obterBanco(), dono) : null;
  if (!dono || !nome) notFound();
  const tela = telaDoDono(dono);

  return (
    <>
      <Trilha
        partes={[
          "tipoId" in dono ? { rotulo: "Tipos de item", href: "/configuracoes/tipos" } : { rotulo: "Grupos de material", href: "/configuracoes/grupos" },
          { rotulo: nome, href: tela },
          { rotulo: "Nova característica" },
        ]}
      />
      <CabecalhoDaPagina titulo="Nova característica" subtitulo={`Um campo próprio de ${nome}.`} />
      <div className="mt-8">
        <FormularioDaCaracteristica dono={textoDoDono(dono)} voltar={tela} />
      </div>
    </>
  );
}
