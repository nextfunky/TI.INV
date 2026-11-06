"use client";

import { ArrowLeftRight, CornerDownLeft, MapPin, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { devolver, entregar, mudarLocal, type EstadoDaAcaoRapida } from "@/lib/itens/acoes-rapidas";

import { mostrarAviso } from "../avisos";
import { Botao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { CampoSelecao, CampoTexto, FaixaDeErro } from "../campo";
import { Janela } from "../janela";
import { useFocarErro } from "../use-focar-erro";

type Acao = "entregar" | "trocar" | "devolver" | "local";

const TITULO: Record<Acao, string> = {
  entregar: "Entregar",
  trocar: "Trocar pessoa",
  devolver: "Devolver",
  local: "Mudar de local",
};

const ACOES = { entregar, trocar: entregar, devolver, local: mudarLocal };

/**
 * As ações rápidas do painel do item. Com usuário: Trocar pessoa e Devolver.
 * Sem usuário: Entregar e Mudar de local. Tudo vai para o histórico.
 */
export function AcoesRapidas({
  item,
  pessoas,
  locais,
}: {
  item: { id: number; codigo: string; titulo: string; usuarioId: number | null; usuario: string | null; descartado: boolean };
  pessoas: Array<{ id: number; nome: string }>;
  locais: Array<{ id: number; caminho: string }>;
}) {
  const [aberta, setAberta] = useState<Acao | null>(null);
  if (item.descartado) return null;
  const fechar = () => setAberta(null);
  const botoes: Array<[Acao, typeof UserPlus]> = item.usuarioId
    ? [
        ["trocar", ArrowLeftRight],
        ["devolver", CornerDownLeft],
      ]
    : [
        ["entregar", UserPlus],
        ["local", MapPin],
      ];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {botoes.map(([acao, Icone]) => (
          <Botao key={acao} onClick={() => setAberta(acao)}>
            <Icone aria-hidden="true" />
            {TITULO[acao]}
          </Botao>
        ))}
      </div>
      <Janela aberta={aberta !== null} aoFechar={fechar} rotulo={aberta ? `${TITULO[aberta]}: ${item.codigo}` : "Ação"}>
        {aberta ? <Formulario key={aberta} acao={aberta} item={item} pessoas={pessoas} locais={locais} aoConcluir={fechar} /> : null}
      </Janela>
    </>
  );
}

function Formulario({
  acao,
  item,
  pessoas,
  locais,
  aoConcluir,
}: {
  acao: Acao;
  item: { id: number; codigo: string; titulo: string; usuarioId: number | null; usuario: string | null };
  pessoas: Array<{ id: number; nome: string }>;
  locais: Array<{ id: number; caminho: string }>;
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [estado, enviar] = useActionState<EstadoDaAcaoRapida, FormData>(ACOES[acao].bind(null, item.id), {});
  const formulario = useFocarErro(estado);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};

  useEffect(() => {
    if (!estado.feito) return;
    mostrarAviso({ texto: estado.feito.mensagem, tipo: "sucesso" });
    aoConcluir();
    router.refresh();
  }, [estado.feito, aoConcluir, router]);

  const explicacao: Record<Acao, string> = {
    entregar: "O item passa a ficar com a pessoa, no local dela. Em estoque vira Em uso.",
    trocar: `O item sai de ${item.usuario} e passa para outra pessoa.`,
    devolver: `O item sai de ${item.usuario}. Em uso volta para Em estoque.`,
    local: "Para itens sem usuário, como os do estoque.",
  };

  return (
    <form ref={formulario} action={enviar} noValidate className="p-6">
      <h2 className="text-base font-semibold">{TITULO[acao]}</h2>
      <p className="mt-1 text-gray-600">
        {item.codigo} · {item.titulo}
      </p>
      <p className="mt-1 text-13 text-gray-500">{explicacao[acao]}</p>
      <div className="mt-5 flex flex-col gap-4">
        {estado.erroGeral ? <FaixaDeErro>{estado.erroGeral}</FaixaDeErro> : null}
        {acao === "entregar" || acao === "trocar" ? (
          <CampoSelecao id="pessoaId" name="pessoaId" rotulo="Para quem" autoFocus defaultValue={valores.pessoaId ?? ""} erro={erros.pessoaId}>
            <option value="" disabled>
              Escolha a pessoa
            </option>
            {pessoas
              .filter((p) => p.id !== item.usuarioId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
          </CampoSelecao>
        ) : (
          <CampoSelecao
            id="localId"
            name="localId"
            rotulo={acao === "devolver" ? "Para onde volta" : "Novo local"}
            autoFocus
            defaultValue={valores.localId ?? ""}
            erro={erros.localId}
            dica={acao === "devolver" ? "Opcional: em branco, o item fica sem local definido." : undefined}
          >
            <option value="">Sem local definido</option>
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.caminho}
              </option>
            ))}
          </CampoSelecao>
        )}
        <CampoTexto
          id="observacao"
          name="observacao"
          rotulo="Observação"
          maxLength={500}
          autoComplete="off"
          placeholder="Opcional. Fica no histórico."
          defaultValue={valores.observacao}
          erro={erros.observacao}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Botao onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar enviando="Salvando…">{TITULO[acao]}</BotaoEnviar>
      </div>
    </form>
  );
}
