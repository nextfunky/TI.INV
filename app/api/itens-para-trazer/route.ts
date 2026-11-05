import { NextResponse, type NextRequest } from "next/server";

import { obterSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { nomeCompletoDoItem } from "@/lib/itens/nomes";
import { itensParaTrazer } from "@/lib/locais/servico";

/** A lista da janela "Trazer itens" (página do local). Responde só para quem está logado. */
export async function GET(request: NextRequest) {
  if (!(await obterSessao())) {
    return NextResponse.json({ erro: "Entre no sistema para continuar." }, { status: 401 });
  }
  const local = Number(request.nextUrl.searchParams.get("local"));
  if (!Number.isInteger(local) || local <= 0) return NextResponse.json({ opcoes: [] });
  const termo = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);

  const itens = await itensParaTrazer(obterBanco(), local, termo);
  return NextResponse.json(
    {
      opcoes: itens.map((i) => ({
        id: i.id,
        codigo: i.codigo,
        nome: nomeCompletoDoItem(i),
        status: i.status,
        aviso: i.local ? `Em ${i.local.caminho}` : null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
