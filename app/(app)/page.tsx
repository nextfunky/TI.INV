import { Check, Shield, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { Ponto } from "@/components/status";
import { exigirSessao } from "@/lib/auth/sessao";
import { cx } from "@/lib/classes";
import { obterBanco } from "@/lib/db";
import { textoPorCategoria } from "@/lib/itens/consultas";
import { avisoDeGarantia } from "@/lib/itens/garantia";
import { painelDoInicio } from "@/lib/itens/inicio";
import { nomeCompletoDoItem, tituloDoItem } from "@/lib/itens/nomes";
import type { Status } from "@/lib/itens/valores";
import { dataPorExtenso, formatarData, hojeEmSaoPaulo, saudacao, tempoDesde } from "@/lib/texto/data";
import { juntar, plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Início" };

/** O painel do dia. */
export default function PaginaInicio() {
  return (
    <Suspense fallback={<Carregando />}>
      <Painel />
    </Suspense>
  );
}

const CARTAO = "rounded-xl border border-gray-200 bg-white transition-[border-color,box-shadow] duration-150 hover:border-gray-300 hover:shadow-cartao";

function Numero({
  href,
  rotulo,
  status,
  numero,
  detalhe,
}: {
  href: string;
  rotulo: string;
  status?: Status;
  numero: number;
  detalhe: string;
}) {
  return (
    <Link href={href} className="flex flex-col gap-2 bg-white p-6 transition-colors duration-150 hover:bg-gray-50">
      <span className="flex items-center gap-2 text-13 text-gray-500">
        {status ? <Ponto status={status} /> : null}
        {rotulo}
      </span>
      <span className="text-32 font-semibold tracking-[-0.02em] tabular-nums">{numero}</span>
      <span className="min-h-[18px] truncate text-13 text-gray-500">{detalhe}</span>
    </Link>
  );
}

function LinhaDeAtencao({
  href,
  icone,
  destaque,
  titulo,
  detalhe,
}: {
  href: string;
  icone: ReactNode;
  destaque?: boolean;
  titulo: string;
  detalhe: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3.5 rounded-lg px-4 py-3 transition-colors duration-150 hover:bg-gray-50"
      >
        <span
          className={cx(
            "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
            destaque ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600",
          )}
        >
          {icone}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{titulo}</span>
          <span className="block truncate text-13 text-gray-500">{detalhe}</span>
        </span>
        <span className="text-13 font-medium text-accent">Ver</span>
      </Link>
    </li>
  );
}

async function Painel() {
  await exigirSessao();
  const agora = new Date();
  const hoje = hojeEmSaoPaulo(agora);
  const p = await painelDoInicio(obterBanco(), hoje);

  const manutencao = p.itensEmManutencao;
  const temAtencao = p.emManutencao > 0 || p.garantias.length > 0;

  return (
    <>
      <CabecalhoDaPagina titulo={saudacao(agora)} subtitulo={dataPorExtenso(agora)} />

      <section
        aria-label="Resumo"
        className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
      >
        <Numero
          href="/inventario"
          rotulo="Total de itens"
          numero={p.total}
          detalhe={textoPorCategoria(p.porCategoria, " · ") || "nenhum ainda"}
        />
        <Numero
          href="/inventario?status=em_uso"
          rotulo="Em uso"
          status="em_uso"
          numero={p.emUso}
          detalhe={
            p.pessoasComItensEmUso
              ? `com ${plural(p.pessoasComItensEmUso, "colaborador", "colaboradores")}`
              : ""
          }
        />
        <Numero
          href="/inventario?status=em_estoque"
          rotulo="Em estoque"
          status="em_estoque"
          numero={p.emEstoque}
          detalhe={
            p.emEstoque === 0 ? "nenhum para entregar" : p.emEstoque === 1 ? "pronto para entregar" : "prontos para entregar"
          }
        />
        <Numero
          href="/inventario?status=em_manutencao"
          rotulo="Em manutenção"
          status="em_manutencao"
          numero={p.emManutencao}
          detalhe={manutencao.length ? juntar(...manutencao.map((i) => i.codigo)) : "nenhum"}
        />
      </section>

      <div className="mt-10 flex flex-wrap items-start gap-6">
        <section aria-labelledby="titulo-atencao" className="min-w-0 flex-[999_1_520px]">
          <h2 id="titulo-atencao" className="px-6 pb-3 text-base font-semibold">
            Precisa de atenção
          </h2>
          <div className={CARTAO}>
            {temAtencao ? (
              <ul className="p-2">
                {p.emManutencao > 0 ? (
                  <LinhaDeAtencao
                    href={p.emManutencao === 1 ? `/inventario/${manutencao[0].codigo}` : "/inventario?status=em_manutencao"}
                    icone={<Wrench aria-hidden="true" />}
                    destaque
                    titulo={`${plural(p.emManutencao, "item", "itens")} em manutenção`}
                    detalhe={
                      p.emManutencao === 1
                        ? juntar(manutencao[0].codigo, tituloDoItem(manutencao[0]))
                        : juntar(...manutencao.slice(0, 2).map((i) => i.codigo), p.emManutencao > 2 && "…")
                    }
                  />
                ) : null}
                {p.garantias.map((item) => (
                  <LinhaDeAtencao
                    key={item.id}
                    href={`/inventario/${item.codigo}`}
                    icone={<Shield aria-hidden="true" />}
                    titulo={avisoDeGarantia(item.garantiaAte!, hoje)}
                    detalhe={juntar(item.codigo, tituloDoItem(item), `até ${formatarData(item.garantiaAte!)}`)}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-3.5 px-6 py-5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-uso">
                  <Check aria-hidden="true" className="size-4" />
                </span>
                <span>
                  <span className="block font-medium">Tudo em ordem</span>
                  <span className="block text-13 text-gray-500">
                    Nenhum item em manutenção nem garantia vencendo nos próximos 60 dias.
                  </span>
                </span>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="titulo-recentes" className="min-w-0 flex-[1_1_320px]">
          <h2 id="titulo-recentes" className="px-6 pb-3 text-base font-semibold">
            Atualizados recentemente
          </h2>
          <div className={CARTAO}>
            {p.recentes.length ? (
              <ol className="flex flex-col gap-1 p-3">
                {p.recentes.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/inventario/${item.codigo}`}
                      className="flex gap-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-gray-50"
                    >
                      <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gray-300" />
                      <span className="min-w-0">
                        <span className="block truncate">
                          <span className="font-mono text-13 text-gray-900">{item.codigo}</span> {nomeCompletoDoItem(item)}
                        </span>
                        <span className="block text-13 text-gray-500">{tempoDesde(item.atualizadoEm, agora)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-6 py-5 text-gray-500">Nenhum item cadastrado ainda.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function Carregando() {
  return (
    <div aria-hidden="true">
      <CabecalhoCarregando />
      <div className="mt-10 h-[134px] rounded-xl border border-gray-200 bg-white" />
      <div className="mt-10 flex flex-wrap gap-6">
        <div className="h-48 flex-[999_1_520px] rounded-xl border border-gray-200 bg-white" />
        <div className="h-48 flex-[1_1_320px] rounded-xl border border-gray-200 bg-white" />
      </div>
    </div>
  );
}
