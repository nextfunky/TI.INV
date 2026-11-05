"use client";

import { Package, Users } from "lucide-react";
import { useState } from "react";

import { trazerItensAoLocal, trazerPessoasAoLocal } from "@/lib/locais/acoes";

import { Botao } from "../botao";
import { JanelaEscolherVarios } from "../escolher-varios";

/** "Trazer pessoas": coloca várias pessoas neste local de uma vez (os itens delas vêm junto). */
export function TrazerPessoas({ localId, nome }: { localId: number; nome: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Botao onClick={() => setAberta(true)}>
        <Users aria-hidden="true" />
        Trazer pessoas
      </Botao>
      <JanelaEscolherVarios
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo={`Trazer pessoas para ${nome}`}
        descricao="Os itens de cada pessoa vêm junto com ela."
        placeholder="Buscar pelo nome"
        endereco={(termo) => `/api/pessoas-para-trazer?local=${localId}&q=${encodeURIComponent(termo)}`}
        aoConfirmar={(ids) => trazerPessoasAoLocal(localId, ids)}
        rotuloDoBotao={(n) => (n > 1 ? `Trazer ${n} pessoas` : "Trazer pessoa")}
        avisoDosEscolhidos={(n) => (n === 1 ? "1 sai de outro local" : `${n} saem de outros locais`)}
        nadaParaEscolher="Todas as pessoas já estão aqui."
        textoDosEscolhidos={(n) => (n === 1 ? "1 pessoa escolhida" : `${n} pessoas escolhidas`)}
        nenhumEscolhido="Nenhuma pessoa escolhida"
      />
    </>
  );
}

/** "Trazer itens": coloca vários itens sem usuário neste local de uma vez. */
export function TrazerItens({ localId, nome }: { localId: number; nome: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Botao onClick={() => setAberta(true)}>
        <Package aria-hidden="true" />
        Trazer itens
      </Botao>
      <JanelaEscolherVarios
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo={`Trazer itens para ${nome}`}
        descricao="Só itens sem usuário: os que estão com alguém ficam onde a pessoa está."
        placeholder="Código, hostname, marca, modelo ou série"
        endereco={(termo) => `/api/itens-para-trazer?local=${localId}&q=${encodeURIComponent(termo)}`}
        aoConfirmar={(ids) => trazerItensAoLocal(localId, ids)}
        rotuloDoBotao={(n) => (n > 1 ? `Trazer ${n} itens` : "Trazer item")}
        avisoDosEscolhidos={(n) => (n === 1 ? "1 sai de outro local" : `${n} saem de outros locais`)}
        nadaParaEscolher="Não há itens sem usuário fora deste local."
        textoDosEscolhidos={(n) => (n === 1 ? "1 item escolhido" : `${n} itens escolhidos`)}
        nenhumEscolhido="Nenhum item escolhido"
      />
    </>
  );
}
