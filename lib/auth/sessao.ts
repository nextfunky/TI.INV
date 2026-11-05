import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { obterBanco } from "@/lib/db";

import { COOKIE_DA_SESSAO } from "./cookie";
import { conferirSessao, type SessaoValida } from "./servico";

/**
 * A sessão de quem está usando o sistema, ou null.
 * O resultado é reaproveitado durante a mesma requisição.
 */
export const obterSessao = cache(async (): Promise<SessaoValida | null> => {
  // A sessão é sempre conferida no banco, na hora do pedido: nunca durante
  // uma pré-carga de página e nunca guardada de uma vez para outra.
  await connection();
  const token = (await cookies()).get(COOKIE_DA_SESSAO)?.value;
  if (!token) return null;
  return conferirSessao(obterBanco(), token);
});

/** Para as páginas e ações que exigem login: sem sessão, vai para a tela de entrada. */
export async function exigirSessao(): Promise<SessaoValida> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar");
  return sessao;
}
