import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_DA_SESSAO } from "@/lib/auth/cookie";

const PAGINAS_ABERTAS = new Set(["/entrar", "/primeiro-acesso"]);

/**
 * Primeira barreira, antes de qualquer página: sem o cookie da sessão,
 * a pessoa vai para a tela de entrada e, depois de entrar, volta para onde
 * queria ir. A conferência de verdade (se a sessão vale) é feita no servidor,
 * em cada página e em cada ação.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PAGINAS_ABERTAS.has(pathname) || request.cookies.has(COOKIE_DA_SESSAO)) {
    return NextResponse.next();
  }

  // Pedidos internos das telas (como a busca rápida) recebem "não autorizado".
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Entre no sistema para continuar." }, { status: 401 });
  }

  const entrar = new URL("/entrar", request.url);
  if (pathname !== "/") entrar.searchParams.set("para", pathname + search);
  return NextResponse.redirect(entrar);
}

export const config = {
  // Tudo, menos os arquivos internos do Next e o ícone.
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
