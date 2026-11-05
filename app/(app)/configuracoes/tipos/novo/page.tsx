import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { Trilha } from "@/components/trilha";
import { FormularioDoTipo } from "@/components/tipos/formulario-do-tipo";
import { exigirSessao } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Novo tipo" };

export default function PaginaNovoTipo() {
  return (
    <>
      <Trilha partes={[{ rotulo: "Tipos de item", href: "/configuracoes/tipos" }, { rotulo: "Novo tipo" }]} />
      <CabecalhoDaPagina titulo="Novo tipo" subtitulo="Um tipo de equipamento que ainda não está na lista." />
      <div className="mt-8">
        <Suspense fallback={<div aria-hidden="true" className="h-80 max-w-lg rounded-xl border border-gray-200 bg-white" />}>
          <Formulario />
        </Suspense>
      </div>
    </>
  );
}

async function Formulario() {
  await exigirSessao();
  return <FormularioDoTipo iniciais={{ nome: "", categoria: "outro", prefixo: "" }} />;
}
