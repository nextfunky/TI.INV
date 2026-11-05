"use client";

import Link from "next/link";
import { useActionState } from "react";

import { classesDoBotao } from "@/components/botao";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto, FaixaDeErro } from "@/components/campo";
import { useFocarErro } from "@/components/use-focar-erro";
import { trocarSenha } from "@/lib/auth/acoes";
import { ESTADO_INICIAL } from "@/lib/formulario";

export function FormularioSenha({ usuario }: { usuario: string }) {
  const [estado, acao] = useActionState(trocarSenha, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const temErros = Boolean(estado.erros && Object.keys(estado.erros).length > 0);

  return (
    <form ref={formulario} action={acao} noValidate>
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
        {temErros ? <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro> : null}
        {/* Ajuda o gerenciador de senhas do navegador a saber de qual conta é a senha. */}
        <input type="text" name="usuario" value={usuario} autoComplete="username" readOnly hidden />
        <CampoTexto
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          rotulo="Senha atual"
          autoComplete="current-password"
          autoFocus
          required
          erro={estado.erros?.senhaAtual}
        />
        <CampoTexto
          id="novaSenha"
          name="novaSenha"
          type="password"
          rotulo="Nova senha"
          dica="No mínimo 8 caracteres."
          autoComplete="new-password"
          required
          erro={estado.erros?.novaSenha}
        />
        <CampoTexto
          id="confirmacao"
          name="confirmacao"
          type="password"
          rotulo="Confirmar nova senha"
          autoComplete="new-password"
          required
          erro={estado.erros?.confirmacao}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Link href="/" className={classesDoBotao("secundario")}>
          Cancelar
        </Link>
        <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
      </div>
    </form>
  );
}
