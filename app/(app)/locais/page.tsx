import { Folder, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { AcoesDaArvore } from "@/components/locais/acoes-da-arvore";
import { exigirSessao } from "@/lib/auth/sessao";
import { cx } from "@/lib/classes";
import { obterBanco } from "@/lib/db";
import { contagensDosLocais, listarLocais, type ContagemDoLocal } from "@/lib/locais/servico";
import { juntar, plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Locais" };

export default function PaginaLocais() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina
          titulo="Locais"
          subtitulo="Os lugares da empresa. Um local pode ficar dentro de outro, quantos níveis precisar."
        />
        <Link href="/locais/novo" className={classesDoBotao("secundario")}>
          <Plus aria-hidden="true" />
          Novo local
        </Link>
      </div>
      <div className="mt-8">
        <Suspense fallback={<div aria-hidden="true" className="h-80 rounded-xl border border-gray-200 bg-white" />}>
          <Arvore />
        </Suspense>
      </div>
    </>
  );
}

function resumo(c: ContagemDoLocal | undefined): string {
  if (!c || (!c.pessoas && !c.itensSemUsuario)) return "Vazio";
  return juntar(
    c.pessoas ? plural(c.pessoas, "pessoa", "pessoas") : null,
    c.itensSemUsuario ? plural(c.itensSemUsuario, "item sem usuário", "itens sem usuário") : null,
  );
}

async function Arvore() {
  await exigirSessao();
  const db = obterBanco();
  const [locais, contagens] = await Promise.all([listarLocais(db), contagensDosLocais(db)]);

  if (!locais.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white">
        <EstadoVazio
          icone={MapPin}
          titulo="Nenhum local cadastrado"
          texto="Comece pelos lugares maiores, como a filial ou o andar, e depois crie os setores dentro deles. Ou cadastre só os setores."
          acao={
            <Link href="/locais/novo" className={classesDoBotao("secundario")}>
              <Plus aria-hidden="true" />
              Novo local
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <ul className="rounded-xl border border-gray-200 bg-white">
        {locais.map((local) => {
          const c = contagens.get(local.id);
          return (
            <li
              key={local.id}
              className="group flex min-h-14 items-center gap-3 border-b border-gray-100 py-2 pr-4 last:border-b-0"
              style={{ paddingLeft: 24 + 28 * local.nivel }}
            >
              <Folder
                aria-hidden="true"
                className={cx("size-4 shrink-0", local.nivel === 0 ? "text-gray-600" : "text-gray-400")}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/locais/${local.id}`}
                  className={cx(
                    "break-words transition-colors duration-150 hover:text-accent",
                    local.nivel === 0 && "font-semibold",
                  )}
                >
                  {local.nome}
                </Link>
                <p className="text-13 text-gray-500">{resumo(c)}</p>
              </div>
              <AcoesDaArvore id={local.id} caminho={local.caminho} vazio={Boolean(c?.vazio)} />
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-13 text-gray-500">
        Clique num local para ver quem e o que está nele. Um local só pode ser excluído quando não tem outros locais,
        pessoas nem itens.
      </p>
    </>
  );
}
