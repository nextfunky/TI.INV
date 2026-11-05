"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";

import { vincularItensAPessoa } from "@/lib/colaboradores/acoes";

import { Botao } from "../botao";
import { JanelaEscolherVarios } from "../escolher-varios";

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
      <JanelaEscolherVarios
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo={`Vincular itens a ${nome}`}
        descricao="Marque os itens que ficam com esta pessoa."
        placeholder="Código, hostname, marca, modelo ou série"
        endereco={(termo) => `/api/itens-para-vincular?pessoa=${pessoaId}&q=${encodeURIComponent(termo)}`}
        aoConfirmar={(ids) => vincularItensAPessoa(pessoaId, ids)}
        rotuloDoBotao={(n) => (n > 1 ? `Vincular ${n} itens` : "Vincular item")}
        avisoDosEscolhidos={(n) => (n === 1 ? "1 sai de outra pessoa" : `${n} saem de outras pessoas`)}
        nadaParaEscolher="Não há itens disponíveis para vincular."
        textoDosEscolhidos={(n) => (n === 1 ? "1 item escolhido" : `${n} itens escolhidos`)}
        nenhumEscolhido="Nenhum item escolhido"
      />
    </>
  );
}
