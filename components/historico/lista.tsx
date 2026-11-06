import Link from "next/link";

import { cx } from "@/lib/classes";
import { textoDoRegistro } from "@/lib/historico/texto";
import type { Registro } from "@/lib/historico/servico";
import { formatarDataHora } from "@/lib/texto/data";

/** A cor do pontinho de cada evento: entrega/troca em verde, devolução em cinza, exclusão em vermelho. */
const COR = {
  cadastro: "bg-gray-400",
  entrega: "bg-uso",
  troca: "bg-uso",
  devolucao: "bg-estoque",
  mudanca_de_local: "bg-accent",
  mudou_com_a_pessoa: "bg-accent",
  exclusao: "bg-descartado",
} as const;

/**
 * Uma lista de registros do histórico. `comItem` mostra o código e a descrição
 * (no Início e na tela Histórico); no painel do item, não precisa.
 */
export function ListaDoHistorico({ registros, comItem = false }: { registros: Registro[]; comItem?: boolean }) {
  return (
    <ol className="flex flex-col gap-3">
      {registros.map((r) => (
        <li key={r.id} className="flex gap-3">
          <span aria-hidden="true" className={cx("mt-[7px] size-1.5 shrink-0 rounded-full", COR[r.evento])} />
          <span className="min-w-0">
            {comItem ? (
              <span className="block truncate">
                {r.itemId ? (
                  <Link href={`/inventario?item=${r.codigo}`} className="hover:text-accent">
                    <span className="font-mono text-13">{r.codigo}</span> {r.descricao}
                  </Link>
                ) : (
                  <span className="text-gray-500">
                    <span className="font-mono text-13">{r.codigo}</span> {r.descricao}
                  </span>
                )}
              </span>
            ) : null}
            <span className={cx("block break-words", comItem ? "text-13 text-gray-700" : "")}>{textoDoRegistro(r)}</span>
            <span className="block text-13 text-gray-500">
              {formatarDataHora(r.criadoEm)}
              {r.observacao ? ` · ${r.observacao}` : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
