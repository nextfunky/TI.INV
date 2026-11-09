"use client";

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { importarPlanilhaEnviada, lerPlanilhaEnviada, type RespostaDaLeitura } from "@/lib/importacao/acoes";
import type { ErroDaPlanilha } from "@/lib/importacao/planilha";
import { plural } from "@/lib/texto/plural";

import { Botao, classesDoBotao } from "../botao";
import { FaixaDeErro } from "../campo";

const TAMANHO_MAXIMO = 900 * 1024;

type Problemas = { lista: ErroDaPlanilha[]; total: number };

/**
 * A tela de importação: escolher o arquivo já lê a planilha e mostra a
 * prévia. Só o botão "Importar" grava, e grava tudo ou nada.
 */
export function ImportarPlanilha() {
  const campo = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [leitura, setLeitura] = useState<Extract<RespostaDaLeitura, { ok: true }> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [problemasAoImportar, setProblemasAoImportar] = useState<Problemas | null>(null);
  const [lendo, iniciarLeitura] = useTransition();
  const [importando, iniciarImportacao] = useTransition();

  function enviar(arquivoEscolhido: File) {
    const dados = new FormData();
    dados.set("planilha", arquivoEscolhido);
    return dados;
  }

  function escolher(escolhido: File | undefined) {
    setLeitura(null);
    setErro(null);
    setProblemasAoImportar(null);
    setArquivo(escolhido ?? null);
    if (!escolhido) return;
    if (escolhido.size > TAMANHO_MAXIMO) {
      setErro("O arquivo passa de 900 KB. Divida em arquivos menores.");
      return;
    }
    iniciarLeitura(async () => {
      const resposta = await lerPlanilhaEnviada(enviar(escolhido));
      if (resposta.ok) setLeitura(resposta);
      else setErro(resposta.erro);
    });
  }

  function importar() {
    if (!arquivo) return;
    iniciarImportacao(async () => {
      // Se der certo, o servidor leva para o Inventário com o aviso.
      const resposta = await importarPlanilhaEnviada(enviar(arquivo));
      if (resposta.erro) setErro(resposta.erro);
      if (resposta.erros) setProblemasAoImportar({ lista: resposta.erros, total: resposta.totalDeErros ?? resposta.erros.length });
    });
  }

  // Se o arquivo foi escolhido antes de a tela terminar de carregar, lê agora.
  useEffect(() => {
    const ja = campo.current?.files?.[0];
    if (ja) escolher(ja);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function recomecar() {
    if (campo.current) campo.current.value = "";
    escolher(undefined);
  }

  const previa = leitura?.previa;
  const problemas: Problemas | null =
    problemasAoImportar ?? (previa?.erros.length ? { lista: previa.erros, total: previa.totalDeErros } : null);
  const pronto = previa && !problemas && (previa.resumo.itens > 0 || previa.resumo.materiais > 0);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section aria-labelledby="como-funciona" className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 id="como-funciona" className="text-base font-semibold">
          Como funciona
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-gray-600">
          <li>
            Baixe o modelo e preencha as abas Itens (uma linha por equipamento) e Materiais. Para as características (Cor,
            Comprimento…), acrescente uma coluna com o nome delas.
          </li>
          <li>Escolha o arquivo abaixo. O sistema lê a planilha e mostra o que vai entrar, sem gravar nada.</li>
          <li>Se houver problemas, corrija na planilha e escolha o arquivo de novo.</li>
          <li>Com tudo certo, clique em Importar. Entra tudo de uma vez, ou nada.</li>
        </ol>
        <a href="/modelo-de-importacao.xlsx" download className={classesDoBotao("secundario", "mt-5")}>
          <Download aria-hidden="true" />
          Baixar modelo vazio
        </a>
      </section>

      <section aria-labelledby="arquivo" className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 id="arquivo" className="text-base font-semibold">
          Arquivo
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label htmlFor="planilha" className={classesDoBotao("secundario", "cursor-pointer")}>
            <FileSpreadsheet aria-hidden="true" />
            {arquivo ? "Escolher outro arquivo" : "Escolher planilha (.xlsx)"}
          </label>
          <input
            ref={campo}
            id="planilha"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => escolher(e.target.files?.[0])}
            disabled={lendo || importando}
          />
          {arquivo ? <span className="min-w-0 truncate text-gray-600">{arquivo.name}</span> : null}
        </div>
        {lendo ? (
          <p role="status" className="mt-4 text-gray-500">
            Lendo a planilha…
          </p>
        ) : null}
        {erro ? (
          <div className="mt-4">
            <FaixaDeErro>{erro}</FaixaDeErro>
          </div>
        ) : null}
      </section>

      {problemas ? (
        <section aria-labelledby="problemas" className="rounded-xl border border-gray-200 bg-white">
          <div className="p-6">
            <h2 id="problemas" className="flex items-center gap-2 text-base font-semibold text-descartado">
              <AlertTriangle aria-hidden="true" className="size-4" />
              {plural(problemas.total, "problema para corrigir", "problemas para corrigir")}
            </h2>
            <p className="mt-1 text-gray-600">
              Nada foi gravado. Corrija na planilha, salve e escolha o arquivo de novo.
              {problemas.total > problemas.lista.length ? ` Aqui aparecem os ${problemas.lista.length} primeiros.` : ""}
            </p>
          </div>
          <ListaDeProblemas problemas={problemas.lista} />
        </section>
      ) : null}

      {pronto ? (
        <section aria-labelledby="pronto" className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 id="pronto" className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 aria-hidden="true" className="size-4 text-uso" />
            Pronto para importar
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-13 text-gray-500">Itens</dt>
              <dd className="mt-0.5 font-medium">{plural(previa.resumo.itens, "item", "itens")}</dd>
              {previa.resumo.porTipo.length ? (
                <dd className="mt-1 text-13 text-gray-600">
                  {previa.resumo.porTipo.map((t) => `${t.quantidade} ${t.nome}`).join(" · ")}
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-13 text-gray-500">Materiais</dt>
              <dd className="mt-0.5 font-medium">
                {plural(previa.resumo.materiais, "material", "materiais")}
                {previa.resumo.materiais ? `, ${plural(previa.resumo.unidades, "unidade", "unidades")}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-13 text-gray-500">Locais novos</dt>
              <dd className="mt-0.5 text-gray-700">{previa.resumo.locaisNovos.join(" · ") || "Nenhum"}</dd>
            </div>
            <div>
              <dt className="text-13 text-gray-500">Pessoas novas</dt>
              <dd className="mt-0.5 text-gray-700">{previa.resumo.pessoasNovas.join(" · ") || "Nenhuma"}</dd>
            </div>
          </dl>
          {previa.avisos.length ? (
            <div className="mt-5">
              <p className="text-13 font-medium text-manutencao">Confira antes de importar:</p>
              <ul className="mt-1 space-y-1 text-13 text-gray-600">
                {previa.avisos.map((a, i) => (
                  <li key={i}>
                    {a.aba}, linha {a.linha}: {a.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Botao onClick={recomecar} disabled={importando}>
              Cancelar
            </Botao>
            <button type="button" onClick={importar} disabled={importando} className={classesDoBotao("primario")}>
              {importando ? "Importando…" : "Importar"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ListaDeProblemas({ problemas }: { problemas: ErroDaPlanilha[] }) {
  return (
    <div className="relative overflow-x-auto border-t border-gray-200">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
            <th scope="col" className="w-28 py-3 pr-4 pl-6 font-medium">
              Aba
            </th>
            <th scope="col" className="w-20 py-3 pr-4 font-medium">
              Linha
            </th>
            <th scope="col" className="py-3 pr-6 font-medium">
              O que corrigir
            </th>
          </tr>
        </thead>
        <tbody>
          {problemas.map((p, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-b-0">
              <td className="py-2.5 pr-4 pl-6 align-top text-gray-600">{p.aba}</td>
              <td className="py-2.5 pr-4 align-top font-mono text-13 text-gray-500">{p.linha ?? "—"}</td>
              <td className="py-2.5 pr-6 align-top text-gray-800">{p.mensagem}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
