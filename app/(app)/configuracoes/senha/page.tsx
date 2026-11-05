import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { exigirSessao } from "@/lib/auth/sessao";

import { FormularioSenha } from "./formulario";

export const metadata: Metadata = { title: "Alterar senha" };

export default function PaginaAlterarSenha() {
  return (
    <>
      <CabecalhoDaPagina
        titulo="Alterar senha"
        subtitulo="Ao salvar, os outros navegadores conectados precisam entrar de novo."
      />
      <div className="mt-8 max-w-lg">
        <Suspense
          fallback={<div aria-hidden="true" className="h-96 rounded-xl border border-gray-200 bg-white" />}
        >
          <Formulario />
        </Suspense>
      </div>
    </>
  );
}

async function Formulario() {
  const sessao = await exigirSessao();
  return <FormularioSenha usuario={sessao.usuario} />;
}
