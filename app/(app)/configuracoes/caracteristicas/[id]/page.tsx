import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDaCaracteristica } from "@/components/caracteristicas/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import {
  cadastrosComValor,
  donoDe,
  nomeDoDono,
  obterCaracteristica,
  telaDoDono,
  textoDoDono,
  usoDosValores,
} from "@/lib/caracteristicas/configuracao";
import { obterBanco } from "@/lib/db";
import { plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Editar característica" };

type Props = PageProps<"/configuracoes/caracteristicas/[id]">;

export default function PaginaEditarCaracteristica({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-96 max-w-lg rounded-xl border border-gray-200 bg-white" />
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
  const caracteristica = Number.isInteger(numero) && numero > 0 ? await obterCaracteristica(db, numero) : null;
  if (!caracteristica) notFound();
  const dono = donoDe(caracteristica);
  const [nome, uso, comValor] = await Promise.all([nomeDoDono(db, dono), usoDosValores(db, caracteristica), cadastrosComValor(db, caracteristica)]);
  const tela = telaDoDono(dono);

  return (
    <>
      <Trilha
        partes={[
          "tipoId" in dono ? { rotulo: "Tipos de item", href: "/configuracoes/tipos" } : { rotulo: "Grupos de material", href: "/configuracoes/grupos" },
          { rotulo: nome ?? "—", href: tela },
          { rotulo: caracteristica.nome },
        ]}
      />
      <CabecalhoDaPagina
        titulo="Editar característica"
        subtitulo={`${caracteristica.nome} · ${nome} · ${comValor ? `preenchida em ${plural(comValor, "cadastro", "cadastros")}` : "nenhum cadastro preenchido"}`}
      />
      <div className="mt-8">
        <FormularioDaCaracteristica
          dono={textoDoDono(dono)}
          voltar={tela}
          caracteristica={{
            id: caracteristica.id,
            nome: caracteristica.nome,
            tipo: caracteristica.tipo,
            unidade: caracteristica.unidade,
            opcoes: caracteristica.opcoes,
            uso,
            cadastrosComValor: comValor,
          }}
        />
      </div>
    </>
  );
}
