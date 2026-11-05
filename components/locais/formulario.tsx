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

export type UnidadeNaEscolha = { id: number; nome: string };

/**
 * "Novo local": escolhe a unidade (ou cria uma nova) e, se quiser, um
 * departamento dentro dela.
 */
export function FormularioNovoLocal({ unidades, unidadeInicial }: { unidades: UnidadeNaEscolha[]; unidadeInicial: string }) {
  const [estado, enviar] = useActionState(cadastrarLocal, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};
  // Sem nenhuma unidade cadastrada, a primeira já é "nova".
  const [unidade, setUnidade] = useState(valores.paiId ?? (unidadeInicial || (unidades.length ? "" : "nova")));
  const nova = unidade === "nova";

  return (
    <form ref={formulario} action={enviar} noValidate className="max-w-lg">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
        {Object.keys(erros).length ? <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro> : null}
        <CampoSelecao
          id="paiId"
          name="paiId"
          rotulo="Unidade"
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
          autoFocus={!unidadeInicial}
          erro={erros.paiId}
        >
          <option value="" disabled>
            Escolha a unidade
          </option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
          <option value="nova">+ Nova unidade</option>
        </CampoSelecao>
        {nova ? (
          <CampoTexto
            id="novaUnidade"
            name="novaUnidade"
            rotulo="Nome da nova unidade"
            placeholder="Ex.: Aparecida do Taboado"
            maxLength={80}
            autoComplete="off"
            autoFocus={unidades.length > 0}
            defaultValue={valores.novaUnidade}
            erro={erros.novaUnidade}
          />
        ) : null}
        <CampoTexto
          id="departamento"
          name="departamento"
          rotulo="Departamento"
          placeholder="Ex.: Financeiro"
          maxLength={80}
          autoComplete="off"
          autoFocus={Boolean(unidadeInicial)}
          defaultValue={valores.departamento}
          erro={erros.departamento}
          dica={nova ? "Opcional. Deixe em branco para cadastrar só a unidade." : undefined}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Link href="/locais" className={classesDoBotao("secundario")}>
          Cancelar
        </Link>
        <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
      </div>
    </form>
  );
}

/** Editar uma unidade (só o nome) ou um departamento (a unidade e o nome). */
export function FormularioEditarLocal({
  local,
  unidades,
}: {
  local: { id: number; nome: string; paiId: number | null; caminho: string; podeExcluir: boolean };
  unidades: UnidadeNaEscolha[];
}) {
  const [estado, enviar] = useActionState(salvarLocal.bind(null, local.id), ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const [excluindo, setExcluindo] = useState(false);
  const erros = estado.erros ?? {};
  const valores = { nome: local.nome, paiId: local.paiId ? String(local.paiId) : "", ...estado.valores };
  const departamento = local.paiId !== null;

  return (
    <>
      <form ref={formulario} action={enviar} noValidate className="max-w-lg">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
          {Object.keys(erros).length ? <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro> : null}
          {departamento ? (
            <CampoSelecao id="paiId" name="paiId" rotulo="Unidade" defaultValue={valores.paiId} erro={erros.paiId}>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </CampoSelecao>
          ) : (
            <input type="hidden" name="paiId" value="" />
          )}
          <CampoTexto
            id="nome"
            name="nome"
            rotulo={departamento ? "Departamento" : "Unidade"}
            placeholder={departamento ? "Ex.: Financeiro" : "Ex.: Aparecida do Taboado"}
            maxLength={80}
            autoFocus
            autoComplete="off"
            defaultValue={valores.nome}
            erro={erros.nome}
          />
        </div>
        <div className="mt-6 flex items-center gap-2">
          {local.podeExcluir ? (
            <Botao variante="perigo" onClick={() => setExcluindo(true)}>
              Excluir
            </Botao>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Link href={`/locais/${local.id}`} className={classesDoBotao("secundario")}>
              Cancelar
            </Link>
            <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
          </div>
        </div>
      </form>

      {local.podeExcluir ? (
        <ExcluirLocal id={local.id} caminho={local.caminho} aberta={excluindo} aoFechar={() => setExcluindo(false)} />
      ) : null}
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
