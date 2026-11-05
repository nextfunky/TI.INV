"use client";

import { useState } from "react";

import { apagarMaterial } from "@/lib/materiais/acoes";

import { Botao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { Confirmacao, Janela } from "../janela";

/** "Excluir" na edição do material (só aparece para material que nunca teve saída). */
export function ExcluirMaterial({ id, nome }: { id: number; nome: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Botao variante="perigo" onClick={() => setAberta(true)}>
        Excluir
      </Botao>
      <Janela aberta={aberta} aoFechar={() => setAberta(false)} rotulo={`Excluir ${nome}`}>
        <Confirmacao
          titulo={`Excluir ${nome}?`}
          texto="O material sai da lista, junto com as entradas e os ajustes dele. Ele nunca teve saída, então nenhuma pessoa é afetada."
          botoes={
            <>
              <Botao onClick={() => setAberta(false)}>Cancelar</Botao>
              <form action={apagarMaterial.bind(null, id)}>
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
