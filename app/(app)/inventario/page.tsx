import { ChevronLeft, ChevronRight, Package, Plus, Search, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { FiltrosDoInventario } from "@/components/inventario/filtros";
import { TabelaDeItens } from "@/components/inventario/tabela-de-itens";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterColaborador } from "@/lib/colaboradores/servico";
import { obterBanco } from "@/lib/db";
import {
  enderecoDoInventario,
  lerFiltros,
  listarItens,
  resumoDoInventario,
  temFiltro,
  totaisDoInventario,
} from "@/lib/itens/consultas";
import { listarTipos } from "@/lib/itens/tipos";
import { listarLocais } from "@/lib/locais/servico";

export const metadata: Metadata = { title: "Inventário" };

export default function PaginaInventario({ searchParams }: PageProps<"/inventario">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Inventario searchParams={searchParams} />
    </Suspense>
  );
}

async function Inventario({ searchParams }: Pick<PageProps<"/inventario">, "searchParams">) {
  await exigirSessao();
  const filtros = lerFiltros(await searchParams);
  const filtrado = temFiltro(filtros);

  const db = obterBanco();
  const [totais, lista, tipos, locais, pessoa] = await Promise.all([
    totaisDoInventario(db),
    listarItens(db, filtros),
    listarTipos(db),
    listarLocais(db),
    filtros.pessoa ? obterColaborador(db, filtros.pessoa) : null,
  ]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina titulo="Inventário" subtitulo={resumoDoInventario(totais, lista.total, filtrado)} />
        <Link href="/inventario/importar" className={classesDoBotao("secundario")}>
          <Upload aria-hidden="true" />
          Importação
        </Link>
      </div>

      <div className="mt-8">
        <FiltrosDoInventario
          filtros={filtros}
          tipos={tipos.map(({ id, nome, categoria }) => ({ id, nome, categoria }))}
          locais={locais.map(({ id, caminho }) => ({ id, caminho }))}
          pessoa={pessoa?.nome}
        />
      </div>

      <div className="mt-6">
        {lista.itens.length > 0 ? (
          <TabelaDeItens itens={lista.itens} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white">
            {filtrado ? (
              <EstadoVazio
                icone={Search}
                titulo="Nenhum item encontrado"
                texto="Tente outra busca ou outros filtros."
                acao={
                  <Link href="/inventario" className={classesDoBotao("secundario")}>
                    Limpar filtros
                  </Link>
                }
              />
            ) : (
              <EstadoVazio
                icone={Package}
                titulo="Nenhum item cadastrado"
                texto="Cadastre o primeiro equipamento para começar."
                acao={
                  <Link href="/inventario/novo" className={classesDoBotao("secundario")}>
                    <Plus aria-hidden="true" />
                    Novo item
                  </Link>
                }
              />
            )}
          </div>
        )}
      </div>

      {lista.paginas > 1 ? (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-4">
          <p className="text-13 text-gray-500">
            Página {lista.pagina} de {lista.paginas}
          </p>
          <div className="flex gap-2">
            {lista.pagina > 1 ? (
              <Link
                href={enderecoDoInventario({ ...filtros, pagina: lista.pagina - 1 })}
                className={classesDoBotao("secundario")}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </Link>
            ) : null}
            {lista.pagina < lista.paginas ? (
              <Link
                href={enderecoDoInventario({ ...filtros, pagina: lista.pagina + 1 })}
                className={classesDoBotao("secundario")}
              >
                Próxima
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}

function Carregando() {
  return (
    <div aria-hidden="true">
      <CabecalhoCarregando />
      <div className="mt-8 h-9 w-full max-w-xl rounded-lg bg-gray-100" />
      <div className="mt-6 h-80 rounded-xl border border-gray-200 bg-white" />
    </div>
  );
}
