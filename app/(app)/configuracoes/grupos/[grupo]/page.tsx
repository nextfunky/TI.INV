import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { CaracteristicasNaConfiguracao } from "@/components/caracteristicas/configuracao";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { caracteristicasDoDono, resumoDosGrupos } from "@/lib/caracteristicas/configuracao";
import { obterBanco } from "@/lib/db";
import { GRUPOS, NOME_DO_GRUPO } from "@/lib/materiais/valores";
import { plural } from "@/lib/texto/plural";

type Props = PageProps<"/configuracoes/grupos/[grupo]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { grupo: texto } = await params;
  const grupo = GRUPOS.find((g) => g === texto);
  return { title: grupo ? NOME_DO_GRUPO[grupo] : "Grupo de material" };
}

export default function PaginaGrupo({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-80 max-w-lg rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Grupo params={params} />
    </Suspense>
  );
}

async function Grupo({ params }: Pick<Props, "params">) {
  await exigirSessao();
  const { grupo: texto } = await params;
  const grupo = GRUPOS.find((g) => g === texto);
  if (!grupo) notFound();
  const db = obterBanco();
  const [caracteristicas, resumo] = await Promise.all([caracteristicasDoDono(db, { grupo }), resumoDosGrupos(db)]);
  const materiais = resumo.find((r) => r.grupo === grupo)?.materiais ?? 0;

  return (
    <>
      <Trilha partes={[{ rotulo: "Grupos de material", href: "/configuracoes/grupos" }, { rotulo: NOME_DO_GRUPO[grupo] }]} />
      <CabecalhoDaPagina titulo={NOME_DO_GRUPO[grupo]} subtitulo={materiais ? plural(materiais, "material", "materiais") : "Nenhum material"} />
      <div className="mt-8">
        <CaracteristicasNaConfiguracao
          caracteristicas={caracteristicas}
          novaHref={`/configuracoes/caracteristicas/nova?grupo=${grupo}`}
          nomeDoDono={NOME_DO_GRUPO[grupo]}
        />
      </div>
    </>
  );
}
