"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { apagarCaracteristica, cadastrarCaracteristica, salvarCaracteristica } from "@/lib/caracteristicas/acoes";
import { NOME_DO_TIPO_DE_CARACTERISTICA, OPCOES_NO_MAXIMO, TIPOS_DE_CARACTERISTICA, type TipoDeCaracteristica } from "@/lib/caracteristicas/valores";
import { cx } from "@/lib/classes";
import { ESTADO_INICIAL } from "@/lib/formulario";
import { plural } from "@/lib/texto/plural";

import { Botao, classesDoBotao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { CampoSelecao, CampoTexto, FaixaDeErro } from "../campo";
import { Confirmacao, Janela } from "../janela";
import { useFocarErro } from "../use-focar-erro";

const EXPLICACAO: Record<TipoDeCaracteristica, string> = {
  lista: "Escolhe uma das opções (ex.: as cores do toner). Entra nos filtros e no Resumo.",
  numero: "Um número, com unidade (ex.: comprimento em m). Entra nos filtros e no Resumo.",
  texto: "Qualquer anotação (ex.: IMEI). Aparece no cadastro e na busca, mas não nos filtros.",
};

type Linha = { chave: number; valor: string; original: string };

type Props = {
  /** "tipo:3" ou "grupo:cabos". */
  dono: string;
  /** A tela do tipo ou do grupo (Cancelar volta para ela). */
  voltar: string;
  /** Na edição: a característica, quantos cadastros usam cada opção e quantos têm algum valor. */
  caracteristica?: {
    id: number;
    nome: string;
    tipo: TipoDeCaracteristica;
    unidade: string | null;
    opcoes: string[];
    uso: Record<string, number>;
    cadastrosComValor: number;
  };
};

/** Criar ou editar uma característica: nome, tipo do campo, unidade (número) ou opções (lista). */
export function FormularioDaCaracteristica({ dono, voltar, caracteristica }: Props) {
  const acao = caracteristica ? salvarCaracteristica.bind(null, caracteristica.id) : cadastrarCaracteristica.bind(null, dono);
  const [estado, enviar] = useActionState(acao, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const [excluindo, setExcluindo] = useState(false);
  const erros = estado.erros ?? {};
  const valores = { nome: caracteristica?.nome ?? "", unidade: caracteristica?.unidade ?? "", ...estado.valores };

  const [tipo, setTipo] = useState<TipoDeCaracteristica>(caracteristica?.tipo ?? "lista");
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    (caracteristica?.opcoes.length ? caracteristica.opcoes : ["", ""]).map((o, i) => ({ chave: i, valor: o, original: o })),
  );
  // Uma linha nova ganha uma chave que ainda não existe.
  const adicionar = () => setLinhas((atual) => [...atual, { chave: Math.max(-1, ...atual.map((l) => l.chave)) + 1, valor: "", original: "" }]);
  const uso = caracteristica?.uso ?? {};

  function mover(i: number, para: number) {
    setLinhas((atual) => {
      const copia = [...atual];
      [copia[i], copia[para]] = [copia[para], copia[i]];
      return copia;
    });
  }

  return (
    <>
      <form ref={formulario} action={enviar} noValidate className="max-w-lg">
        <input type="hidden" name="dono" value={dono} />
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
          {Object.keys(erros).length ? <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro> : null}
          <CampoTexto
            id="nome"
            name="nome"
            rotulo="Nome"
            placeholder="Ex.: Cor, Comprimento, Receptor USB"
            maxLength={40}
            autoFocus
            autoComplete="off"
            defaultValue={valores.nome}
            erro={erros.nome}
          />

          {caracteristica ? (
            <div>
              <p className="mb-1.5 text-13 font-medium text-gray-700">Tipo do campo</p>
              <p className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                {NOME_DO_TIPO_DE_CARACTERISTICA[tipo]}
              </p>
              <p className="mt-1.5 text-13 text-gray-500">O tipo do campo não muda depois de criado.</p>
            </div>
          ) : (
            <CampoSelecao
              id="tipo"
              name="tipo"
              rotulo="Tipo do campo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoDeCaracteristica)}
              erro={erros.tipo}
              dica={EXPLICACAO[tipo]}
            >
              {TIPOS_DE_CARACTERISTICA.map((t) => (
                <option key={t} value={t}>
                  {NOME_DO_TIPO_DE_CARACTERISTICA[t]}
                </option>
              ))}
            </CampoSelecao>
          )}

          {tipo === "numero" ? (
            <CampoTexto
              id="unidade"
              name="unidade"
              rotulo="Unidade"
              placeholder="Ex.: m, GB, W, páginas"
              maxLength={12}
              autoComplete="off"
              defaultValue={valores.unidade}
              erro={erros.unidade}
              dica="Opcional. Aparece junto do número: 1,5 m."
            />
          ) : null}

          {tipo === "lista" ? (
            // min-w-0: o fieldset do navegador não encolhe abaixo do conteúdo (no celular, rolaria para o lado).
            <fieldset aria-describedby={erros.opcoes ? "opcoes-erro" : "opcoes-dica"} className="min-w-0">
              <legend className="mb-1.5 text-13 font-medium text-gray-700">Opções</legend>
              <ul className="flex flex-col gap-2">
                {linhas.map((linha, i) => {
                  const emUso = linha.original ? (uso[linha.original] ?? 0) : 0;
                  return (
                    <li key={linha.chave} className="flex items-center gap-1">
                      <input type="hidden" name="original" value={linha.original} />
                      <label htmlFor={`opcao-${linha.chave}`} className="sr-only">
                        Opção {i + 1}
                      </label>
                      <input
                        id={`opcao-${linha.chave}`}
                        name="opcao"
                        value={linha.valor}
                        onChange={(e) => setLinhas((atual) => atual.map((l) => (l.chave === linha.chave ? { ...l, valor: e.target.value } : l)))}
                        maxLength={40}
                        autoComplete="off"
                        placeholder={i === 0 ? "Ex.: Preto" : undefined}
                        className={cx(
                          "h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm text-gray-900 transition-[border-color,box-shadow] duration-150 focus:ring-4 focus:outline-none",
                          erros.opcoes ? "border-descartado focus:ring-descartado/10" : "border-gray-300 focus:border-accent focus:ring-accent/12",
                        )}
                      />
                      {emUso ? (
                        <span title={`Em ${plural(emUso, "cadastro", "cadastros")}`} className="shrink-0 px-1 text-12 text-gray-500 tabular-nums">
                          <span aria-hidden="true">em {emUso}</span>
                          <span className="sr-only">em {plural(emUso, "cadastro", "cadastros")}</span>
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Subir ${linha.valor || `a opção ${i + 1}`}`}
                        disabled={i === 0}
                        onClick={() => mover(i, i - 1)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Descer ${linha.valor || `a opção ${i + 1}`}`}
                        disabled={i === linhas.length - 1}
                        onClick={() => mover(i, i + 1)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Tirar ${linha.valor || `a opção ${i + 1}`}`}
                        // Uma opção em uso não sai (dá para mudar o nome dela).
                        disabled={emUso > 0}
                        title={emUso ? `Em ${plural(emUso, "cadastro", "cadastros")}: troque o valor neles antes de tirar.` : undefined}
                        onClick={() => setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave))}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-descartado disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {linhas.length < OPCOES_NO_MAXIMO ? (
                <Botao variante="fantasma" className="mt-2 -ml-2" onClick={adicionar}>
                  <Plus aria-hidden="true" />
                  Adicionar opção
                </Botao>
              ) : null}
              {erros.opcoes ? (
                <p id="opcoes-erro" className="mt-1.5 text-13 text-descartado">
                  {erros.opcoes}
                </p>
              ) : (
                <p id="opcoes-dica" className="mt-1.5 text-13 text-gray-500">
                  A ordem daqui é a das listas, dos filtros e das colunas do Resumo.
                  {caracteristica
                    ? " “em 6” = 6 cadastros usam a opção: ela não sai da lista, mas pode mudar de nome (e muda também nesses cadastros)."
                    : ""}
                </p>
              )}
            </fieldset>
          ) : null}
        </div>

        <div className="mt-6 flex items-center gap-2">
          {caracteristica ? (
            <Botao variante="perigo" onClick={() => setExcluindo(true)}>
              Excluir
            </Botao>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Link href={voltar} className={classesDoBotao("secundario")}>
              Cancelar
            </Link>
            <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
          </div>
        </div>
      </form>

      {caracteristica ? (
        <Janela aberta={excluindo} aoFechar={() => setExcluindo(false)} rotulo={`Excluir ${caracteristica.nome}`}>
          <Confirmacao
            titulo={`Excluir ${caracteristica.nome}?`}
            texto={
              caracteristica.cadastrosComValor
                ? `O campo sai dos formulários e o valor é apagado de ${plural(caracteristica.cadastrosComValor, "cadastro", "cadastros")}. Isso não tem volta.`
                : "O campo sai dos formulários. Nenhum cadastro tem valor nele, então nada mais é afetado."
            }
            botoes={
              <>
                <Botao onClick={() => setExcluindo(false)}>Cancelar</Botao>
                <form action={apagarCaracteristica.bind(null, caracteristica.id)}>
                  <BotaoEnviar variante="perigoSolido" enviando="Excluindo…">
                    Excluir
                  </BotaoEnviar>
                </form>
              </>
            }
          />
        </Janela>
      ) : null}
    </>
  );
}
