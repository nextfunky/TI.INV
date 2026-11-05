import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando } from "@/components/cabecalho-da-pagina";
import { EtiquetaDeStatus, PontoDeStatus } from "@/components/status";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { cx } from "@/lib/classes";
import { obterBanco } from "@/lib/db";
import { situacaoDaGarantia } from "@/lib/itens/garantia";
import { tituloDoItem } from "@/lib/itens/nomes";
import { obterItemPorCodigo } from "@/lib/itens/servico";
import { FUSO, formatarData, hojeEmSaoPaulo, tempoDesde } from "@/lib/texto/data";
import { juntar } from "@/lib/texto/plural";

type Props = PageProps<"/inventario/[codigo]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  return { title: decodeURIComponent(codigo).toUpperCase() };
}

export default function PaginaDoItem({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-96 rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Detalhe params={params} />
    </Suspense>
  );
}

/** Um par "rótulo → valor". Valor vazio aparece como "Não informado", em cinza. */
function Dado({ rotulo, vazio = "Não informado", mono, children }: { rotulo: string; vazio?: string; mono?: boolean; children?: ReactNode }) {
  const temValor = children !== null && children !== undefined && children !== "";
  return (
    <div>
      <dt className="text-13 text-gray-500">{rotulo}</dt>
      <dd className={cx("mt-1", !temValor && "text-gray-500", temValor && mono && "font-mono text-13")}>
        {temValor ? children : vazio}
      </dd>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-gray-100 p-6 first:border-t-0">
      <h2 className="text-base font-semibold">{titulo}</h2>
      <dl className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-4">{children}</dl>
    </section>
  );
}

const formatoDeData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });

async function Detalhe({ params }: Pick<Props, "params">) {
  await exigirSessao();
  const { codigo } = await params;
  const item = await obterItemPorCodigo(obterBanco(), decodeURIComponent(codigo));
  if (!item) notFound();
  if (item.codigo !== codigo) redirect(`/inventario/${item.codigo}`);

  const agora = new Date();
  const titulo = tituloDoItem(item);
  const marcaEModelo = [item.marca, item.modelo].filter(Boolean).join(" ");
  const garantia = situacaoDaGarantia(item.garantiaAte, hojeEmSaoPaulo(agora));

  return (
    <>
      <Trilha partes={[{ rotulo: "Inventário", href: "/inventario" }, { rotulo: item.codigo, mono: true }]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-13 text-gray-500">{item.codigo}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] break-words">{titulo}</h1>
            <EtiquetaDeStatus status={item.status} />
          </div>
          <p className="mt-1 text-gray-500">{juntar(item.tipo.nome, marcaEModelo)}</p>
        </div>
        <Link href={`/inventario/${item.codigo}/editar`} className={classesDoBotao("secundario")}>
          <Pencil aria-hidden="true" />
          Editar
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-[999_1_540px] rounded-xl border border-gray-200 bg-white">
          <Secao titulo="Identificação">
            <Dado rotulo="Tipo">{item.tipo.nome}</Dado>
            <Dado rotulo="Marca e modelo">{marcaEModelo}</Dado>
            <Dado rotulo="Nº de série" mono>
              {item.numeroSerie}
            </Dado>
            <Dado rotulo="Status">
              <PontoDeStatus status={item.status} />
            </Dado>
          </Secao>

          {item.tipo.categoria === "computador" ? (
            <Secao titulo="Computador">
              <Dado rotulo="Hostname" mono>
                {item.hostname}
              </Dado>
              <Dado rotulo="Processador">{item.processador}</Dado>
              <Dado rotulo="Memória RAM" vazio="Não informada">
                {item.memoriaRam}
              </Dado>
              <Dado rotulo="Armazenamento">{item.armazenamento}</Dado>
              <Dado rotulo="Sistema operacional">{item.sistemaOperacional}</Dado>
            </Secao>
          ) : null}

          <Secao titulo="Compra e garantia">
            <Dado rotulo="Data de compra" vazio="Não informada">
              {item.dataCompra ? formatarData(item.dataCompra) : null}
            </Dado>
            <Dado rotulo="Garantia até" vazio="Não informada">
              {item.garantiaAte ? (
                <>
                  {formatarData(item.garantiaAte)}
                  {garantia ? (
                    <span className={garantia.vencida ? "text-descartado" : "text-gray-500"}> · {garantia.texto}</span>
                  ) : null}
                </>
              ) : null}
            </Dado>
          </Secao>

          <section className="border-t border-gray-100 p-6">
            <h2 className="text-base font-semibold">Observações</h2>
            <p className={cx("mt-4 whitespace-pre-line", !item.observacoes && "text-gray-500")}>
              {item.observacoes || "Nenhuma observação."}
            </p>
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-13 font-medium text-gray-500">Registro</h2>
            <dl className="mt-3 flex flex-col gap-2">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Cadastrado em</dt>
                <dd>{formatoDeData.format(item.criadoEm)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Última alteração</dt>
                <dd>{tempoDesde(item.atualizadoEm, agora)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
