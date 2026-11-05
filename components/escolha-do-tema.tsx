"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cx } from "@/lib/classes";

export type Tema = "automatico" | "claro" | "escuro";

const OPCOES: Array<{ valor: Tema; rotulo: string; Icone: typeof Sun }> = [
  { valor: "automatico", rotulo: "Automático", Icone: Monitor },
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
];

const ouvintes = new Set<() => void>();

function lerTema(): Tema {
  const t = document.documentElement.dataset.tema;
  return t === "claro" || t === "escuro" ? t : "automatico";
}

/** Guarda a escolha neste navegador e aplica na hora. "Automático" segue o sistema. */
function escolherTema(tema: Tema) {
  try {
    if (tema === "automatico") localStorage.removeItem("tema");
    else localStorage.setItem("tema", tema);
  } catch {
    // Sem acesso ao armazenamento (navegação privada): vale só até fechar a página.
  }
  if (tema === "automatico") delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = tema;
  for (const avisar of ouvintes) avisar();
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}

/** "Tema: Automático · Claro · Escuro", no menu da conta. */
export function EscolhaDoTema() {
  const atual = useSyncExternalStore(assinar, lerTema, () => "automatico" as Tema);
  return (
    <div className="px-3 py-2">
      <p id="rotulo-do-tema" className="text-13 text-gray-500">
        Tema
      </p>
      <div role="radiogroup" aria-labelledby="rotulo-do-tema" className="mt-1.5 flex rounded-lg bg-gray-100 p-0.5">
        {OPCOES.map(({ valor, rotulo, Icone }) => {
          const marcado = atual === valor;
          return (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => escolherTema(valor)}
              className={cx(
                "flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-12 transition-colors duration-150",
                marcado ? "bg-white font-medium text-gray-900 shadow-segmento" : "text-gray-600 hover:text-gray-900",
              )}
            >
              <Icone aria-hidden="true" className="size-3.5" />
              {rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
