import {
  escreverFiltrosDeCaracteristicas,
  lerFiltrosDeCaracteristicas,
  temFiltroDeCaracteristica,
  type FiltrosDeCaracteristicas,
} from "@/lib/caracteristicas/filtros";
import { comParametro } from "@/lib/itens/painel";
import { CONDICOES, type Condicao } from "@/lib/itens/valores";

import { GRUPOS, type Grupo } from "./valores";

/** "nenhuma" = sem condição informada (os que estavam "Em análise", por exemplo). */
export type CondicaoDoFiltro = Condicao | "nenhuma";

export type FiltrosDosMateriais = {
  busca?: string;
  grupo?: Grupo;
  /** Id do local (inclui os de dentro) ou "sem" (sem local definido). */
  local?: number | "sem";
  condicao?: CondicaoDoFiltro;
  /** Compatível com (texto exato, como aparece na lista), ou "nenhum" (sem informação). */
  compativel?: string;
  /** O nome exato do material (vem do Resumo, ao clicar numa célula). */
  nome?: string;
  /** Filtros por característica do grupo: { idDaCaracteristica: valor } ("nenhum" = sem valor). */
  caracteristicas?: FiltrosDeCaracteristicas;
};

/** Algum filtro ligado? */
export function filtrandoMateriais(f: FiltrosDosMateriais): boolean {
  return Boolean(f.busca || f.grupo || f.local || f.condicao || f.compativel || f.nome || temFiltroDeCaracteristica(f.caracteristicas));
}

function idPositivo(valor: string | string[] | undefined): number | undefined {
  const n = typeof valor === "string" && /^\d{1,9}$/.test(valor) ? Number(valor) : 0;
  return n > 0 ? n : undefined;
}

/** Lê os filtros do endereço (?q=cabo&grupo=cabos&local=3), ignorando valores que não existem. */
export function lerFiltrosDosMateriais(parametros: Record<string, string | string[] | undefined>): FiltrosDosMateriais {
  const q = typeof parametros.q === "string" ? parametros.q.trim().slice(0, 120) : "";
  const grupo = GRUPOS.find((g) => g === parametros.grupo);
  const condicao = [...CONDICOES, "nenhuma" as const].find((c) => c === parametros.condicao);
  const compativel = typeof parametros.compativel === "string" ? parametros.compativel.trim().slice(0, 100) : "";
  const nome = typeof parametros.nome === "string" ? parametros.nome.trim().slice(0, 100) : "";
  return {
    busca: q || undefined,
    grupo,
    local: parametros.local === "sem" ? "sem" : idPositivo(parametros.local),
    condicao,
    compativel: compativel || undefined,
    nome: nome || undefined,
    // As características dependem do grupo: sem grupo, não valem.
    caracteristicas: grupo ? lerFiltrosDeCaracteristicas(parametros) : {},
  };
}

export function enderecoDosMateriais(filtros: FiltrosDosMateriais): string {
  const p = new URLSearchParams();
  if (filtros.busca) p.set("q", filtros.busca);
  if (filtros.grupo) p.set("grupo", filtros.grupo);
  if (filtros.local) p.set("local", String(filtros.local));
  if (filtros.condicao) p.set("condicao", filtros.condicao);
  if (filtros.compativel) p.set("compativel", filtros.compativel);
  if (filtros.nome) p.set("nome", filtros.nome);
  escreverFiltrosDeCaracteristicas(p, filtros.caracteristicas);
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
