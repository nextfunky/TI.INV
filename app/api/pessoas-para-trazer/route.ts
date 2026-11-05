import { NextResponse, type NextRequest } from "next/server";

import { obterSessao } from "@/lib/auth/sessao";
import { obterBanco } from "@/lib/db";
import { pessoasParaTrazer } from "@/lib/locais/servico";

/** A lista da janela "Trazer pessoas" (página do local). Responde só para quem está logado. */
export async function GET(request: NextRequest) {
  if (!(await obterSessao())) {
    return NextResponse.json({ erro: "Entre no sistema para continuar." }, { status: 401 });
  }
  const local = Number(request.nextUrl.searchParams.get("local"));
  if (!Number.isInteger(local) || local <= 0) return NextResponse.json({ opcoes: [] });
  const termo = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 120);

  const pessoas = await pessoasParaTrazer(obterBanco(), local, termo);
  return NextResponse.json(
    {
      opcoes: pessoas.map((p) => ({
        id: p.id,
        nome: p.nome,
        aviso: p.caminho ? `Em ${p.caminho}` : null,
        detalhe: "Sem local",
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
