import Link from "next/link";

import type { Resumo } from "@/lib/resumo/tabela";

const numero = (n: number) => n.toLocaleString("pt-BR");

/**
 * A tabela cruzada do Resumo. Cada número leva à lista já filtrada por aquela
 * linha e coluna (para ver um por um). Zero aparece como "·".
 */
export function TabelaDoResumo({
  resumo,
  rotulosDasLinhas,
  rotuloDaColuna,
  endereco,
  unidade,
}: {
  resumo: Resumo;
  rotulosDasLinhas: string[];
  rotuloDaColuna: string | null;
  /** O endereço da lista com os filtros da célula. */
  endereco: (filtro: Record<string, string>) => string;
  /** "un." (materiais) ou "itens". */
  unidade: string;
}) {
  const celula = (valor: number, filtro: Record<string, string>, forte = false) =>
    valor ? (
      <Link href={endereco(filtro)} className={forte ? "font-semibold text-gray-900 hover:text-accent" : "text-gray-900 hover:text-accent hover:underline"}>
        {numero(valor)}
      </Link>
    ) : (
      <span className="text-gray-300">·</span>
    );

  return (
    <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white print:overflow-visible print:rounded-none">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Resumo: {rotulosDasLinhas.join(" e ")}
          {rotuloDaColuna ? ` por ${rotuloDaColuna}` : ""}, em {unidade}
        </caption>
        <thead>
          <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
            {rotulosDasLinhas.map((r) => (
              <th key={r} scope="col" className="py-3 pr-4 pl-6 font-medium whitespace-nowrap first:pl-6">
                {r}
              </th>
            ))}
            {resumo.colunas.map((c) => (
              <th key={c.chave ?? "sem"} scope="col" className="px-3 py-3 text-right font-medium whitespace-nowrap">
                {c.rotulo}
              </th>
            ))}
            <th scope="col" className="py-3 pr-6 pl-3 text-right font-semibold whitespace-nowrap text-gray-700">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {resumo.linhas.map((l, i) => {
            const filtroDaLinha = Object.assign({}, ...l.eixos.map((e) => e.filtro));
            // Quando a primeira dimensão repete a da linha de cima, ela não se repete (fica mais fácil de ler).
            const repete = i > 0 && rotulosDasLinhas.length > 1 && resumo.linhas[i - 1].eixos[0].chave === l.eixos[0].chave;
            return (
              <tr key={i} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                {l.eixos.map((e, j) => (
                  <th
                    key={j}
                    scope="row"
                    className={
                      j === 0
                        ? `py-2.5 pr-4 pl-6 align-top font-medium ${repete ? "text-transparent select-none" : ""} ${e.chave === null ? "text-gray-500" : ""}`
                        : `py-2.5 pr-4 align-top font-normal ${e.chave === null ? "text-gray-500" : "text-gray-700"}`
                    }
                  >
                    {e.rotulo}
                  </th>
                ))}
                {l.celulas.map((v, j) => (
                  <td key={j} className="px-3 py-2.5 text-right font-mono text-13 tabular-nums">
                    {celula(v, { ...filtroDaLinha, ...resumo.colunas[j].filtro })}
                  </td>
                ))}
                <td className="py-2.5 pr-6 pl-3 text-right font-mono text-13 tabular-nums">{celula(l.total, filtroDaLinha, true)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300 bg-gray-50 text-13">
            <th scope="row" colSpan={rotulosDasLinhas.length} className="py-2.5 pr-4 pl-6 font-semibold">
              Total
            </th>
            {resumo.totaisDasColunas.map((v, j) => (
              <td key={j} className="px-3 py-2.5 text-right font-mono tabular-nums">
                {celula(v, resumo.colunas[j].filtro, true)}
              </td>
            ))}
            <td className="py-2.5 pr-6 pl-3 text-right font-mono font-semibold tabular-nums">{numero(resumo.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
