import { ChevronLeft, ChevronRight, Package, Plus, Search, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { FiltrosDoInventario } from "@/components/inventario/filtros";
import { ComPainel, PainelCarregando, PainelDoItem } from "@/components/inventario/painel-do-item";
import { TabelaDeItens } from "@/components/inventario/tabela-de-itens";
import { RelatorioDeConferencia } from "@/components/relatorios/conferencia";
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
import { comItem, itemDoEndereco } from "@/lib/itens/painel";
import { listarTipos } from "@/lib/itens/tipos";
import { NOME_DA_CATEGORIA, NOME_DA_CONDICAO, NOME_DO_STATUS } from "@/lib/itens/valores";
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
  const parametros = await searchParams;
  const filtros = lerFiltros(parametros);
  const filtrado = temFiltro(filtros);
  const aberto = itemDoEndereco(parametros);

  const db = obterBanco();
  const [totais, itens, tipos, locais, pessoa] = await Promise.all([
    totaisDoInventario(db),
    listarItens(db, filtros),
    listarTipos(db),
    listarLocais(db),
    filtros.pessoa ? obterColaborador(db, filtros.pessoa) : null,
  ]);

  const lista = enderecoDoInventario(filtros);
  // Os filtros da tela em frases curtas, para a janela do relatório.
  const resumoDosFiltros = [
    filtros.categoria ? NOME_DA_CATEGORIA[filtros.categoria].filtro : null,
    filtros.tipo ? (tipos.find((t) => t.id === filtros.tipo)?.nome ?? null) : null,
    filtros.status ? NOME_DO_STATUS[filtros.status] : null,
    filtros.condicao ? NOME_DA_CONDICAO[filtros.condicao] : null,
    filtros.local === "sem" ? "Sem local definido" : filtros.local ? (locais.find((l) => l.id === filtros.local)?.caminho ?? null) : null,
    pessoa ? `Com ${pessoa.nome}` : null,
    filtros.busca ? `Busca “${filtros.busca}”` : null,
  ].filter((t): t is string => Boolean(t));
  const painel = aberto ? (
    <Suspense key={aberto} fallback={<PainelCarregando />}>
      <PainelDoItem codigo={aberto} lista={lista} codigos={itens.itens.map((i) => i.codigo)} />
    </Suspense>
  ) : null;

  return (
    <ComPainel painel={painel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina titulo="Inventário" subtitulo={resumoDoInventario(totais, itens.total, filtrado)} />
        <div className="flex flex-wrap gap-2">
          <RelatorioDeConferencia
            origem="itens"
            filtrosAtuais={Object.fromEntries(new URLSearchParams(lista.split("?")[1] ?? "").entries())}
            resumoDosFiltros={resumoDosFiltros}
            locais={locais.map(({ id, caminho }) => ({ id, caminho }))}
          />
          <Link href="/inventario/importar" className={classesDoBotao("secundario")}>
            <Upload aria-hidden="true" />
            Importação
          </Link>
        </div>
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
        {itens.itens.length > 0 ? (
          <TabelaDeItens
            itens={itens.itens}
            linkDoItem={(item) => comItem(lista, item.codigo)}
            selecionado={aberto}
          />
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

      {itens.paginas > 1 ? (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-4">
          <p className="text-13 text-gray-500">
            Página {itens.pagina} de {itens.paginas}
          </p>
          <div className="flex gap-2">
            {itens.pagina > 1 ? (
              <Link
                href={enderecoDoInventario({ ...filtros, pagina: itens.pagina - 1 })}
                className={classesDoBotao("secundario")}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </Link>
            ) : null}
            {itens.pagina < itens.paginas ? (
              <Link
                href={enderecoDoInventario({ ...filtros, pagina: itens.pagina + 1 })}
                className={classesDoBotao("secundario")}
              >
                Próxima
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </ComPainel>
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
