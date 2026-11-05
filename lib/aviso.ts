import "server-only";

import { cookies } from "next/headers";

export const COOKIE_DO_AVISO = "aviso";

export type Aviso = { texto: string; tipo: "sucesso" | "erro" };

/**
 * Guarda um aviso para mostrar na próxima tela ("Senha alterada.").
 * O aviso viaja num cookie de vida curta, que a página lê e apaga.
 */
export async function avisar(texto: string, tipo: Aviso["tipo"] = "sucesso"): Promise<void> {
  (await cookies()).set(COOKIE_DO_AVISO, JSON.stringify({ texto, tipo } satisfies Aviso), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
