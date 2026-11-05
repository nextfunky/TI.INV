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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Suspense>
          <Avisos />
        </Suspense>
      </body>
    </html>
  );
}
