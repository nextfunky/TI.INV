"use client";

import { RotateCcw } from "lucide-react";

import { Botao } from "@/components/botao";

/** Quando algo dá errado no servidor (ex.: o banco não responde). */
export default function Erro({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-medium">Algo deu errado</h1>
      <p className="mt-1 max-w-sm text-gray-500">
        Não foi possível carregar esta página. Se continuar, confira se o banco está configurado (DATABASE_URL) e atualizado (npm run db:migrate).
      </p>
      <Botao className="mt-6" onClick={() => retry()}>
        <RotateCcw aria-hidden="true" />
        Tentar de novo
      </Botao>
    </main>
  );
}
