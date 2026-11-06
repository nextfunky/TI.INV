import { ChevronLeft, ChevronRight, History, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { FiltrosDoHistoricoNaTela } from "@/components/historico/filtros";
import { ListaDoHistorico } from "@/components/historico/lista";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { enderecoDoHistorico, lerFiltrosDoHistorico } from "@/lib/historico/filtros";
import { listarHistorico } from "@/lib/historico/servico";
import { plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Histórico" };

type Props = PageProps<"/historico">;

export default function PaginaDoHistorico({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-80 rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Historico searchParams={searchParams} />
    </Suspense>
  );
}

async function Historico({ searchParams }: Pick<Props, "searchParams">) {
  await exigirSessao();
  const filtros = lerFiltrosDoHistorico(await searchParams);
  const lista = await listarHistorico(obterBanco(), filtros);
  const filtrando = Boolean(filtros.busca || filtros.evento || filtros.item);

  return (
    <>
      <CabecalhoDaPagina
        titulo="Histórico"
        subtitulo={
          lista.total
            ? `${plural(lista.total, "registro", "registros")} · entregas, devoluções, trocas e mudanças de local, gravadas sozinhas`
            : "Cada entrega, devolução, troca de pessoa e mudança de local fica gravada aqui."
        }
      />
      <div className="mt-8">
        <FiltrosDoHistoricoNaTela filtros={filtros} />
      </div>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        {lista.registros.length ? (
          <div className="px-6 py-5">
            <ListaDoHistorico registros={lista.registros} comItem />
          </div>
        ) : filtrando ? (
          <EstadoVazio
            icone={Search}
            titulo="Nenhum registro encontrado"
            texto="Tente outra busca ou outro evento."
            acao={
              <Link href="/historico" className={classesDoBotao("secundario")}>
                Limpar filtros
              </Link>
            }
          />
        ) : (
          <EstadoVazio icone={History} titulo="Nada registrado ainda" texto="Entregue, devolva ou mude um item de local, e ele aparece aqui." />
        )}
      </div>
      {lista.paginas > 1 ? (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-4">
          <p className="text-13 text-gray-500">
            Página {lista.pagina} de {lista.paginas}
          </p>
          <div className="flex gap-2">
            {lista.pagina > 1 ? (
              <Link href={enderecoDoHistorico({ ...filtros, pagina: lista.pagina - 1 })} className={classesDoBotao("secundario")}>
                <ChevronLeft aria-hidden="true" />
                Anterior
              </Link>
            ) : null}
            {lista.pagina < lista.paginas ? (
              <Link href={enderecoDoHistorico({ ...filtros, pagina: lista.pagina + 1 })} className={classesDoBotao("secundario")}>
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
