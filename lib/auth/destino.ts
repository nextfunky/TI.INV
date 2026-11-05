/**
 * Depois de entrar, o sistema volta para a página que a pessoa queria abrir.
 * Só aceita endereços internos ("/algo"), para que um link malicioso não
 * leve para outro site depois do login.
 */
export function destinoSeguro(valor: unknown): string {
  if (typeof valor !== "string") return "/";
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return "/";
  if (valor.startsWith("/entrar") || valor.startsWith("/primeiro-acesso")) return "/";
  return valor;
}
