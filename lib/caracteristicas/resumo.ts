import type { Dimensao } from "@/lib/resumo/tabela";

import { SEM_VALOR } from "./filtros";
import { compararValores, valorFormatado } from "./regras";
import type { Caracteristica, ValoresDasCaracteristicas } from "./valores";

/**
 * Uma dimensão do Resumo para cada característica de lista ou de número
 * (as de texto livre, como IMEI, não servem para agrupar).
 */
export function dimensoesDasCaracteristicas<T>(
  caracteristicas: Caracteristica[],
  valores: (t: T) => ValoresDasCaracteristicas | null | undefined,
): Dimensao<T>[] {
  return caracteristicas
    .filter((c) => c.tipo !== "texto")
    .map((c) => ({
      id: `c${c.id}`,
      rotulo: c.nome,
      valor: (t: T) => {
        const v = valores(t)?.[c.id];
        return { chave: v ?? null, rotulo: v ? valorFormatado(c, v) : "Não informado" };
      },
      comparar: (a: string, b: string) => compararValores(c, a, b),
      filtro: (v: string | null) => ({ [`c${c.id}`]: v ?? SEM_VALOR }),
    }));
}
