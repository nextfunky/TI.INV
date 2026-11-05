import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

// Fontes guardadas no projeto (sem Google Fonts). O navegador só baixa o
// pedaço de cada fonte que a página usa (latim e latim estendido).
import "@fontsource-variable/inter/wght.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-ext-400.css";
import "@fontsource/ibm-plex-mono/latin-ext-500.css";
import "./globals.css";

import { Avisos } from "@/components/avisos";

export const metadata: Metadata = {
  title: {
    template: "%s · Inventário de TI",
    default: "Inventário de TI",
  },
  description: "Cada equipamento, quem usa e onde está.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b1e" },
  ],
};

/**
 * Aplica o tema escolhido (Claro ou Escuro) antes de a página aparecer, para
 * não piscar. Sem escolha, vale o do sistema (CSS prefers-color-scheme).
 */
const SCRIPT_DO_TEMA = `try{var t=localStorage.getItem("tema");if(t==="claro"||t==="escuro")document.documentElement.dataset.tema=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // O script muda o data-tema do <html> antes do React: o aviso de diferença é esperado.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DO_TEMA }} />
      </head>
      <body>
        {children}
        <Suspense>
          <Avisos />
        </Suspense>
      </body>
    </html>
  );
}
