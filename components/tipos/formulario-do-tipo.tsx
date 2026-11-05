"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { apagarTipo, cadastrarTipo, salvarTipo } from "@/lib/itens/acoes";
import { CATEGORIAS, NOME_DA_CATEGORIA } from "@/lib/itens/valores";
import { ESTADO_INICIAL } from "@/lib/formulario";

import { Botao, classesDoBotao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { CampoSelecao, CampoTexto, FaixaDeErro } from "../campo";
import { Confirmacao, Janela } from "../janela";
import { useFocarErro } from "../use-focar-erro";

type Props = {
  iniciais: { nome: string; categoria: string; prefixo: string };
  /** Na edição: o tipo, se ele pode ser excluído e se a categoria está travada. */
  tipo?: { id: number; nome: string; prefixo: string; podeExcluir: boolean; categoriaTravada: boolean };
};

export function FormularioDoTipo({ iniciais, tipo }: Props) {
  const acao = tipo ? salvarTipo.bind(null, tipo.id) : cadastrarTipo;
  const [estado, enviar] = useActionState(acao, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const [excluindo, setExcluindo] = useState(false);

  const valores = { ...iniciais, ...estado.valores };
  const erros = estado.erros ?? {};
  const temErros = Object.keys(erros).length > 0;

  return (
    <>
      <form ref={formulario} action={enviar} noValidate className="max-w-lg">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
          {temErros ? <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro> : null}
          <CampoTexto
            id="nome"
            name="nome"
            rotulo="Nome"
            placeholder="Ex.: Tablet"
            maxLength={60}
            autoFocus
            defaultValue={valores.nome}
            erro={erros.nome}
          />
          <CampoSelecao
            id="categoria"
            name="categoria"
            rotulo="Categoria"
            defaultValue={valores.categoria || "outro"}
            disabled={tipo?.categoriaTravada}
            erro={erros.categoria}
            dica={
              tipo?.categoriaTravada
                ? "Este tipo tem itens com dados de computador. Para não apagar esses dados, a categoria não muda."
                : "Computador mostra os campos de hardware: hostname, processador, memória..."
            }
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {NOME_DA_CATEGORIA[c].singular}
              </option>
            ))}
          </CampoSelecao>
          {/* Uma lista travada não é enviada pelo navegador; o valor vai escondido. */}
          {tipo?.categoriaTravada ? <input type="hidden" name="categoria" value={valores.categoria} /> : null}

          {tipo ? (
            <div>
              <p className="mb-1.5 text-13 font-medium text-gray-700">Prefixo do código</p>
              <p className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 font-mono text-13 text-gray-700">
                {tipo.prefixo}
              </p>
              <p className="mt-1.5 text-13 text-gray-500">O prefixo não muda depois de criado.</p>
            </div>
          ) : (
            <CampoTexto
              id="prefixo"
              name="prefixo"
              rotulo="Prefixo do código"
              placeholder="Ex.: TAB"
              maxLength={10}
              autoCapitalize="characters"
              spellCheck={false}
              className="[&_input]:font-mono [&_input]:uppercase"
              defaultValue={valores.prefixo}
              erro={erros.prefixo}
              dica="Ex.: MON gera os códigos MON0001, MON0002... Não pode ser alterado depois."
            />
          )}
        </div>

        <div className="mt-6 flex items-center gap-2">
          {tipo?.podeExcluir ? (
            <Botao variante="perigo" onClick={() => setExcluindo(true)}>
              Excluir
            </Botao>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Link href="/configuracoes/tipos" className={classesDoBotao("secundario")}>
              Cancelar
            </Link>
            <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
          </div>
        </div>
      </form>

      {tipo?.podeExcluir ? (
        <Janela aberta={excluindo} aoFechar={() => setExcluindo(false)} rotulo={`Excluir ${tipo.nome}`}>
          <Confirmacao
            titulo={`Excluir ${tipo.nome}?`}
            texto="O tipo sai da lista. Ele não tem itens, então nada mais é afetado."
            botoes={
              <>
                <Botao onClick={() => setExcluindo(false)}>Cancelar</Botao>
                <form action={apagarTipo.bind(null, tipo.id)}>
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
