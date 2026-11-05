import { GRUPOS, type Grupo } from "./valores";

export type FiltrosDosMateriais = { busca?: string; grupo?: Grupo };

/** Lê os filtros do endereço (?q=cabo&grupo=cabos), ignorando valores que não existem. */
export function lerFiltrosDosMateriais(parametros: Record<string, string | string[] | undefined>): FiltrosDosMateriais {
  const q = typeof parametros.q === "string" ? parametros.q.trim().slice(0, 120) : "";
  const grupo = GRUPOS.find((g) => g === parametros.grupo);
  return { busca: q || undefined, grupo };
}

export function enderecoDosMateriais(filtros: FiltrosDosMateriais): string {
  const p = new URLSearchParams();
  if (filtros.busca) p.set("q", filtros.busca);
  if (filtros.grupo) p.set("grupo", filtros.grupo);
  const consulta = p.toString();
  return consulta ? `/materiais?${consulta}` : "/materiais";
}
