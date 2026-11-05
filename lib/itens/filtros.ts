import { CATEGORIAS, CONDICOES, STATUS, type Categoria, type Condicao, type Status } from "./valores";

/**
 * Os filtros do Inventário e o endereço que eles formam. Não depende do banco,
 * então também roda no navegador.
 */

export type FiltrosDoInventario = {
  /** Texto da busca na lista. */
  busca?: string;
  categoria?: Categoria;
  status?: Status;
  /** Id do tipo de item. */
  tipo?: number;
  condicao?: Condicao;
  /** Id do colaborador (o chip "Com João Lima ×"). */
  pessoa?: number;
  pagina: number;
};

type Parametros = Record<string, string | string[] | undefined>;

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

function idPositivo(v: string | string[] | undefined) {
  const n = Number(texto(v));
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function umDe<T extends string>(lista: readonly T[], v: string | string[] | undefined): T | undefined {
  const t = texto(v);
  return (lista as readonly string[]).includes(t ?? "") ? (t as T) : undefined;
}

/** Lê os filtros do endereço (?categoria=periferico&status=em_uso&pagina=2), ignorando valores inválidos. */
export function lerFiltros(parametros: Parametros): FiltrosDoInventario {
  const busca = texto(parametros.q)?.trim().slice(0, 100);
  return {
    busca: busca || undefined,
    categoria: umDe(CATEGORIAS, parametros.categoria),
    status: umDe(STATUS, parametros.status),
    tipo: idPositivo(parametros.tipo),
    condicao: umDe(CONDICOES, parametros.condicao),
    pessoa: idPositivo(parametros.pessoa),
    pagina: idPositivo(parametros.pagina) ?? 1,
  };
}

/** Algum filtro (fora a página) está ligado? */
export function temFiltro(filtros: FiltrosDoInventario): boolean {
  return Boolean(
    filtros.busca || filtros.categoria || filtros.status || filtros.tipo || filtros.condicao || filtros.pessoa,
  );
}

/** Monta o endereço do Inventário com os filtros. Mudar um filtro volta para a página 1. */
export function enderecoDoInventario(filtros: Partial<FiltrosDoInventario>): string {
  const p = new URLSearchParams();
  if (filtros.busca) p.set("q", filtros.busca);
  if (filtros.categoria) p.set("categoria", filtros.categoria);
  if (filtros.status) p.set("status", filtros.status);
  if (filtros.tipo) p.set("tipo", String(filtros.tipo));
  if (filtros.condicao) p.set("condicao", filtros.condicao);
  if (filtros.pessoa) p.set("pessoa", String(filtros.pessoa));
  if (filtros.pagina && filtros.pagina > 1) p.set("pagina", String(filtros.pagina));
  const consulta = p.toString();
  return consulta ? `/inventario?${consulta}` : "/inventario";
}
