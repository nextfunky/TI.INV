import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { classesDoBotao } from "@/components/botao";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-[10px] bg-gray-100 text-gray-500">
        <Search aria-hidden="true" className="size-[18px]" />
      </span>
      <h1 className="mt-4 font-medium">Página não encontrada</h1>
      <p className="mt-1 max-w-sm text-gray-500">O endereço pode estar errado, ou a página ainda não existe.</p>
      <Link href="/" className={classesDoBotao("secundario", "mt-6")}>
        Voltar ao início
      </Link>
    </main>
  );
}
