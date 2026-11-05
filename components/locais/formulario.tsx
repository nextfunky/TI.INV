"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { ESTADO_INICIAL } from "@/lib/formulario";
import { apagarLocal, cadastrarLocal, salvarLocal } from "@/lib/locais/acoes";

import { mostrarAviso } from "../avisos";
import { Botao, classesDoBotao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { CampoSelecao, CampoTexto, FaixaDeErro } from "../campo";
import { Confirmacao, Janela } from "../janela";
import { useFocarErro } from "../use-focar-erro";

export type LocalNaEscolha = { id: number; caminho: string };

/** Formulário de local: o nome e onde ele fica ("Dentro de"). */
export function FormularioDoLocal({
  opcoes,
  iniciais,
  local,
}: {
  /** Os locais que podem ser o "Dentro de" (na edição, sem o próprio e os de dentro dele). */
  opcoes: LocalNaEscolha[];
  iniciais: { nome: string; paiId: string };
  local?: { id: number; caminho: string; podeExcluir: boolean };
}) {
  const acao = local ? salvarLocal.bind(null, local.id) : cadastrarLocal;
  const [estado, enviar] = useActionState(acao, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const [excluindo, setExcluindo] = useState(false);
  const valores = { ...iniciais, ...estado.valores };
  const erros = estado.erros ?? {};

  return (
    <>
      <form ref={formulario} action={enviar} noValidate className="max-w-lg">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
          {Object.keys(erros).length ? <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro> : null}
          <CampoTexto
            id="nome"
            name="nome"
            rotulo="Nome"
            placeholder="Ex.: Financeiro"
            maxLength={80}
            autoFocus
            autoComplete="off"
            defaultValue={valores.nome}
            erro={erros.nome}
          />
          <CampoSelecao
            id="paiId"
            name="paiId"
            rotulo="Dentro de"
            defaultValue={valores.paiId}
            erro={erros.paiId}
            dica="Ex.: o setor Financeiro fica dentro do 2º andar."
          >
            <option value="">Nenhum (local principal)</option>
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.caminho}
              </option>
            ))}
          </CampoSelecao>
        </div>
        <div className="mt-6 flex items-center gap-2">
          {local?.podeExcluir ? (
            <Botao variante="perigo" onClick={() => setExcluindo(true)}>
              Excluir
            </Botao>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Link href={local ? `/locais/${local.id}` : "/locais"} className={classesDoBotao("secundario")}>
              Cancelar
            </Link>
            <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
          </div>
        </div>
      </form>

      {local?.podeExcluir ? <ExcluirLocal id={local.id} caminho={local.caminho} aberta={excluindo} aoFechar={() => setExcluindo(false)} /> : null}
    </>
  );
}

/** A janela de confirmação para excluir um local vazio. */
export function ExcluirLocal({
  id,
  caminho,
  aberta,
  aoFechar,
}: {
  id: number;
  caminho: string;
  aberta: boolean;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();

  function excluir() {
    iniciar(async () => {
      const resultado = await apagarLocal(id);
      mostrarAviso(resultado.ok ? { texto: resultado.mensagem, tipo: "sucesso" } : { texto: resultado.erro, tipo: "erro" });
      aoFechar();
      if (resultado.ok) router.push("/locais");
      router.refresh();
    });
  }

  return (
    <Janela aberta={aberta} aoFechar={aoFechar} rotulo="Excluir local">
      <Confirmacao
        titulo="Excluir local?"
        texto={
          <>
            <strong className="font-medium text-gray-900">{caminho}</strong> sai da lista de locais.
          </>
        }
        botoes={
          <>
            <Botao onClick={aoFechar}>Cancelar</Botao>
            <Botao variante="perigoSolido" onClick={excluir} disabled={enviando}>
              {enviando ? "Excluindo…" : "Excluir"}
            </Botao>
          </>
        }
      />
    </Janela>
  );
}
