import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Quando não há nada para mostrar: ícone, título, uma frase e, se fizer sentido, uma ação. */
export function EstadoVazio({
  icone: Icone,
  titulo,
  texto,
  acao,
}: {
  icone: LucideIcon;
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-[10px] bg-gray-100 text-gray-500">
        <Icone aria-hidden="true" className="size-[18px]" />
      </span>
      <h2 className="mt-4 font-medium">{titulo}</h2>
      {texto ? <p className="mt-1 max-w-sm text-gray-500">{texto}</p> : null}
      {acao ? <div className="mt-5">{acao}</div> : null}
    </div>
  );
}
