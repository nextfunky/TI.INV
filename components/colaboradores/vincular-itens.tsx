"use client";

import { Link2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { cx } from "@/lib/classes";
import { vincularItensAPessoa } from "@/lib/colaboradores/acoes";
import { plural } from "@/lib/texto/plural";
import type { Status } from "@/lib/itens/valores";

import { mostrarAviso } from "../avisos";
import { Botao, classesDoBotao } from "../botao";
import { Janela } from "../janela";
import { PontoDeStatus } from "../status";

type Opcao = { id: number; codigo: string; nome: string; status: Status; usuario: string | null };

/**
 * "Vincular itens" na página da pessoa: escolhe vários itens já cadastrados
 * e passa todos para ela de uma vez.
 */
export function VincularItens({ pessoaId, nome }: { pessoaId: number; nome: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Botao onClick={() => setAberta(true)}>
        <Link2 aria-hidden="true" />
        Vincular itens
      </Botao>
      <Janela aberta={aberta} aoFechar={() => setAberta(false)} rotulo={`Vincular itens a ${nome}`} largura="max-w-xl">
        <Conteudo pessoaId={pessoaId} nome={nome} aoFechar={() => setAberta(false)} />
      </Janela>
    </>
  );
}

function Conteudo({ pessoaId, nome, aoFechar }: { pessoaId: number; nome: string; aoFechar: () => void }) {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<Opcao[] | null>(null);
  // Os escolhidos ficam guardados mesmo quando a busca muda.
  const [escolhidos, setEscolhidos] = useState<Map<number, Opcao>>(new Map());
  const [erro, setErro] = useState<string>();
  const [enviando, iniciar] = useTransition();
  const ultimaBusca = useRef(0);

  const buscar = useCallback(
    async (texto: string) => {
      const numero = ++ultimaBusca.current;
      try {
        const resposta = await fetch(`/api/itens-para-vincular?pessoa=${pessoaId}&q=${encodeURIComponent(texto)}`, {
          cache: "no-store",
        });
        const dados = resposta.ok ? ((await resposta.json()) as { itens: Opcao[] }) : { itens: [] };
        if (numero === ultimaBusca.current) setOpcoes(dados.itens);
      } catch {
        if (numero === ultimaBusca.current) setOpcoes([]);
      }
    },
    [pessoaId],
  );

  useEffect(() => {
    const espera = setTimeout(() => void buscar(termo), termo ? 150 : 0);
    return () => clearTimeout(espera);
  }, [termo, buscar]);

  function alternar(opcao: Opcao) {
    setErro(undefined);
    setEscolhidos((atual) => {
      const novo = new Map(atual);
      if (novo.has(opcao.id)) novo.delete(opcao.id);
      else novo.set(opcao.id, opcao);
      return novo;
    });
  }

  function vincular() {
    iniciar(async () => {
      const resultado = await vincularItensAPessoa(pessoaId, [...escolhidos.keys()]);
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
  const deOutraPessoa = [...escolhidos.values()].filter((o) => o.usuario).length;

  return (
    <div>
      <div className="px-6 pt-6">
        <h2 className="text-base font-semibold">Vincular itens a {nome}</h2>
        <p className="mt-1 text-gray-600">Marque os itens que ficam com esta pessoa.</p>
        <div className="relative mt-4">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
          <label htmlFor="busca-vincular" className="sr-only">
            Buscar item
          </label>
          <input
            id="busca-vincular"
            type="search"
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Código, hostname, marca, modelo ou série"
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-9 text-sm transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-4 focus:ring-accent/12 focus:outline-none"
          />
        </div>
      </div>

      <ul aria-label="Itens" className="mt-3 max-h-[50vh] overflow-y-auto border-y border-gray-100 px-3 py-2">
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
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(opcao)}
                  className="size-4 shrink-0 accent-accent"
                />
                <span className="w-16 shrink-0 font-mono text-13 text-gray-500">{opcao.codigo}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{opcao.nome}</span>
                {opcao.usuario ? (
                  <span className="max-w-[40%] shrink-0 truncate text-13 text-amber-700">Com {opcao.usuario}</span>
                ) : (
                  <span className="shrink-0 text-13 text-gray-500">
                    <PontoDeStatus status={opcao.status} />
                  </span>
                )}
              </label>
            </li>
          );
        })}
        {opcoes && opcoes.length === 0 ? (
          <li className="px-3 py-6 text-center text-gray-500">
            {termo ? "Nenhum item encontrado." : "Não há itens disponíveis para vincular."}
          </li>
        ) : null}
        {opcoes === null ? <li className="h-40" aria-hidden="true" /> : null}
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4">
        <p role="status" className="mr-auto text-13 text-gray-500">
          {erro ? (
            <span className="text-descartado">{erro}</span>
          ) : quantos ? (
            <>
              {plural(quantos, "item escolhido", "itens escolhidos")}
              {deOutraPessoa ? (
                <span className="text-amber-700">
                  {" "}
                  · {deOutraPessoa === 1 ? "1 sai de outra pessoa" : `${deOutraPessoa} saem de outras pessoas`}
                </span>
              ) : null}
            </>
          ) : (
            "Nenhum item escolhido"
          )}
        </p>
        <Botao onClick={aoFechar}>Cancelar</Botao>
        <button
          type="button"
          onClick={vincular}
          disabled={!quantos || enviando}
          className={classesDoBotao("primario")}
        >
          {enviando ? "Vinculando…" : quantos > 1 ? `Vincular ${quantos} itens` : "Vincular item"}
        </button>
      </div>
    </div>
  );
}
