"use client";

import Link from "next/link";
import { useActionState } from "react";

import { cadastrarColaborador, salvarColaborador } from "@/lib/colaboradores/acoes";
import { ESTADO_INICIAL } from "@/lib/formulario";

import { classesDoBotao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { CampoSelecao, CampoTexto, FaixaDeErro } from "../campo";
import { useFocarErro } from "../use-focar-erro";

/** Formulário de colaborador: o nome e onde a pessoa senta. */
export function FormularioDoColaborador({
  pessoa,
  locais,
}: {
  pessoa?: { id: number; nome: string; localId: number | null };
  locais: Array<{ id: number; caminho: string }>;
}) {
  const acao = pessoa ? salvarColaborador.bind(null, pessoa.id) : cadastrarColaborador;
  const [estado, enviar] = useActionState(acao, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const erros = estado.erros ?? {};

  return (
    <form ref={formulario} action={enviar} noValidate className="max-w-lg">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
        {Object.keys(erros).length ? <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro> : null}
        <CampoTexto
          id="nome"
          name="nome"
          rotulo="Nome"
          placeholder="Nome completo"
          maxLength={120}
          autoFocus
          autoComplete="off"
          defaultValue={estado.valores?.nome ?? pessoa?.nome ?? ""}
          erro={erros.nome}
        />
        <CampoSelecao
          id="localId"
          name="localId"
          rotulo="Local"
          defaultValue={estado.valores?.localId ?? (pessoa?.localId ? String(pessoa.localId) : "")}
          erro={erros.localId}
          dica="Os itens com esta pessoa ficam aqui."
        >
          <option value="">Sem local definido</option>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>
              {l.caminho}
            </option>
          ))}
        </CampoSelecao>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Link href={pessoa ? `/colaboradores/${pessoa.id}` : "/colaboradores"} className={classesDoBotao("secundario")}>
          Cancelar
        </Link>
        <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
      </div>
    </form>
  );
}
