import Link from "next/link";

import { cx } from "@/lib/classes";
import { enderecoDoInventario, type FiltrosDoInventario } from "@/lib/itens/consultas";
import { CATEGORIAS, NOME_DA_CATEGORIA, NOME_DO_STATUS, STATUS } from "@/lib/itens/valores";

import { Ponto } from "../status";

/**
 * A barra de filtros do Inventário. Cada filtro é um link: os filtros ficam
 * no endereço, então dá para voltar, recarregar e guardar o link.
 */
export function FiltrosDoInventario({ filtros }: { filtros: FiltrosDoInventario }) {
  const opcoesDeCategoria = [
    { valor: undefined, rotulo: "Todos" },
    ...CATEGORIAS.map((c) => ({ valor: c, rotulo: NOME_DA_CATEGORIA[c].filtro })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav aria-label="Categoria" className="flex rounded-lg bg-gray-100 p-1">
        {opcoesDeCategoria.map(({ valor, rotulo }) => {
          const ativa = filtros.categoria === valor;
          return (
            <Link
              key={rotulo}
              href={enderecoDoInventario({ categoria: valor, status: filtros.status })}
              aria-current={ativa ? "page" : undefined}
              className={cx(
                "rounded-md px-2 py-1 text-sm transition-colors duration-150 sm:px-3",
                ativa ? "bg-white font-medium text-gray-900 shadow-segmento" : "text-gray-600 hover:text-gray-900",
              )}
            >
              {rotulo}
            </Link>
          );
        })}
      </nav>

      <span aria-hidden="true" className="hidden h-5 w-px bg-gray-200 sm:block" />

      <nav aria-label="Status" className="flex flex-wrap gap-2">
        {STATUS.map((status) => {
          const ativo = filtros.status === status;
          return (
            <Link
              key={status}
              // Clicar no status já escolhido tira o filtro.
              href={enderecoDoInventario({ categoria: filtros.categoria, status: ativo ? undefined : status })}
              aria-current={ativo ? "page" : undefined}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-13 transition-colors duration-150",
                ativo
                  ? "border-accent bg-accent-suave text-accent"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
              )}
            >
              <Ponto status={status} />
              {NOME_DO_STATUS[status]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
