"use client";

import { useState, useTransition, type FormEvent } from "react";

import { cadastrarColaboradorRapido } from "@/lib/colaboradores/acoes";

import { mostrarAviso } from "../avisos";
import { Botao, classesDoBotao } from "../botao";
import { CampoTexto } from "../campo";
import { Janela } from "../janela";

type Pessoa = { id: number; nome: string };

/**
 * "+ Novo colaborador" dentro do formulário de item: cadastra a pessoa sem
 * sair da página e sem perder o que já foi digitado no item.
 */
export function JanelaNovoColaborador({
  aberta,
  aoFechar,
  aoCadastrar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  aoCadastrar: (pessoa: Pessoa) => void;
}) {
  return (
    <Janela aberta={aberta} aoFechar={aoFechar} rotulo="Novo colaborador">
      <Conteudo aoFechar={aoFechar} aoCadastrar={aoCadastrar} />
    </Janela>
  );
}

function Conteudo({ aoFechar, aoCadastrar }: { aoFechar: () => void; aoCadastrar: (pessoa: Pessoa) => void }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string>();
  const [enviando, iniciar] = useTransition();

  function enviar(e: FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const resultado = await cadastrarColaboradorRapido(nome);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      aoCadastrar(resultado.colaborador);
      mostrarAviso({ texto: `Cadastro de ${resultado.colaborador.nome} criado.`, tipo: "sucesso" });
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="p-6">
      <h2 className="text-base font-semibold">Novo colaborador</h2>
      <p className="mt-1 text-gray-600">A pessoa já fica escolhida neste item.</p>
      <CampoTexto
        id="novo-colaborador-nome"
        rotulo="Nome"
        placeholder="Nome completo"
        maxLength={120}
        autoFocus
        autoComplete="off"
        className="mt-5"
        value={nome}
        onChange={(e) => {
          setNome(e.target.value);
          setErro(undefined);
        }}
        erro={erro}
      />
      <div className="mt-6 flex justify-end gap-2">
        <Botao onClick={aoFechar}>Cancelar</Botao>
        <button type="submit" aria-disabled={enviando} className={classesDoBotao("primario")}>
          {enviando ? "Cadastrando…" : "Cadastrar"}
        </button>
      </div>
    </form>
  );
}
