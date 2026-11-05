import { cx } from "@/lib/classes";
import { COR_DO_STATUS, NOME_DO_STATUS, type Status } from "@/lib/itens/valores";

/** O ponto colorido de 6px. Sempre acompanhado do nome do status. */
export function Ponto({ status, className }: { status: Status; className?: string }) {
  return <span aria-hidden="true" className={cx("size-1.5 shrink-0 rounded-full", COR_DO_STATUS[status], className)} />;
}

/** Ponto + nome: "● Em uso". */
export function PontoDeStatus({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Ponto status={status} />
      {NOME_DO_STATUS[status]}
    </span>
  );
}

/** A etiqueta do detalhe do item: pílula com borda, ponto e nome. */
export function EtiquetaDeStatus({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-13 text-gray-700">
      <Ponto status={status} />
      {NOME_DO_STATUS[status]}
    </span>
  );
}
