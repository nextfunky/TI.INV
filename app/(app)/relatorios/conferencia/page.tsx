import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { classesDoBotao } from "@/components/botao";
import { BotaoImprimir } from "@/components/relatorios/botao-imprimir";
import { exigirSessao } from "@/lib/auth/sessao";
import { etiquetasDasCaracteristicas } from "@/lib/caracteristicas/regras";
import { listarCaracteristicas, porGrupo, porTipo } from "@/lib/caracteristicas/servico";
import { obterBanco } from "@/lib/db";
import { NOME_DA_CONDICAO, NOME_DO_STATUS } from "@/lib/itens/valores";
import { NOME_DO_GRUPO } from "@/lib/materiais/valores";
import { dadosDaConferencia } from "@/lib/relatorios/conferencia";
import { lerPedidoDeConferencia } from "@/lib/relatorios/pedido";
import { formatarDataHora } from "@/lib/texto/data";
import { juntar, plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Conferência" };

type Props = PageProps<"/relatorios/conferencia">;

export default function PaginaDaConferencia({ searchParams }: Props) {
  return (
    <Suspense fallback={<div aria-hidden="true" className="mx-auto h-[600px] max-w-[210mm] rounded-xl border border-gray-200 bg-white" />}>
      <Conferencia searchParams={searchParams} />
    </Suspense>
  );
}

/** A caixinha para marcar à mão, no papel. */
function Caixinha() {
  return <span aria-hidden="true" className="inline-block size-3.5 rounded-[3px] border border-gray-500 align-middle" />;
}

const CELULA = "border-b border-gray-200 px-2 py-1.5 align-top";
const CABECALHO = "border-b border-gray-400 px-2 py-1.5 text-left text-11 font-semibold tracking-wide text-gray-600 uppercase";

function Grupo({ titulo, total, children }: { titulo: string; total: string; children: ReactNode }) {
  return (
    <section className="mt-6 break-inside-auto first:mt-4">
      <h3 className="flex items-baseline justify-between border-b-2 border-gray-900 pb-1 text-sm font-semibold break-after-avoid">
        {titulo}
        <span className="text-12 font-normal text-gray-600">{total}</span>
      </h3>
      {children}
    </section>
  );
}

async function Conferencia({ searchParams }: Pick<Props, "searchParams">) {
  await exigirSessao();
  const pedido = lerPedidoDeConferencia(await searchParams);
  const db = obterBanco();
  const [dados, caracteristicas] = await Promise.all([dadosDaConferencia(db, pedido), listarCaracteristicas(db)]);
  const caracteristicasPorTipo = porTipo(caracteristicas);
  const caracteristicasPorGrupo = porGrupo(caracteristicas);
  const geradoEm = formatarDataHora(new Date());

  return (
    <>
      {/* Só na tela: voltar e imprimir. */}
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={pedido.materiais && !pedido.itens ? "/materiais" : "/inventario"} className={classesDoBotao("secundario")}>
          <ArrowLeft aria-hidden="true" />
          Voltar
        </Link>
        <BotaoImprimir />
      </div>

      <article className="mx-auto max-w-[210mm] rounded-xl border border-gray-200 bg-white p-4 text-12 sm:p-8 text-gray-900 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="border-b border-gray-300 pb-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-semibold">Conferência de inventário</h1>
            <p className="text-12 text-gray-600">Gerado em {geradoEm}</p>
          </div>
          <p className="mt-1 text-12 text-gray-600">{dados.filtros.length ? dados.filtros.join(" · ") : "Todos os itens e materiais"}</p>
          <p className="mt-1 text-12 font-medium">
            {juntar(
              dados.itens ? plural(dados.itens.total, "item", "itens") : null,
              dados.materiais
                ? `${plural(dados.materiais.total, "material", "materiais")} (${plural(dados.materiais.unidades, "unidade", "unidades")})`
                : null,
            )}
          </p>
        </header>

        {dados.itens ? (
          <section aria-label="Itens">
            <h2 className="mt-5 text-base font-semibold">Itens</h2>
            {dados.itens.porTipo.length ? (
              dados.itens.porTipo.map(({ tipo, itens }) => (
                <Grupo key={tipo} titulo={tipo} total={plural(itens.length, "item", "itens")}>
                  <div className="overflow-x-auto print:overflow-visible">
                  <table className="mt-1 w-full min-w-[640px] border-collapse print:min-w-0">
                    <thead>
                      <tr>
                        <th className={`${CABECALHO} w-6`}>
                          <span className="sr-only">Conferido</span>✓
                        </th>
                        <th className={`${CABECALHO} w-20`}>Código</th>
                        <th className={CABECALHO}>Descrição</th>
                        <th className={`${CABECALHO} w-28`}>Nº de série</th>
                        <th className={`${CABECALHO} w-40`}>Usuário e local</th>
                        <th className={`${CABECALHO} w-28`}>Situação</th>
                        <th className={`${CABECALHO} w-32`}>Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item) => (
                        <tr key={item.id} className="break-inside-avoid">
                          <td className={CELULA}>
                            <Caixinha />
                          </td>
                          <td className={`${CELULA} font-mono text-11`}>{item.codigo}</td>
                          <td className={CELULA}>
                            {[item.marca, item.modelo].filter(Boolean).join(" ") || <span className="text-gray-500">—</span>}
                            {item.tipo.categoria === "computador" && item.hostname ? (
                              <span className="block font-mono text-11 text-gray-600">{item.hostname}</span>
                            ) : null}
                            {etiquetasDasCaracteristicas(caracteristicasPorTipo[item.tipoId] ?? [], item.caracteristicas).length ? (
                              <span className="block text-11 text-gray-600">
                                {etiquetasDasCaracteristicas(caracteristicasPorTipo[item.tipoId] ?? [], item.caracteristicas).join(" · ")}
                              </span>
                            ) : null}
                          </td>
                          <td className={`${CELULA} font-mono text-11`}>{item.numeroSerie ?? ""}</td>
                          <td className={CELULA}>
                            {item.usuario ? <span className="block">{item.usuario.nome}</span> : null}
                            <span className="block text-gray-600">{item.local?.caminho ?? "Sem local definido"}</span>
                          </td>
                          <td className={CELULA}>
                            {juntar(NOME_DO_STATUS[item.status], item.condicao ? NOME_DA_CONDICAO[item.condicao] : null)}
                          </td>
                          <td className={`${CELULA} border-l border-l-gray-100`} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </Grupo>
              ))
            ) : (
              <p className="mt-2 text-gray-600">Nenhum item com estes filtros.</p>
            )}
          </section>
        ) : null}

        {dados.materiais ? (
          <section aria-label="Materiais" className={dados.itens ? "mt-8 break-before-page" : undefined}>
            <h2 className="mt-5 text-base font-semibold">Materiais</h2>
            {dados.materiais.porGrupo.length ? (
              dados.materiais.porGrupo.map(({ grupo, materiais }) => (
                <Grupo key={grupo} titulo={NOME_DO_GRUPO[grupo]} total={plural(materiais.length, "material", "materiais")}>
                  <div className="overflow-x-auto print:overflow-visible">
                  <table className="mt-1 w-full min-w-[640px] border-collapse print:min-w-0">
                    <thead>
                      <tr>
                        <th className={`${CABECALHO} w-6`}>
                          <span className="sr-only">Conferido</span>✓
                        </th>
                        <th className={CABECALHO}>Material</th>
                        <th className={`${CABECALHO} w-44`}>Local</th>
                        <th className={`${CABECALHO} w-20`}>Condição</th>
                        <th className={`${CABECALHO} w-20 text-right`}>No sistema</th>
                        <th className={`${CABECALHO} w-20 text-right`}>Contado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materiais.map((m) => (
                        <tr key={m.id} className="break-inside-avoid">
                          <td className={CELULA}>
                            <Caixinha />
                          </td>
                          <td className={CELULA}>
                            {m.nome}
                            {m.marcaModelo ? <span className="text-gray-600"> · {m.marcaModelo}</span> : null}
                            {m.compativelCom ? <span className="block text-11 text-gray-600">Compatível com {m.compativelCom}</span> : null}
                            {etiquetasDasCaracteristicas(caracteristicasPorGrupo[m.grupo] ?? [], m.caracteristicas).length ? (
                              <span className="block text-11 text-gray-600">
                                {etiquetasDasCaracteristicas(caracteristicasPorGrupo[m.grupo] ?? [], m.caracteristicas).join(" · ")}
                              </span>
                            ) : null}
                          </td>
                          <td className={CELULA}>{m.caminho ?? <span className="text-gray-600">Sem local definido</span>}</td>
                          <td className={CELULA}>{m.condicao ? NOME_DA_CONDICAO[m.condicao] : <span className="text-gray-500">Não informada</span>}</td>
                          <td className={`${CELULA} text-right font-mono tabular-nums`}>{m.quantidade.toLocaleString("pt-BR")}</td>
                          <td className={CELULA}>
                            <span aria-hidden="true" className="ml-auto block h-4 w-14 border-b border-gray-500" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </Grupo>
              ))
            ) : (
              <p className="mt-2 text-gray-600">Nenhum material com estes filtros.</p>
            )}
          </section>
        ) : null}

        <footer className="mt-10 grid grid-cols-1 gap-6 text-12 break-inside-avoid sm:grid-cols-3 print:grid-cols-3">
          <p>
            Conferido por: <span className="inline-block w-40 border-b border-gray-500 align-bottom" />
          </p>
          <p>
            Assinatura: <span className="inline-block w-40 border-b border-gray-500 align-bottom" />
          </p>
          <p>Data: ____/____/________</p>
        </footer>
      </article>
    </>
  );
}
