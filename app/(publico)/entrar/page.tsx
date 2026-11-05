import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CartaoCarregando, CartaoPublico, NotaDeRodape } from "@/components/publico";
import { destinoSeguro } from "@/lib/auth/destino";
import { contaExiste } from "@/lib/auth/servico";
import { obterSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";

import { FormularioEntrar } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  return (
    <>
      <Suspense fallback={<CartaoCarregando />}>
        <Cartao searchParams={searchParams} />
      </Suspense>
      <NotaDeRodape>Acesso restrito à equipe de TI.</NotaDeRodape>
    </>
  );
}

async function Cartao({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const { para } = await searchParams;
  const destino = destinoSeguro(para);

  // Ainda não existe conta: a primeira vez é para criá-la.
  if (!(await contaExiste(obterBanco()))) redirect("/primeiro-acesso");

  // Já entrou: segue direto.
  if (await obterSessao()) redirect(destino);

  return (
    <CartaoPublico>
      <FormularioEntrar para={destino} />
    </CartaoPublico>
  );
}
