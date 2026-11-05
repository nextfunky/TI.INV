"use client";

import { ArrowDownToLine, ArrowUpFromLine, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { ajustar, darEntrada, darSaida, type EstadoDoMovimento } from "@/lib/materiais/acoes";

import { mostrarAviso } from "../avisos";
import { Botao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { CampoSelecao, CampoTexto, FaixaDeErro } from "../campo";
import { Janela } from "../janela";
import { useFocarErro } from "../use-focar-erro";

type Tipo = "entrada" | "saida" | "ajuste";

const TITULO: Record<Tipo, string> = { entrada: "Entrada", saida: "Saída", ajuste: "Ajustar contagem" };

/** Os botões "Entrada", "Saída" e "Ajustar contagem" da página do material, cada um com a sua janela. */
export function BotoesDeMovimento({
  material,
  pessoas,
}: {
  material: { id: number; nome: string; quantidade: number };
  pessoas: Array<{ id: number; nome: string }>;
}) {
  const [aberta, setAberta] = useState<Tipo | null>(null);
  const fechar = () => setAberta(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Botao onClick={() => setAberta("entrada")}>
          <ArrowDownToLine aria-hidden="true" />
          Entrada
        </Botao>
        <Botao onClick={() => setAberta("saida")} disabled={material.quantidade === 0} title={material.quantidade === 0 ? "Não há nenhum em estoque." : undefined}>
          <ArrowUpFromLine aria-hidden="true" />
          Saída
        </Botao>
        <Botao onClick={() => setAberta("ajuste")}>
          <ListChecks aria-hidden="true" />
          Ajustar contagem
        </Botao>
      </div>
      <Janela aberta={aberta !== null} aoFechar={fechar} rotulo={aberta ? `${TITULO[aberta]}: ${material.nome}` : "Movimento"}>
        {aberta ? <FormularioDoMovimento key={aberta} tipo={aberta} material={material} pessoas={pessoas} aoConcluir={fechar} /> : null}
      </Janela>
    </>
  );
}

const ACOES = { entrada: darEntrada, saida: darSaida, ajuste: ajustar };

function FormularioDoMovimento({
  tipo,
  material,
  pessoas,
  aoConcluir,
}: {
  tipo: Tipo;
  material: { id: number; nome: string; quantidade: number };
  pessoas: Array<{ id: number; nome: string }>;
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [estado, enviar] = useActionState<EstadoDoMovimento, FormData>(ACOES[tipo].bind(null, material.id), {});
  const formulario = useFocarErro(estado);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};

  useEffect(() => {
    if (!estado.feito) return;
    mostrarAviso({ texto: estado.feito.mensagem, tipo: "sucesso" });
    aoConcluir();
    router.refresh();
  }, [estado.feito, aoConcluir, router]);

  return (
    <form ref={formulario} action={enviar} noValidate className="p-6">
      <h2 className="text-base font-semibold">{TITULO[tipo]}</h2>
      <p className="mt-1 text-gray-600">
        {material.nome} · {material.quantidade === 0 ? "nenhum em estoque" : `${material.quantidade} em estoque`}
      </p>
      <div className="mt-5 flex flex-col gap-4">
        {estado.erroGeral ? <FaixaDeErro>{estado.erroGeral}</FaixaDeErro> : null}
        {tipo === "ajuste" ? (
          <CampoTexto
            id="contagem"
            name="contagem"
            rotulo="Quantos você contou"
            inputMode="numeric"
            autoFocus
            autoComplete="off"
            defaultValue={valores.contagem}
            erro={erros.contagem}
            dica="O saldo passa a ser este número, e a diferença fica no histórico."
          />
        ) : (
          <CampoTexto
            id="quantidade"
            name="quantidade"
            rotulo={tipo === "entrada" ? "Quantos chegaram" : "Quantos saíram"}
            inputMode="numeric"
            autoFocus
            autoComplete="off"
            defaultValue={valores.quantidade}
            erro={erros.quantidade}
          />
        )}
        {tipo === "saida" ? (
          <CampoSelecao
            id="colaboradorId"
            name="colaboradorId"
            rotulo="Para quem"
            defaultValue={valores.colaboradorId ?? ""}
            erro={erros.colaboradorId}
            dica="Opcional. Quem recebe vê o material na página dela."
          >
            <option value="">Ninguém (uso da TI, troca, descarte…)</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </CampoSelecao>
        ) : null}
        <CampoTexto
          id="observacao"
          name="observacao"
          rotulo="Observação"
          maxLength={500}
          autoComplete="off"
          placeholder={tipo === "entrada" ? "Ex.: compra de novembro" : tipo === "saida" ? "Ex.: troca do cabo da recepção" : "Ex.: contagem do mês"}
          defaultValue={valores.observacao}
          erro={erros.observacao}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Botao onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar enviando="Registrando…">{tipo === "ajuste" ? "Ajustar" : `Registrar ${tipo === "entrada" ? "entrada" : "saída"}`}</BotaoEnviar>
      </div>
    </form>
  );
}
