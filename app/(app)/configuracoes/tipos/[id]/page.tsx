import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { CaracteristicasNaConfiguracao } from "@/components/caracteristicas/configuracao";
import { Trilha } from "@/components/trilha";
import { FormularioDoTipo } from "@/components/tipos/formulario-do-tipo";
import { exigirSessao } from "@/lib/auth/sessao";
import { caracteristicasDoTipo } from "@/lib/caracteristicas/servico";
import { obterBanco } from "@/lib/db";
import { obterTipo, podeMudarCategoria } from "@/lib/itens/tipos";
import { plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Editar tipo" };

type Props = PageProps<"/configuracoes/tipos/[id]">;

export default function PaginaEditarTipo({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-80 max-w-lg rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Edicao params={params} />
    </Suspense>
  );
}

async function Edicao({ params }: Pick<Props, "params">) {
  await exigirSessao();
  const { id } = await params;
  const numero = Number(id);
  const db = obterBanco();
  const tipo = Number.isInteger(numero) && numero > 0 ? await obterTipo(db, numero) : null;
  if (!tipo) notFound();
  const caracteristicas = await caracteristicasDoTipo(db, tipo.id);

  const totalDeItens = tipo.itensAtivos + tipo.itensDescartados;
  // Deixar de ser Computador só sem itens (as outras mudanças não apagam nada).
  const categoriaTravada = !podeMudarCategoria(tipo.categoria, "outro", totalDeItens > 0);

  return (
    <>
      <Trilha partes={[{ rotulo: "Tipos de item", href: "/configuracoes/tipos" }, { rotulo: tipo.nome }]} />
      <CabecalhoDaPagina
        titulo="Editar tipo"
        subtitulo={
          <>
            {tipo.nome} · {plural(totalDeItens, "item", "itens")} · prefixo{" "}
            <span className="font-mono">{tipo.prefixo}</span>
          </>
        }
      />
      <div className="mt-8">
        <FormularioDoTipo
          iniciais={{ nome: tipo.nome, categoria: tipo.categoria, prefixo: tipo.prefixo }}
          tipo={{
            id: tipo.id,
            nome: tipo.nome,
            prefixo: tipo.prefixo,
            podeExcluir: totalDeItens === 0,
            categoriaTravada,
          }}
        />
      </div>
      <div className="mt-12">
        <CaracteristicasNaConfiguracao
          caracteristicas={caracteristicas}
          novaHref={`/configuracoes/caracteristicas/nova?tipo=${tipo.id}`}
          nomeDoDono={tipo.nome}
        />
      </div>
    </>
  );
}
