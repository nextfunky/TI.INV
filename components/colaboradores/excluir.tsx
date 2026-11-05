"use client";

import { useState } from "react";

import { apagarColaborador } from "@/lib/colaboradores/acoes";

import { Botao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { Confirmacao, Janela } from "../janela";

/** "Excluir" na página da pessoa (só aparece para quem nunca teve itens). */
export function ExcluirColaborador({ id, nome }: { id: number; nome: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Botao variante="perigo" onClick={() => setAberta(true)}>
        Excluir
      </Botao>
      <Janela aberta={aberta} aoFechar={() => setAberta(false)} rotulo={`Excluir ${nome}`}>
        <Confirmacao
          titulo={`Excluir ${nome}?`}
          texto="A pessoa sai da lista de colaboradores. Ela não tem nenhum item, então nada mais é afetado."
          botoes={
            <>
              <Botao onClick={() => setAberta(false)}>Cancelar</Botao>
              <form action={apagarColaborador.bind(null, id)}>
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
