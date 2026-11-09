import { etiquetasDasCaracteristicas } from "@/lib/caracteristicas/regras";
import type { Caracteristica, ValoresDasCaracteristicas } from "@/lib/caracteristicas/valores";

/** As características em etiquetas pequenas, na linha da lista: [Magenta] [Compatível]. */
export function EtiquetasDasCaracteristicas({
  caracteristicas,
  valores,
}: {
  caracteristicas: Caracteristica[] | undefined;
  valores: ValoresDasCaracteristicas | null | undefined;
}) {
  const etiquetas = etiquetasDasCaracteristicas(caracteristicas ?? [], valores);
  if (!etiquetas.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {etiquetas.map((e) => (
        <span key={e} className="rounded bg-gray-100 px-1.5 py-px text-12 text-gray-600">
          {e}
        </span>
      ))}
    </span>
  );
}

/** As características em "rótulo → valor", para os painéis. Mostra também as vazias, para lembrar de preencher. */
export function DadosDasCaracteristicas({
  caracteristicas,
  valores,
  formatar,
}: {
  caracteristicas: Caracteristica[];
  valores: ValoresDasCaracteristicas | null | undefined;
  formatar: (c: Caracteristica, v: string) => string;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {caracteristicas.map((c) => {
        const v = valores?.[c.id];
        return (
          <div key={c.id} className="min-w-0">
            <dt className="text-13 text-gray-500">{c.nome}</dt>
            <dd className={v ? "mt-0.5 break-words" : "mt-0.5 text-gray-500"}>{v ? formatar(c, v) : "Não informado"}</dd>
          </div>
        );
      })}
    </dl>
  );
}
