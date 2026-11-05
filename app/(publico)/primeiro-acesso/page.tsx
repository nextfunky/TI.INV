import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CartaoCarregando, CartaoPublico, NotaDeRodape } from "@/components/publico";
import { contaExiste } from "@/lib/auth/servico";
import { obterBanco } from "@/lib/db";

import { FormularioPrimeiroAcesso } from "./formulario";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default function PaginaPrimeiroAcesso() {
  return (
    <>
      <Suspense fallback={<CartaoCarregando altura="h-96" />}>
        <Cartao />
      </Suspense>
      <NotaDeRodape>Esta tela só aparece enquanto a conta não existe.</NotaDeRodape>
    </>
  );
}

async function Cartao() {
  await connection();

  // A conta já existe: esta tela não vale mais.
  if (await contaExiste(obterBanco())) redirect("/entrar");

  return (
    <CartaoPublico>
      <div className="mb-5">
        <h2 className="text-base font-semibold">Crie a conta de acesso</h2>
        <p className="mt-1 text-13 text-gray-500">
          É com ela que você vai entrar no sistema. Existe uma conta só.
        </p>
      </div>
      <FormularioPrimeiroAcesso />
    </CartaoPublico>
  );
}
