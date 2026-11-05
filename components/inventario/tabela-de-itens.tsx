import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { subtituloDoItem, tituloDoItem } from "@/lib/itens/nomes";
import type { ItemComTipo } from "@/lib/itens/servico";

import { PontoDeStatus } from "../status";

/**
 * A tabela de itens. Só 5 colunas; o resto fica no detalhe.
 * A linha inteira é clicável e abre o detalhe do item.
 */
export function TabelaDeItens({ itens }: { itens: ItemComTipo[] }) {
  return (
    <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 text-13 font-medium text-gray-500">
            <th scope="col" className="w-28 py-3 pr-4 pl-6 font-medium">
              Código
            </th>
            <th scope="col" className="py-3 pr-4 font-medium">
              Descrição
            </th>
            <th scope="col" className="w-36 py-3 pr-4 font-medium">
              Tipo
            </th>
            <th scope="col" className="w-40 py-3 pr-4 font-medium">
              Status
            </th>
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
                className="group relative border-b border-gray-100 transition-colors duration-150 last:border-b-0 hover:bg-gray-50"
              >
                <td className="py-3 pr-4 pl-6 align-middle font-mono text-13 text-gray-500">{item.codigo}</td>
                <td className="min-h-14 py-2.5 pr-4 align-middle">
                  <Link
                    href={`/inventario/${item.codigo}`}
                    className="font-medium text-gray-900 after:absolute after:inset-0 after:content-['']"
                  >
                    {tituloDoItem(item)}
                  </Link>
                  {subtitulo ? <p className="text-13 text-gray-500">{subtitulo}</p> : null}
                </td>
                <td className="py-3 pr-4 align-middle text-gray-600">{item.tipo.nome}</td>
                <td className="py-3 pr-4 align-middle text-gray-700">
                  <PontoDeStatus status={item.status} />
                </td>
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
