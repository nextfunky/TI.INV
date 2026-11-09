import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import type { Caracteristica } from "@/lib/caracteristicas/valores";
import { cx } from "@/lib/classes";
import { NOME_DA_CONDICAO } from "@/lib/itens/valores";
import { comMaterial } from "@/lib/materiais/filtros";
import type { MaterialDoResumo } from "@/lib/materiais/resumo";
import { GRUPOS, NOME_DO_GRUPO, type Grupo } from "@/lib/materiais/valores";
import { juntar, plural } from "@/lib/texto/plural";

import { EtiquetasDasCaracteristicas } from "../caracteristicas/etiquetas";

const numero = (n: number) => n.toLocaleString("pt-BR");

/**
 * A lista de materiais: um bloco por grupo e, dentro dele, um subtítulo por
 * condição (Novo, Usado… e sem condição). A linha abre o painel do material.
 */
export function ListaDeMateriais({
  lista,
  aberto,
  endereco,
  caracteristicasPorGrupo,
}: {
  lista: MaterialDoResumo[];
  aberto: number | null;
  endereco: string;
  caracteristicasPorGrupo: Partial<Record<Grupo, Caracteristica[]>>;
}) {
  // A lista já vem em ordem de grupo: aqui só separa os grupos para os títulos.
  const grupos = GRUPOS.map((g) => ({ grupo: g, materiais: lista.filter((m) => m.grupo === g) })).filter((g) => g.materiais.length);
  return (
      <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
              <th scope="col" className="py-3 pr-4 pl-6 font-medium">
                Material
              </th>
              <th scope="col" className={cx("w-56 py-3 pr-4 font-medium", aberto !== null && "max-xl:hidden")}>
                Local
              </th>
              <th scope="col" className="w-28 py-3 pr-4 text-right font-medium">
                Quantidade
              </th>
              <th scope="col" className="w-12 py-3 pr-6">
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          {grupos.map(({ grupo, materiais }) => (
            <tbody key={grupo}>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th scope="colgroup" colSpan={4} className="py-2 pr-6 pl-6 text-13 font-medium text-gray-600">
                  {NOME_DO_GRUPO[grupo]} <span className="font-normal text-gray-500">· {materiais.length}</span>
                </th>
              </tr>
              {materiais.map((m, i) => {
                // Um subtítulo quando a condição muda (a lista já vem na ordem: Novo, Bom, Usado… e sem condição).
                const novaCondicao = i === 0 || materiais[i - 1].condicao !== m.condicao;
                const daCondicao = materiais.filter((x) => x.condicao === m.condicao);
                const selecionado = m.id === aberto;
                return (
                  <Fragment key={m.id}>
                  {novaCondicao ? (
                    <tr className="border-b border-gray-100">
                      <th scope="rowgroup" colSpan={4} className="py-1.5 pr-6 pl-6 text-left text-12 font-medium tracking-wide text-gray-500 uppercase">
                        {m.condicao ? NOME_DA_CONDICAO[m.condicao] : "Condição não informada"}
                        <span className="font-normal normal-case"> · {plural(daCondicao.length, "material", "materiais")}, {numero(daCondicao.reduce((s, x) => s + x.quantidade, 0))} un.</span>
                      </th>
                    </tr>
                  ) : null}
                  <tr
                    aria-current={selecionado ? "true" : undefined}
                    className={cx(
                      "group relative border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50",
                      selecionado && "bg-gray-50 shadow-[inset_3px_0_0_var(--color-accent)]",
                    )}
                  >
                    <td className="py-2.5 pr-4 pl-6 align-middle">
                      <Link
                        href={comMaterial(endereco, m.id)}
                        scroll={false}
                        className="font-medium text-gray-900 after:absolute after:inset-0 after:content-['']"
                      >
                        {m.nome}
                      </Link>
                      {m.marcaModelo || m.compativelCom ? (
                        <p className="text-13 text-gray-500">
                          {juntar(m.marcaModelo, m.compativelCom ? `para ${m.compativelCom}` : null)}
                        </p>
                      ) : null}
                      <EtiquetasDasCaracteristicas caracteristicas={caracteristicasPorGrupo[m.grupo]} valores={m.caracteristicas} />
                    </td>
                    <td className={cx("max-w-56 py-2.5 pr-4 align-middle", aberto !== null && "max-xl:hidden")}>
                      <p className="truncate text-gray-600">{m.caminho ?? <span className="text-gray-500">Sem local definido</span>}</p>
                    </td>
                    <td
                      className={cx(
                        "py-2.5 pr-4 text-right align-middle font-mono tabular-nums",
                        m.quantidade === 0 ? "text-gray-400" : "text-gray-900",
                      )}
                    >
                      {numero(m.quantidade)}
                    </td>
                    <td className="py-2.5 pr-6 align-middle">
                      <ChevronRight aria-hidden="true" className="size-4 text-gray-300 group-hover:text-gray-500" />
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
  );
}
