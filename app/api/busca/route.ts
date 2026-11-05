import { NextResponse, type NextRequest } from "next/server";

import { obterSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { buscarItens } from "@/lib/itens/consultas";
import { nomeCompletoDoItem } from "@/lib/itens/nomes";

/** Busca rápida ("Editar item" / Ctrl+K). Responde só para quem está logado. */
export async function GET(request: NextRequest) {
  if (!(await obterSessao())) {
    return NextResponse.json({ erro: "Entre no sistema para buscar." }, { status: 401 });
  }

  const termo = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const itens = await buscarItens(obterBanco(), termo);

  return NextResponse.json(
    {
      itens: itens.map((i) => ({
        codigo: i.codigo,
        nome: nomeCompletoDoItem(i),
        usuario: i.usuario?.nome ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
