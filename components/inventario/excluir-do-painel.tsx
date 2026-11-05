"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { apagarItem } from "@/lib/itens/acoes";

import { Botao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { Confirmacao, Janela } from "../janela";

/** "Excluir" no painel lateral: confirma e volta para a mesma lista, sem o painel. */
export function ExcluirDoPainel({ id, codigo, titulo, voltarPara }: { id: number; codigo: string; titulo: string; voltarPara: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Botao variante="perigo" onClick={() => setAberta(true)}>
        <Trash2 aria-hidden="true" />
        Excluir
      </Botao>
      <Janela aberta={aberta} aoFechar={() => setAberta(false)} rotulo={`Excluir ${codigo}`}>
        <Confirmacao
          titulo={`Excluir ${codigo}?`}
          texto={
            <>
              {titulo} sai do inventário de vez. Se o item só deixou de ser usado, prefira mudar o status para{" "}
              <strong className="font-medium text-gray-900">Descartado</strong>.
            </>
          }
          botoes={
            <>
              <Botao onClick={() => setAberta(false)}>Cancelar</Botao>
              <form action={apagarItem.bind(null, id, voltarPara)}>
                <BotaoEnviar variante="perigoSolido" enviando="Excluindo…">
                  Excluir
                </BotaoEnviar>
              </form>
            </>
          }
        />
      </Janela>
    </>
  );
}
