"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Janela } from "./janela";
import { Tecla } from "./tecla";

type Resultado = { codigo: string; nome: string; usuario: string | null };

/**
 * "Buscar item…": abre uma busca rápida (também com Ctrl+K) e leva ao
 * Inventário com o painel do item escolhido aberto.
 */
export function BuscaRapida() {
  const [aberta, setAberta] = useState(false);

  // Ctrl+K (ou Cmd+K no Mac) em qualquer tela.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta(true);
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <>
      {/* No computador parece um campo de busca; no celular, só a lupa. */}
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K"
        aria-label="Buscar item (Ctrl+K)"
        className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-gray-500 transition-colors duration-150 hover:border-gray-300 hover:text-gray-700 lg:w-48 lg:bg-gray-50 xl:w-60"
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left text-sm lg:block">Buscar item…</span>
        <span className="hidden lg:block">
          <Tecla>Ctrl K</Tecla>
        </span>
      </button>
      <Janela aberta={aberta} aoFechar={() => setAberta(false)} rotulo="Buscar item" noTopo largura="max-w-xl">
        <ConteudoDaBusca aoEscolher={() => setAberta(false)} aoFechar={() => setAberta(false)} />
      </Janela>
    </>
  );
}

function ConteudoDaBusca({ aoEscolher, aoFechar }: { aoEscolher: () => void; aoFechar: () => void }) {
  const router = useRouter();
  const idDaLista = useId();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [selecionado, setSelecionado] = useState(0);
  const ultimaBusca = useRef(0);

  const buscar = useCallback(async (texto: string) => {
    const numero = ++ultimaBusca.current;
    try {
      const resposta = await fetch(`/api/busca?q=${encodeURIComponent(texto)}`, { cache: "no-store" });
      const dados = resposta.ok ? ((await resposta.json()) as { itens: Resultado[] }) : { itens: [] };
      // Uma resposta antiga que chegou depois de uma busca mais nova é ignorada.
      if (numero !== ultimaBusca.current) return;
      setResultados(dados.itens);
      setSelecionado(0);
    } catch {
      if (numero === ultimaBusca.current) setResultados([]);
    }
  }, []);

  // Busca enquanto digita, com 150ms de espera entre as teclas (sem texto: na hora).
  useEffect(() => {
    const espera = setTimeout(() => void buscar(termo), termo ? 150 : 0);
    return () => clearTimeout(espera);
  }, [termo, buscar]);

  function abrir(codigo: string) {
    aoEscolher();
    router.push(`/inventario?item=${codigo}`);
  }

  function aoTeclar(e: React.KeyboardEvent) {
    const total = resultados?.length ?? 0;
    if (e.key === "ArrowDown" && total) {
      e.preventDefault();
      setSelecionado((s) => (s + 1) % total);
    } else if (e.key === "ArrowUp" && total) {
      e.preventDefault();
      setSelecionado((s) => (s - 1 + total) % total);
    } else if (e.key === "Enter" && resultados?.[selecionado]) {
      e.preventDefault();
      abrir(resultados[selecionado].codigo);
    }
  }

  const idDaOpcao = (i: number) => `${idDaLista}-${i}`;

  return (
    <div>
      <div className="flex items-center gap-2.5 border-b border-gray-100 pr-3 pl-4 text-gray-500">
        <Search aria-hidden="true" className="size-[18px] shrink-0" />
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-label="Buscar item"
          aria-expanded={Boolean(resultados?.length)}
          aria-controls={idDaLista}
          aria-activedescendant={resultados?.length ? idDaOpcao(selecionado) : undefined}
          aria-autocomplete="list"
          placeholder="Código, hostname, pessoa ou nº de série"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={aoTeclar}
          className="h-[52px] min-w-0 flex-1 bg-transparent text-15 text-gray-900 outline-none"
        />
        <button
          type="button"
          onClick={aoFechar}
          className="rounded border border-gray-200 px-2 py-0.5 text-11 text-gray-500 transition-colors duration-150 hover:border-gray-300"
        >
          Esc
        </button>
      </div>

      <ul id={idDaLista} role="listbox" aria-label="Itens" className="max-h-[60vh] overflow-y-auto p-2">
        {resultados?.map((r, i) => (
          <li
            key={r.codigo}
            id={idDaOpcao(i)}
            role="option"
            aria-selected={i === selecionado}
            onMouseMove={() => setSelecionado(i)}
            onClick={() => abrir(r.codigo)}
            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${i === selecionado ? "bg-gray-50" : ""}`}
          >
            <span className="w-16 shrink-0 font-mono text-13 text-gray-500">{r.codigo}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.nome}</span>
            <span className="max-w-[40%] shrink-0 truncate text-13 text-gray-500">{r.usuario ?? "Sem usuário"}</span>
          </li>
        ))}
      </ul>
      {resultados && resultados.length === 0 ? (
        <p className="px-5 pt-1 pb-6 text-gray-500">Nenhum item encontrado.</p>
      ) : null}
    </div>
  );
}
