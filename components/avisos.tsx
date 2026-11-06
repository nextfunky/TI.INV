"use client";

import { Check } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

type Aviso = { texto: string; tipo: "sucesso" | "erro" };
type Estado = { aviso: Aviso; chave: number; saindo: boolean } | null;

const COOKIE = "aviso";
const VISIVEL_MS = 5000;
const SAIDA_MS = 300;

// O aviso atual fica guardado fora do React, num pequeno "quadro de avisos"
// que a tela observa. Assim ele sobrevive às trocas de página.
let estado: Estado = null;
let temporizadores: ReturnType<typeof setTimeout>[] = [];
const ouvintes = new Set<() => void>();

function definir(novo: Estado) {
  estado = novo;
  for (const ouvir of ouvintes) ouvir();
}

/** Mostra um aviso no canto da tela. Ele some sozinho depois de 5 segundos. */
export function mostrarAviso(aviso: Aviso) {
  temporizadores.forEach(clearTimeout);
  const chave = Date.now();
  definir({ aviso, chave, saindo: false });
  temporizadores = [
    setTimeout(() => estado?.chave === chave && definir({ ...estado, saindo: true }), VISIVEL_MS),
    setTimeout(() => estado?.chave === chave && definir(null), VISIVEL_MS + SAIDA_MS),
  ];
}

function assinar(ouvir: () => void) {
  ouvintes.add(ouvir);
  return () => ouvintes.delete(ouvir);
}

/** Lê o aviso deixado pelo servidor (cookie "aviso") e apaga o cookie. */
function retirarAvisoDoServidor(): Aviso | null {
  const par = document.cookie.split("; ").find((p) => p.startsWith(`${COOKIE}=`));
  if (!par) return null;

  const seguro = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=; Max-Age=0; path=/; SameSite=Lax${seguro}`;

  try {
    const valor = JSON.parse(decodeURIComponent(par.slice(COOKIE.length + 1)));
    if (typeof valor?.texto !== "string") return null;
    return { texto: valor.texto, tipo: valor.tipo === "erro" ? "erro" : "sucesso" };
  } catch {
    return null;
  }
}

/**
 * O aviso escuro no canto inferior direito ("Senha alterada.").
 * Entra subindo, some sozinho e é lido pelos leitores de tela.
 */
export function Avisos() {
  const pathname = usePathname();
  const parametros = useSearchParams().toString();
  const atual = useSyncExternalStore(assinar, () => estado, () => null);

  // A cada troca de endereço (inclusive só do "?..."), confere se o servidor deixou um aviso.
  useEffect(() => {
    const aviso = retirarAvisoDoServidor();
    if (aviso) mostrarAviso(aviso);
  }, [pathname, parametros]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-20 z-50 sm:bottom-4 print:hidden"
    >
      {atual ? (
        <div
          key={atual.chave}
          className={`flex items-center gap-2.5 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-aviso escuro:border escuro:border-gray-300 escuro:bg-gray-100 escuro:text-gray-900 ${
            atual.saindo ? "animate-aviso-sai" : "animate-aviso-entra"
          }`}
        >
          {atual.aviso.tipo === "sucesso" ? (
            <Check aria-hidden="true" className="size-4 shrink-0 text-green-400" />
          ) : (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-descartado" />
          )}
          {atual.aviso.texto}
        </div>
      ) : null}
    </div>
  );
}
