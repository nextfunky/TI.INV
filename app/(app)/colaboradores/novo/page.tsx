import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDoColaborador } from "@/components/colaboradores/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Novo colaborador" };

export default function PaginaNovoColaborador() {
  return (
    <>
      <Trilha partes={[{ rotulo: "Colaboradores", href: "/colaboradores" }, { rotulo: "Novo colaborador" }]} />
      <CabecalhoDaPagina
        titulo="Novo colaborador"
        subtitulo="Depois é só escolher a pessoa ao cadastrar ou editar um item."
      />
      <div className="mt-8">
        <Suspense fallback={<div aria-hidden="true" className="h-40 max-w-lg rounded-xl border border-gray-200 bg-white" />}>
          <Formulario />
        </Suspense>
      </div>
    </>
  );
}

async function Formulario() {
  await exigirSessao();
  return <FormularioDoColaborador />;
}
