"use client";

import { useActionState } from "react";

import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto, FaixaDeErro } from "@/components/campo";
import { useFocarErro } from "@/components/use-focar-erro";
import { criarContaDeAcesso } from "@/lib/auth/acoes";
import { ESTADO_INICIAL } from "@/lib/formulario";

export function FormularioPrimeiroAcesso() {
  const [estado, acao] = useActionState(criarContaDeAcesso, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const temErros = Boolean(estado.erros && Object.keys(estado.erros).length > 0);

  return (
    <form ref={formulario} action={acao} className="flex flex-col gap-4" noValidate>
      {temErros ? <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro> : null}
      <CampoTexto
        id="usuario"
        name="usuario"
        rotulo="Usuário"
        placeholder="seu.usuario"
        dica="Letras sem acento, números, ponto, hífen ou sublinhado."
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
        dica="No mínimo 8 caracteres."
        autoComplete="new-password"
        required
        erro={estado.erros?.senha}
      />
      <CampoTexto
        id="confirmacao"
        name="confirmacao"
        type="password"
        rotulo="Confirmar senha"
        autoComplete="new-password"
        required
        erro={estado.erros?.confirmacao}
      />
      <BotaoEnviar enviando="Criando…" className="mt-1 h-10 w-full">
        Criar conta
      </BotaoEnviar>
    </form>
  );
}
