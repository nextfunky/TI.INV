import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDoItem } from "@/components/inventario/formulario-do-item";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { listarCaracteristicas, porTipo } from "@/lib/caracteristicas/servico";
import { obterBanco } from "@/lib/db";
import { camposParaRepetir, obterItemPorCodigo } from "@/lib/itens/servico";
import { listarParaEscolha } from "@/lib/colaboradores/servico";
import { listarTipos } from "@/lib/itens/tipos";
import { listarLocais } from "@/lib/locais/servico";

export const metadata: Metadata = { title: "Novo item" };

export default function PaginaNovoItem({ searchParams }: PageProps<"/inventario/novo">) {
  return (
    <>
      <Trilha partes={[{ rotulo: "Inventário", href: "/inventario" }, { rotulo: "Novo item" }]} />
      <CabecalhoDaPagina titulo="Novo item" subtitulo="O código é criado automaticamente ao salvar." />
      <div className="mt-8">
        <Suspense fallback={<FormularioCarregando />}>
          <Formulario searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Formulario({ searchParams }: Pick<PageProps<"/inventario/novo">, "searchParams">) {
  await exigirSessao();
  const { repetir } = await searchParams;
  const db = obterBanco();
  const [tipos, pessoas, locais, caracteristicas] = await Promise.all([
    listarTipos(db),
    listarParaEscolha(db),
    listarLocais(db),
    listarCaracteristicas(db),
  ]);

  // Depois de "Salvar e cadastrar outro": repete o que é igual ao item anterior.
  const anterior = typeof repetir === "string" ? await obterItemPorCodigo(db, repetir) : null;
  const iniciais = anterior ? camposParaRepetir(anterior) : { status: "em_estoque" };

  return (
    <FormularioDoItem
      key={anterior?.codigo ?? "novo"}
      tipos={tipos.map(({ id, nome, categoria }) => ({ id, nome, categoria }))}
      pessoas={pessoas}
      locais={locais.map(({ id, caminho }) => ({ id, caminho }))}
      caracteristicasPorTipo={porTipo(caracteristicas)}
      iniciais={iniciais}
      focarNaSerie={Boolean(anterior)}
    />
  );
}

function FormularioCarregando() {
  return <div aria-hidden="true" className="h-[640px] rounded-xl border border-gray-200 bg-white" />;
}
