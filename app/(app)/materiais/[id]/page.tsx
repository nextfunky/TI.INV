import { Boxes, MapPin, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando } from "@/components/cabecalho-da-pagina";
import { BotoesDeMovimento } from "@/components/materiais/movimentos";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { cx } from "@/lib/classes";
import { listarParaEscolha } from "@/lib/colaboradores/servico";
import { obterBanco } from "@/lib/db";
import { NOME_DA_CONDICAO } from "@/lib/itens/valores";
import { movimentosDoMaterial, obterMaterial } from "@/lib/materiais/servico";
import { NOME_DO_GRUPO, NOME_DO_MOVIMENTO } from "@/lib/materiais/valores";
import { formatarDataHora } from "@/lib/texto/data";
import { juntar } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Material" };

type Props = PageProps<"/materiais/[id]">;

export default function PaginaDoMaterial({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-40 rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Material params={params} />
    </Suspense>
  );
}

const numero = (n: number) => n.toLocaleString("pt-BR");

/** "+5" na entrada, "−2" na saída e a diferença (com sinal) no ajuste. */
function variacao(tipo: "entrada" | "saida" | "ajuste", quantidade: number): string {
  const valor = tipo === "saida" ? -quantidade : quantidade;
  return valor > 0 ? `+${numero(valor)}` : `−${numero(-valor)}`;
}

async function Material({ params }: Pick<Props, "params">) {
  await exigirSessao();
  const id = Number((await params).id);
  const db = obterBanco();
  const material = Number.isInteger(id) && id > 0 ? await obterMaterial(db, id) : null;
  if (!material) notFound();
  const [movimentos, pessoas] = await Promise.all([movimentosDoMaterial(db, id), listarParaEscolha(db)]);

  return (
    <>
      <Trilha partes={[{ rotulo: "Materiais", href: "/materiais" }, { rotulo: material.nome }]} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-gray-100 text-gray-600">
            <Boxes aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] break-words">{material.nome}</h1>
            <p className="mt-1 text-gray-500">
              {juntar(
                material.marcaModelo,
                NOME_DO_GRUPO[material.grupo],
                material.condicao ? NOME_DA_CONDICAO[material.condicao] : null,
              )}
            </p>
          </div>
        </div>
        <Link href={`/materiais/${id}/editar`} className={classesDoBotao("secundario")}>
          <Pencil aria-hidden="true" />
          Editar
        </Link>
      </div>

      <section
        aria-label="Estoque"
        className="mt-8 flex flex-wrap items-center justify-between gap-6 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div>
          <p className="flex items-baseline gap-2">
            <span className={cx("text-32 font-semibold tabular-nums", material.quantidade === 0 && "text-gray-400")}>
              {numero(material.quantidade)}
            </span>
            <span className="text-gray-500">em estoque</span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-13 text-gray-500">
            <MapPin aria-hidden="true" className="size-3.5" />
            {material.localId && material.caminho ? (
              <Link href={`/locais/${material.localId}`} className="transition-colors duration-150 hover:text-gray-900">
                {material.caminho}
              </Link>
            ) : (
              "Sem local definido"
            )}
          </p>
        </div>
        <BotoesDeMovimento
          material={{ id, nome: material.nome, quantidade: material.quantidade }}
          pessoas={pessoas.map(({ id: i, nome }) => ({ id: i, nome }))}
        />
      </section>

      {material.observacoes ? (
        <section className="mt-10">
          <h2 className="px-6 pb-3 text-base font-semibold">Observações</h2>
          <p className="rounded-xl border border-gray-200 bg-white px-6 py-5 whitespace-pre-line text-gray-700">
            {material.observacoes}
          </p>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="px-6 pb-3 text-base font-semibold">Histórico</h2>
        {movimentos.length ? (
          <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
                  <th scope="col" className="w-40 py-3 pr-4 pl-6 font-medium">
                    Data
                  </th>
                  <th scope="col" className="w-44 py-3 pr-4 font-medium">
                    Movimento
                  </th>
                  <th scope="col" className="w-24 py-3 pr-4 text-right font-medium">
                    Qtd.
                  </th>
                  <th scope="col" className="w-24 py-3 pr-4 text-right font-medium">
                    Saldo
                  </th>
                  <th scope="col" className="py-3 pr-6 font-medium">
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-3 pr-4 pl-6 align-top text-13 whitespace-nowrap text-gray-500 tabular-nums">
                      {formatarDataHora(m.criadoEm)}
                    </td>
                    <td className="py-3 pr-4 align-top text-gray-700">{NOME_DO_MOVIMENTO[m.tipo]}</td>
                    <td className="py-3 pr-4 text-right align-top font-mono text-13 tabular-nums">{variacao(m.tipo, m.quantidade)}</td>
                    <td className="py-3 pr-4 text-right align-top font-mono text-13 text-gray-500 tabular-nums">{numero(m.saldo)}</td>
                    <td className="py-3 pr-6 align-top text-gray-600">
                      {m.pessoa ? (
                        <Link href={`/colaboradores/${m.pessoa.id}`} className="font-medium text-gray-900 hover:text-accent">
                          {m.pessoa.nome}
                        </Link>
                      ) : null}
                      {m.pessoa && m.observacao ? <span aria-hidden="true"> · </span> : null}
                      {m.observacao}
                      {!m.pessoa && !m.observacao ? <span className="text-gray-400">—</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white">
            <p className="px-6 py-5 text-gray-500">Nenhum movimento ainda. Use Entrada quando chegar material.</p>
          </div>
        )}
      </section>
    </>
  );
}
