import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { ImportarPlanilha } from "@/components/importacao/importar";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Importação" };

export default function PaginaImportacao() {
  return (
    <>
      <Trilha partes={[{ rotulo: "Inventário", href: "/inventario" }, { rotulo: "Importação" }]} />
      <CabecalhoDaPagina
        titulo="Importação"
        subtitulo="Cadastre muitos itens e materiais de uma vez, a partir de uma planilha .xlsx."
      />
      <div className="mt-8">
        <Suspense fallback={<div aria-hidden="true" className="h-72 max-w-3xl rounded-xl border border-gray-200 bg-white" />}>
          <Conteudo />
        </Suspense>
      </div>
    </>
  );
}

async function Conteudo() {
  await exigirSessao();
  return <ImportarPlanilha />;
}
