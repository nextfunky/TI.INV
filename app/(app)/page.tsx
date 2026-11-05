import { Package } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { exigirSessao } from "@/lib/auth/sessao";
import { dataPorExtenso, saudacao } from "@/lib/texto/data";

export const metadata: Metadata = { title: "Início" };

/** O Início provisório: a saudação e a data. O painel completo chega na Etapa 5. */
export default function PaginaInicio() {
  return (
    <>
      <Suspense fallback={<CabecalhoCarregando />}>
        <Saudacao />
      </Suspense>

      <section className="mt-10 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-gray-100 text-gray-500">
            <Package aria-hidden="true" className="size-[18px]" />
          </span>
          <h2 className="mt-4 font-medium">O inventário chega na próxima etapa</h2>
          <p className="mt-1 max-w-sm text-gray-500">
            Na Etapa 2, você vai cadastrar os primeiros itens e eles vão aparecer aqui.
          </p>
        </div>
      </section>
    </>
  );
}

async function Saudacao() {
  // Confere a sessão antes de qualquer coisa (e a hora é a de agora, não a da construção).
  await exigirSessao();
  const agora = new Date();
  return <CabecalhoDaPagina titulo={saudacao(agora)} subtitulo={dataPorExtenso(agora)} />;
}
