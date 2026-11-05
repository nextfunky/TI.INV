"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { cx } from "@/lib/classes";
import type { Status } from "@/lib/itens/valores";

import { mostrarAviso } from "./avisos";
import { Botao, classesDoBotao } from "./botao";
import { Janela } from "./janela";
import { PontoDeStatus } from "./status";

/** Uma linha da lista: o que o servidor devolve para a janela. */
export type OpcaoParaEscolher = {
  id: number;
  codigo?: string;
  nome: string;
  /** Um aviso em laranja ("Com Ana Paula", "Em Filial 03"): escolher muda isso. */
  aviso?: string | null;
  /** Sem aviso, mostra o status (para itens) ou um texto cinza. */
  status?: Status;
  detalhe?: string;
};

export type ResultadoDaEscolha = { ok: true; mensagem: string } | { ok: false; erro: string };

/**
 * Janela para escolher vários de uma vez (itens ou pessoas), com busca.
 * Os escolhidos continuam marcados mesmo quando a busca muda.
 */
export function JanelaEscolherVarios({
  aberta,
  aoFechar,
  titulo,
  descricao,
  placeholder,
  endereco,
  aoConfirmar,
  rotuloDoBotao,
  avisoDosEscolhidos,
  nadaParaEscolher,
  textoDosEscolhidos,
  nenhumEscolhido,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao: string;
  placeholder: string;
  /** Monta o endereço da busca com o texto digitado. */
  endereco: (termo: string) => string;
  aoConfirmar: (ids: number[]) => Promise<ResultadoDaEscolha>;
  rotuloDoBotao: (quantos: number) => string;
  /** Frase sobre os escolhidos que têm aviso ("1 sai de outra pessoa"). */
  avisoDosEscolhidos: (quantos: number) => string;
  nadaParaEscolher: string;
  /** "1 item escolhido", "2 pessoas escolhidas" (com o gênero certo). */
  textoDosEscolhidos: (quantos: number) => string;
  /** "Nenhum item escolhido", "Nenhuma pessoa escolhida". */
  nenhumEscolhido: string;
}) {
  return (
    <Janela aberta={aberta} aoFechar={aoFechar} rotulo={titulo} largura="max-w-xl">
      <Conteudo
        {...{
          aoFechar,
          titulo,
          descricao,
          placeholder,
          endereco,
          aoConfirmar,
          rotuloDoBotao,
          avisoDosEscolhidos,
          nadaParaEscolher,
          textoDosEscolhidos,
          nenhumEscolhido,
        }}
      />
    </Janela>
  );
}

function Conteudo({
  aoFechar,
  titulo,
  descricao,
  placeholder,
  endereco,
  aoConfirmar,
  rotuloDoBotao,
  avisoDosEscolhidos,
  nadaParaEscolher,
  textoDosEscolhidos,
  nenhumEscolhido,
}: Omit<Parameters<typeof JanelaEscolherVarios>[0], "aberta">) {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoParaEscolher[] | null>(null);
  const [escolhidos, setEscolhidos] = useState<Map<number, OpcaoParaEscolher>>(new Map());
  const [erro, setErro] = useState<string>();
  const [enviando, iniciar] = useTransition();
  const ultimaBusca = useRef(0);

  const buscar = useCallback(
    async (texto: string) => {
      const numero = ++ultimaBusca.current;
      try {
        const resposta = await fetch(endereco(texto), { cache: "no-store" });
        const dados = resposta.ok ? ((await resposta.json()) as { opcoes: OpcaoParaEscolher[] }) : { opcoes: [] };
        // Uma resposta antiga que chegou depois de uma busca mais nova é ignorada.
        if (numero === ultimaBusca.current) setOpcoes(dados.opcoes);
      } catch {
        if (numero === ultimaBusca.current) setOpcoes([]);
      }
    },
    [endereco],
  );

  useEffect(() => {
    const espera = setTimeout(() => void buscar(termo), termo ? 150 : 0);
    return () => clearTimeout(espera);
  }, [termo, buscar]);

  function alternar(opcao: OpcaoParaEscolher) {
    setErro(undefined);
    setEscolhidos((atual) => {
      const novo = new Map(atual);
      if (novo.has(opcao.id)) novo.delete(opcao.id);
      else novo.set(opcao.id, opcao);
      return novo;
    });
  }

  function confirmar() {
    iniciar(async () => {
      const resultado = await aoConfirmar([...escolhidos.keys()]);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      mostrarAviso({ texto: resultado.mensagem, tipo: "sucesso" });
      aoFechar();
      router.refresh();
    });
  }

  const quantos = escolhidos.size;
  const comAviso = [...escolhidos.values()].filter((o) => o.aviso).length;

  return (
    <div>
      <div className="px-6 pt-6">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="mt-1 text-gray-600">{descricao}</p>
        <div className="relative mt-4">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
          <label htmlFor="busca-escolher" className="sr-only">
            Buscar
          </label>
          <input
            id="busca-escolher"
            type="search"
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder={placeholder}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-9 text-sm transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-4 focus:ring-accent/12 focus:outline-none"
          />
        </div>
      </div>

      <ul aria-label="Opções" className="mt-3 max-h-[50vh] overflow-y-auto border-y border-gray-100 px-3 py-2">
        {opcoes?.map((opcao) => {
          const marcado = escolhidos.has(opcao.id);
          return (
            <li key={opcao.id}>
              <label
                className={cx(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-gray-50",
                  marcado && "bg-accent-suave hover:bg-accent-suave",
                )}
              >
                <input type="checkbox" checked={marcado} onChange={() => alternar(opcao)} className="size-4 shrink-0 accent-accent" />
                {opcao.codigo ? <span className="w-16 shrink-0 font-mono text-13 text-gray-500">{opcao.codigo}</span> : null}
                <span className="min-w-0 flex-1 truncate font-medium">{opcao.nome}</span>
                {opcao.aviso ? (
                  <span className="max-w-[45%] shrink-0 truncate text-13 text-amber-700">{opcao.aviso}</span>
                ) : opcao.status ? (
                  <span className="shrink-0 text-13 text-gray-500">
                    <PontoDeStatus status={opcao.status} />
                  </span>
                ) : opcao.detalhe ? (
                  <span className="shrink-0 text-13 text-gray-500">{opcao.detalhe}</span>
                ) : null}
              </label>
            </li>
          );
        })}
        {opcoes && opcoes.length === 0 ? (
          <li className="px-3 py-6 text-center text-gray-500">{termo ? "Nada encontrado com essa busca." : nadaParaEscolher}</li>
        ) : null}
        {opcoes === null ? <li className="h-40" aria-hidden="true" /> : null}
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4">
        <p aria-live="polite" className="mr-auto text-13 text-gray-500">
          {erro ? (
            <span className="text-descartado">{erro}</span>
          ) : quantos ? (
            <>
              {textoDosEscolhidos(quantos)}
              {comAviso ? <span className="text-amber-700"> · {avisoDosEscolhidos(comAviso)}</span> : null}
            </>
          ) : (
            nenhumEscolhido
          )}
        </p>
        <Botao onClick={aoFechar}>Cancelar</Botao>
        <button type="button" onClick={confirmar} disabled={!quantos || enviando} className={classesDoBotao("primario")}>
          {enviando ? "Salvando…" : rotuloDoBotao(quantos)}
        </button>
      </div>
    </div>
  );
}
