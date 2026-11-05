import type { Page } from "@playwright/test";

/** A conta criada no primeiro teste. A senha muda no meio (alterar senha). */
export const USUARIO = "pedro.martins";
export const SENHA = "senha-forte-1";
export const NOVA_SENHA = "nova-senha-2";

/** Junta os erros do navegador (para conferir que o console ficou limpo). */
export function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  return erros;
}

export async function entrar(page: Page, usuario: string, senha: string) {
  await page.getByLabel("Usuário").fill(usuario);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** A data de daqui a N dias em São Paulo, no formato dos campos de data ("aaaa-mm-dd"). */
export function daquiA(dias: number): string {
  const dia = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(dia);
}
