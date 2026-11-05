import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cx } from "@/lib/classes";

const BASE_DO_CAMPO =
  "w-full rounded-lg border bg-white text-sm text-gray-900 transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500";

function classesDoCampo(erro?: string) {
  return cx(
    BASE_DO_CAMPO,
    erro
      ? "border-descartado focus:border-descartado focus:ring-descartado/10"
      : "border-gray-300 focus:border-accent focus:ring-accent/12",
  );
}

type PropsDaMoldura = {
  id: string;
  rotulo: string;
  dica?: ReactNode;
  erro?: string;
  /** O rótulo fica só para leitores de tela. */
  rotuloEscondido?: boolean;
  className?: string;
};

/**
 * Rótulo, dica e erro em volta de um campo, ligados entre si para os
 * leitores de tela (aria-describedby / aria-invalid).
 */
function Moldura({
  id,
  rotulo,
  dica,
  erro,
  rotuloEscondido,
  className,
  children,
}: PropsDaMoldura & { children: (ligacao: Record<string, unknown>) => ReactNode }) {
  const idDaDica = dica && !erro ? `${id}-dica` : undefined;
  const idDoErro = erro ? `${id}-erro` : undefined;
  const ligacao = {
    id,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": cx(idDoErro, idDaDica) || undefined,
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={rotuloEscondido ? "sr-only" : "mb-1.5 block text-13 font-medium text-gray-700"}
      >
        {rotulo}
      </label>
      {children(ligacao)}
      {erro ? (
        <p id={idDoErro} className="mt-1.5 text-13 text-descartado">
          {erro}
        </p>
      ) : null}
      {dica && !erro ? (
        <p id={idDaDica} className="mt-1.5 text-13 text-gray-500">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

type PropsDoCampo<T extends "input" | "select" | "textarea"> = Omit<ComponentProps<T>, "id"> & PropsDaMoldura;

/** Campo de texto (também para datas e senhas). */
export function CampoTexto({ id, rotulo, dica, erro, rotuloEscondido, className, ...props }: PropsDoCampo<"input">) {
  return (
    <Moldura {...{ id, rotulo, dica, erro, rotuloEscondido, className }}>
      {(ligacao) => <input {...ligacao} className={cx(classesDoCampo(erro), "h-10 px-3")} {...props} />}
    </Moldura>
  );
}

/** Lista de opções, com a seta própria no lugar da aparência do sistema. */
export function CampoSelecao({
  id,
  rotulo,
  dica,
  erro,
  rotuloEscondido,
  className,
  children,
  ...props
}: PropsDoCampo<"select">) {
  return (
    <Moldura {...{ id, rotulo, dica, erro, rotuloEscondido, className }}>
      {(ligacao) => (
        <div className="relative">
          <select
            {...ligacao}
            className={cx(classesDoCampo(erro), "h-10 cursor-pointer appearance-none pr-9 pl-3")}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-500"
          />
        </div>
      )}
    </Moldura>
  );
}

/** Área de texto com várias linhas (Observações). */
export function CampoTextoLongo({ id, rotulo, dica, erro, rotuloEscondido, className, ...props }: PropsDoCampo<"textarea">) {
  return (
    <Moldura {...{ id, rotulo, dica, erro, rotuloEscondido, className }}>
      {(ligacao) => (
        <textarea {...ligacao} className={cx(classesDoCampo(erro), "min-h-28 resize-y px-3 py-2.5")} {...props} />
      )}
    </Moldura>
  );
}

/** Faixa vermelha no topo do formulário. */
export function FaixaDeErro({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-13 text-red-700">
      {children}
    </div>
  );
}
