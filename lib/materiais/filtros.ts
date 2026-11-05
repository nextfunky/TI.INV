import { comParametro } from "@/lib/itens/painel";

import { GRUPOS, type Grupo } from "./valores";

export type FiltrosDosMateriais = { busca?: string; grupo?: Grupo; local?: number };

function idPositivo(valor: string | string[] | undefined): number | undefined {
  const n = typeof valor === "string" && /^\d{1,9}$/.test(valor) ? Number(valor) : 0;
  return n > 0 ? n : undefined;
}

/** Lê os filtros do endereço (?q=cabo&grupo=cabos&local=3), ignorando valores que não existem. */
export function lerFiltrosDosMateriais(parametros: Record<string, string | string[] | undefined>): FiltrosDosMateriais {
  const q = typeof parametros.q === "string" ? parametros.q.trim().slice(0, 120) : "";
  const grupo = GRUPOS.find((g) => g === parametros.grupo);
  return { busca: q || undefined, grupo, local: idPositivo(parametros.local) };
}

export function enderecoDosMateriais(filtros: FiltrosDosMateriais): string {
  const p = new URLSearchParams();
  if (filtros.busca) p.set("q", filtros.busca);
  if (filtros.grupo) p.set("grupo", filtros.grupo);
  if (filtros.local) p.set("local", String(filtros.local));
  const consulta = p.toString();
  return consulta ? `/materiais?${consulta}` : "/materiais";
}

/** O material aberto no painel lateral (?material=12), ou null. */
export function materialDoEndereco(parametros: Record<string, string | string[] | undefined>): number | null {
  return idPositivo(parametros.material) ?? null;
}

/** O mesmo endereço com o painel aberto no material (ou fechado, com null). */
export function comMaterial(endereco: string, id: number | null): string {
  return comParametro(endereco, "material", id ? String(id) : null);
}
