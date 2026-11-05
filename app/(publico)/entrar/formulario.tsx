"use client";

import { useActionState } from "react";

import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto, FaixaDeErro } from "@/components/campo";
import { useFocarErro } from "@/components/use-focar-erro";
import { entrar } from "@/lib/auth/acoes";
import { ESTADO_INICIAL } from "@/lib/formulario";

export function FormularioEntrar({ para }: { para: string }) {
  const [estado, acao] = useActionState(entrar, ESTADO_INICIAL);
  const formulario = useFocarErro(estado, "#senha");

  return (
    <form ref={formulario} action={acao} className="flex flex-col gap-4" noValidate>
      {estado.erroGeral ? <FaixaDeErro>{estado.erroGeral}</FaixaDeErro> : null}
      <input type="hidden" name="para" value={para} />
      <CampoTexto
        id="usuario"
        name="usuario"
        rotulo="Usuário"
        placeholder="seu.usuario"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        required
        defaultValue={estado.valores?.usuario}
        erro={estado.erros?.usuario}
      />
      <CampoTexto
        id="senha"
        name="senha"
        type="password"
        rotulo="Senha"
        placeholder="••••••••"
        autoComplete="current-password"
        required
        erro={estado.erros?.senha}
      />
      <BotaoEnviar enviando="Entrando…" className="mt-1 h-10 w-full">
        Entrar
      </BotaoEnviar>
    </form>
  );
}
