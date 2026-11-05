import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDoItem } from "@/components/inventario/formulario-do-item";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { tituloDoItem } from "@/lib/itens/nomes";
import { obterItemPorCodigo } from "@/lib/itens/servico";
import { listarParaEscolha } from "@/lib/colaboradores/servico";
import { listarTipos } from "@/lib/itens/tipos";

type Props = PageProps<"/inventario/[codigo]/editar">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  return { title: `Editar ${decodeURIComponent(codigo).toUpperCase()}` };
}

export default function PaginaEditarItem({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-[640px] rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Edicao params={params} />
    </Suspense>
  );
}

async function Edicao({ params }: Pick<Props, "params">) {
  await exigirSessao();
  const { codigo } = await params;
  const db = obterBanco();
  const item = await obterItemPorCodigo(db, decodeURIComponent(codigo));
  if (!item) notFound();
  if (item.codigo !== codigo) redirect(`/inventario/${item.codigo}/editar`);

  const [tipos, pessoas] = await Promise.all([listarTipos(db), listarParaEscolha(db)]);
  const titulo = tituloDoItem(item);
  const iniciais: Record<string, string> = {
    tipoId: String(item.tipoId),
    marca: item.marca ?? "",
    modelo: item.modelo ?? "",
    numeroSerie: item.numeroSerie ?? "",
    usuarioId: item.usuarioId ? String(item.usuarioId) : "",
    status: item.status,
    condicao: item.condicao ?? "",
    hostname: item.hostname ?? "",
    processador: item.processador ?? "",
    memoriaRam: item.memoriaRam ?? "",
    armazenamento: item.armazenamento ?? "",
    sistemaOperacional: item.sistemaOperacional ?? "",
    dataCompra: item.dataCompra ?? "",
    garantiaAte: item.garantiaAte ?? "",
    observacoes: item.observacoes ?? "",
  };

  return (
    <>
      <Trilha
        partes={[
          { rotulo: "Inventário", href: "/inventario" },
          { rotulo: item.codigo, href: `/inventario/${item.codigo}`, mono: true },
          { rotulo: "Editar" },
        ]}
      />
      <CabecalhoDaPagina
        titulo={`Editar ${titulo}`}
        subtitulo={
          <>
            <span className="font-mono">{item.codigo}</span> · {item.tipo.nome}
          </>
        }
      />
      <div className="mt-8">
        <FormularioDoItem
          tipos={tipos.map(({ id, nome, categoria }) => ({ id, nome, categoria }))}
          pessoas={pessoas}
          iniciais={iniciais}
          item={{ id: item.id, codigo: item.codigo, titulo }}
        />
      </div>
    </>
  );
}
