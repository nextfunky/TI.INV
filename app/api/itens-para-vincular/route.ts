import { NextResponse, type NextRequest } from "next/server";

import { obterSessao } from "@/lib/auth/sessao";
import { itensParaVincular } from "@/lib/colaboradores/servico";
import { obterBanco } from "@/lib/db";
import { nomeCompletoDoItem } from "@/lib/itens/nomes";

/** A lista da janela "Vincular itens" (página da pessoa). Responde só para quem está logado. */
export async function GET(request: NextRequest) {
  if (!(await obterSessao())) {
    return NextResponse.json({ erro: "Entre no sistema para continuar." }, { status: 401 });
  }

  const pessoa = Number(request.nextUrl.searchParams.get("pessoa"));
  if (!Number.isInteger(pessoa) || pessoa <= 0) return NextResponse.json({ itens: [] });
  const termo = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);

  const itens = await itensParaVincular(obterBanco(), pessoa, termo);
  return NextResponse.json(
    {
      itens: itens.map((i) => ({
        id: i.id,
        codigo: i.codigo,
        nome: nomeCompletoDoItem(i),
        status: i.status,
        usuario: i.usuario?.nome ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
