import { cx } from "@/lib/classes";
import { iniciais } from "@/lib/texto/iniciais";

const TAMANHOS = {
  32: "size-8 text-12",
  36: "size-9 text-13",
  48: "size-12 text-base",
} as const;

/** Círculo azul-claro com as iniciais da pessoa ("João Lima" → "JL"). */
export function Avatar({ nome, tamanho = 32 }: { nome: string; tamanho?: keyof typeof TAMANHOS }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full bg-accent-suave font-semibold text-accent-forte",
        TAMANHOS[tamanho],
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
