import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/lib/classes";
import { subtituloDoItem, tituloDoItem } from "@/lib/itens/nomes";
import type { ItemComTipo } from "@/lib/itens/servico";

import { PontoDeStatus } from "../status";

/**
 * A tabela de itens. Poucas colunas; o resto fica no detalhe.
 * A linha inteira é clicável e abre o detalhe do item.
 * Na página da pessoa, a coluna Usuário sai (todos são dela) e entra uma ação
 * por linha ("Devolver").
 */
export function TabelaDeItens({
  itens,
  mostrarUsuario = true,
  acao,
  linkDoItem = (item) => `/inventario/${item.codigo}`,
  selecionado,
}: {
  itens: ItemComTipo[];
  mostrarUsuario?: boolean;
  acao?: (item: ItemComTipo) => ReactNode;
  /** Para onde a linha leva. Nas listas com painel lateral, é a própria lista com "?item=". */
  linkDoItem?: (item: ItemComTipo) => string;
  /** O código do item aberto no painel: a linha fica marcada. */
  selecionado?: string | null;
}) {
  // Com o painel aberto, a lista fica mais estreita: a coluna Tipo sai em telas médias.
  const comPainel = selecionado !== undefined && selecionado !== null;
  return (
    <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className={cx("w-full border-collapse text-left", comPainel ? "min-w-[560px]" : "min-w-[760px]")}>
        <thead>
          <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
            <th scope="col" className="w-28 py-3 pr-4 pl-6 font-medium">
              Código
            </th>
            <th scope="col" className="py-3 pr-4 font-medium">
              Descrição
            </th>
            <th scope="col" className={cx("w-36 py-3 pr-4 font-medium", comPainel && "max-xl:hidden")}>
              Tipo
            </th>
            {mostrarUsuario ? (
              <th scope="col" className="w-52 py-3 pr-4 font-medium">
                Usuário e local
              </th>
            ) : null}
            <th scope="col" className="w-40 py-3 pr-4 font-medium">
              Status
            </th>
            {acao ? (
              <th scope="col" className="w-28 py-3 pr-2">
                <span className="sr-only">Ações</span>
              </th>
            ) : null}
            <th scope="col" className="w-12 py-3 pr-6">
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const subtitulo = subtituloDoItem(item);
            return (
              <tr
                key={item.id}
                aria-current={item.codigo === selecionado ? "true" : undefined}
                className={cx(
                  "group relative border-b border-gray-100 transition-colors duration-150 last:border-b-0 hover:bg-gray-50",
                  item.codigo === selecionado && "bg-gray-50 shadow-[inset_3px_0_0_var(--color-accent)]",
                )}
              >
                <td className="py-3 pr-4 pl-6 align-middle font-mono text-13 text-gray-500">{item.codigo}</td>
                <td className="min-h-14 py-2.5 pr-4 align-middle">
                  <Link
                    href={linkDoItem(item)}
                    scroll={false}
                    className="font-medium text-gray-900 after:absolute after:inset-0 after:content-['']"
                  >
                    {tituloDoItem(item)}
                  </Link>
                  {subtitulo ? <p className="text-13 text-gray-500">{subtitulo}</p> : null}
                </td>
                <td className={cx("py-3 pr-4 align-middle text-gray-600", comPainel && "max-xl:hidden")}>{item.tipo.nome}</td>
                {mostrarUsuario ? (
                  <td className="max-w-52 py-2.5 pr-4 align-middle">
                    <p className="truncate text-gray-700">
                      {item.usuario ? item.usuario.nome : <span className="text-gray-500">—</span>}
                    </p>
                    {item.local ? (
                      <p className="truncate text-13 text-gray-500" title={item.local.caminho}>
                        {item.local.nome}
                      </p>
                    ) : null}
                  </td>
                ) : null}
                <td className="py-3 pr-4 align-middle text-gray-700">
                  <PontoDeStatus status={item.status} />
                </td>
                {acao ? <td className="py-2 pr-2 text-right align-middle">{acao(item)}</td> : null}
                <td className="py-3 pr-6 align-middle">
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 text-gray-300 transition-colors duration-150 group-hover:text-gray-500"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
