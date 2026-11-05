/** Nome do cookie da sessão. Usado pelo proxy e pelo servidor. */
export const COOKIE_DA_SESSAO = "sessao";

export function opcoesDoCookieDaSessao(expiraEm: Date) {
  return {
    httpOnly: true, // o JavaScript da página não consegue ler
    secure: process.env.NODE_ENV === "production", // só por HTTPS em produção
    sameSite: "lax" as const, // não vai junto em formulários de outros sites
    path: "/",
    expires: expiraEm,
  };
}
