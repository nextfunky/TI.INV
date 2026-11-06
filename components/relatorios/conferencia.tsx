"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import { CATEGORIAS, NOME_DA_CATEGORIA, type Categoria } from "@/lib/itens/valores";
import { GRUPOS, NOME_DO_GRUPO, type Grupo } from "@/lib/materiais/valores";

import { Botao, classesDoBotao } from "../botao";
import { CampoSelecao } from "../campo";
import { Janela } from "../janela";

const CAIXA = "size-4 rounded border-gray-300 accent-[var(--color-accent)]";

/**
 * "Relatório" → janela "Conferência": escolhe o que conferir (itens, materiais),
 * com os filtros da tela ou escolhendo categorias, grupos e local.
 * Gerar abre o relatório pronto para imprimir numa aba nova.
 */
export function RelatorioDeConferencia({
  origem,
  filtrosAtuais,
  resumoDosFiltros,
  locais,
}: {
  /** De qual tela veio: ela já vem marcada em "O que conferir". */
  origem: "itens" | "materiais";
  /** Os filtros da tela, como vão no endereço do relatório. */
  filtrosAtuais: Record<string, string>;
  /** Os filtros da tela em frases curtas, para mostrar na janela. */
  resumoDosFiltros: string[];
  locais: Array<{ id: number; caminho: string }>;
}) {
  const [aberta, setAberta] = useState(false);
  const [modo, setModo] = useState<"atuais" | "escolher">("atuais");
  const [incluirItens, setIncluirItens] = useState(origem === "itens");
  const [incluirMateriais, setIncluirMateriais] = useState(origem === "materiais");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const nada = !incluirItens && !incluirMateriais;

  function alternar<T>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
  }

  return (
    <>
      <Botao onClick={() => setAberta(true)}>
        <FileText aria-hidden="true" />
        Relatório
      </Botao>
      <Janela aberta={aberta} aoFechar={() => setAberta(false)} rotulo="Conferência" largura="max-w-lg">
        <form
          action="/relatorios/conferencia"
          method="get"
          target="_blank"
          onSubmit={() => setTimeout(() => setAberta(false), 0)}
          className="p-6"
        >
          <h2 className="text-base font-semibold">Conferência</h2>
          <p className="mt-1 text-gray-600">Gera uma lista para imprimir e conferir um por um, com espaço para anotar.</p>

          <fieldset className="mt-5">
            <legend className="text-13 font-medium text-gray-700">O que conferir</legend>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="itens" value="1" checked={incluirItens} onChange={(e) => setIncluirItens(e.target.checked)} className={CAIXA} />
                Itens com código
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="materiais"
                  value="1"
                  checked={incluirMateriais}
                  onChange={(e) => setIncluirMateriais(e.target.checked)}
                  className={CAIXA}
                />
                Materiais
              </label>
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-13 font-medium text-gray-700">Quais</legend>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-start gap-2">
                <input type="radio" name="modo" checked={modo === "atuais"} onChange={() => setModo("atuais")} className={`${CAIXA} mt-0.5`} />
                <span>
                  Usar os filtros da tela
                  <span className="block text-13 text-gray-500">
                    {resumoDosFiltros.length ? resumoDosFiltros.join(" · ") : "Nenhum filtro: entra tudo."}
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="modo" checked={modo === "escolher"} onChange={() => setModo("escolher")} className={CAIXA} />
                Escolher as categorias
              </label>
            </div>
          </fieldset>

          {modo === "atuais" ? (
            Object.entries(filtrosAtuais).map(([chave, valor]) => <input key={chave} type="hidden" name={chave} value={valor} />)
          ) : (
            <div className="mt-4 flex flex-col gap-4 rounded-lg border border-gray-200 p-4">
              {incluirItens ? (
                <fieldset>
                  <legend className="text-13 text-gray-500">Categorias de item (nenhuma marcada = todas)</legend>
                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {CATEGORIAS.map((c) => (
                      <label key={c} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="categorias"
                          value={c}
                          checked={categorias.includes(c)}
                          onChange={() => setCategorias((l) => alternar(l, c))}
                          className={CAIXA}
                        />
                        {NOME_DA_CATEGORIA[c].filtro}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              {incluirMateriais ? (
                <fieldset>
                  <legend className="text-13 text-gray-500">Grupos de material (nenhum marcado = todos)</legend>
                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {GRUPOS.map((g) => (
                      <label key={g} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="grupos"
                          value={g}
                          checked={grupos.includes(g)}
                          onChange={() => setGrupos((l) => alternar(l, g))}
                          className={CAIXA}
                        />
                        {NOME_DO_GRUPO[g]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <CampoSelecao id="conferencia-local" name="local" rotulo="Local" defaultValue="">
                <option value="">Todos os locais</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.caminho}
                  </option>
                ))}
              </CampoSelecao>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Botao onClick={() => setAberta(false)}>Cancelar</Botao>
            <button type="submit" disabled={nada} className={classesDoBotao("primario")}>
              Gerar relatório
            </button>
          </div>
        </form>
      </Janela>
    </>
  );
}
