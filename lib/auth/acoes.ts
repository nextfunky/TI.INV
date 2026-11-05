"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { avisar } from "@/lib/aviso";
import { obterBanco } from "@/lib/db";
import type { EstadoDoFormulario } from "@/lib/formulario";

import { COOKIE_DA_SESSAO, opcoesDoCookieDaSessao } from "./cookie";
import { destinoSeguro } from "./destino";
import {
  errosPorCampo,
  lerFormulario,
  regrasAlterarSenha,
  regrasEntrar,
  regrasPrimeiroAcesso,
} from "./regras";
import { exigirSessao } from "./sessao";
import {
  abrirSessao,
  alterarSenha,
  conferirCredenciais,
  criarConta,
  encerrarSessao,
} from "./servico";

async function guardarSessaoNoCookie(sessao: { token: string; expiraEm: Date }) {
  (await cookies()).set(COOKIE_DA_SESSAO, sessao.token, opcoesDoCookieDaSessao(sessao.expiraEm));
}

export async function entrar(
  _estado: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const campos = lerFormulario(dados, ["usuario", "senha", "para"]);
  const valores = { usuario: campos.usuario };

  const validacao = regrasEntrar.safeParse(campos);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const db = obterBanco();
  const contaId = await conferirCredenciais(db, validacao.data.usuario, validacao.data.senha);
  if (contaId === null) return { erroGeral: "Usuário ou senha inválidos.", valores };

  await guardarSessaoNoCookie(await abrirSessao(db, contaId));
  redirect(destinoSeguro(campos.para));
}

export async function criarContaDeAcesso(
  _estado: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const campos = lerFormulario(dados, ["usuario", "senha", "confirmacao"]);
  const valores = { usuario: campos.usuario };

  const validacao = regrasPrimeiroAcesso.safeParse(campos);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error), valores };

  const db = obterBanco();
  const resultado = await criarConta(db, validacao.data);
  if (!resultado.criada) {
    await avisar("A conta já existe. Entre com ela.", "erro");
    redirect("/entrar");
  }

  await guardarSessaoNoCookie(await abrirSessao(db, resultado.contaId));
  await avisar("Conta criada.");
  redirect("/");
}

export async function sair(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_DA_SESSAO)?.value;
  if (token) await encerrarSessao(obterBanco(), token);
  jar.delete(COOKIE_DA_SESSAO);
  redirect("/entrar");
}

export async function trocarSenha(
  _estado: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const sessao = await exigirSessao();
  const campos = lerFormulario(dados, ["senhaAtual", "novaSenha", "confirmacao"]);

  const validacao = regrasAlterarSenha.safeParse(campos);
  if (!validacao.success) return { erros: errosPorCampo(validacao.error) };

  const resultado = await alterarSenha(obterBanco(), sessao, validacao.data);
  if (!resultado.alterada) return { erros: { senhaAtual: "Senha atual incorreta." } };

  await avisar("Senha alterada.");
  redirect("/");
}
