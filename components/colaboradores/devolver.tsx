"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { devolverItemDaPessoa } from "@/lib/colaboradores/acoes";
import type { Status } from "@/lib/itens/valores";

import { mostrarAviso } from "../avisos";
import { Botao, classesDoBotao } from "../botao";
import { Confirmacao, Janela } from "../janela";

/**
 * "Devolver", em cada linha da página da pessoa: tira o item dela.
 * Se estava em uso, ele volta para o estoque.
 */
export function DevolverItem({
  pessoaId,
  pessoa,
  item,
}: {
  pessoaId: number;
  pessoa: string;
  item: { id: number; codigo: string; titulo: string; status: Status };
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [enviando, iniciar] = useTransition();

  function devolver() {
    iniciar(async () => {
      const resultado = await devolverItemDaPessoa(pessoaId, item.id, pessoa);
      mostrarAviso(resultado.ok ? { texto: resultado.mensagem, tipo: "sucesso" } : { texto: resultado.erro, tipo: "erro" });
      setAberta(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        // Fica acima do link da linha (que cobre a linha inteira).
        className="relative z-10 rounded-md px-2 py-1 text-13 font-medium text-gray-600 transition-[color,background-color,opacity] duration-150 hover:bg-gray-100 hover:text-gray-900 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
      >
        Devolver
      </button>
      <Janela aberta={aberta} aoFechar={() => setAberta(false)} rotulo={`Devolver ${item.codigo}`}>
        <Confirmacao
          titulo={`Devolver ${item.codigo}?`}
          texto={
            item.status === "em_uso"
              ? `${item.titulo} sai de ${pessoa} e volta para o estoque.`
              : `${item.titulo} sai de ${pessoa}. O status não muda.`
          }
          botoes={
            <>
              <Botao onClick={() => setAberta(false)}>Cancelar</Botao>
              <button type="button" onClick={devolver} disabled={enviando} className={classesDoBotao("primario")}>
                {enviando ? "Devolvendo…" : "Devolver"}
              </button>
            </>
          }
        />
      </Janela>
    </>
  );
}
