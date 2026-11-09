import { lerFiltrosDeCaracteristicas, type FiltrosDeCaracteristicas } from "@/lib/caracteristicas/filtros";
import { lerFiltros, type FiltrosDoInventario } from "@/lib/itens/filtros";
import { CATEGORIAS, CONDICOES, type Categoria } from "@/lib/itens/valores";
import type { CondicaoDoFiltro } from "@/lib/materiais/filtros";
import { GRUPOS, type Grupo } from "@/lib/materiais/valores";

/**
 * O pedido de relatório de conferência, lido do endereço. Não depende do banco.
 *
 *   /relatorios/conferencia?itens=1&materiais=1&categorias=periferico&categorias=movel&grupos=cabos&local=3
 *
 * Os filtros do Inventário (q, categoria, status, tipo, condicao, c<id>, pessoa, local) valem para os itens;
 * os dos materiais usam mq (busca), grupos, mcondicao, mcompativel, mnome e mc<id> (as características,
 * só com um grupo escolhido). O local vale para os dois.
 */
export type PedidoDeConferencia = {
  itens: boolean;
  materiais: boolean;
  filtrosDosItens: Omit<FiltrosDoInventario, "pagina"> & { categorias: Categoria[] };
  filtrosDosMateriais: {
    busca?: string;
    grupos: Grupo[];
    local?: number | "sem";
    condicao?: CondicaoDoFiltro;
    compativel?: string;
    nome?: string;
    caracteristicas: FiltrosDeCaracteristicas;
  };
};

type Parametros = Record<string, string | string[] | undefined>;

/** Aceita "a,b" e também a mesma chave repetida (?categorias=a&categorias=b). */
function lista<T extends string>(valores: readonly T[], parametro: string | string[] | undefined): T[] {
  const partes = (Array.isArray(parametro) ? parametro : parametro ? [parametro] : []).flatMap((v) => v.split(","));
  return valores.filter((v) => partes.includes(v));
}

export function lerPedidoDeConferencia(parametros: Parametros): PedidoDeConferencia {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pagina, ...filtros } = lerFiltros(parametros);
  const mq = typeof parametros.mq === "string" ? parametros.mq.trim().slice(0, 120) : "";
  const mnome = typeof parametros.mnome === "string" ? parametros.mnome.trim().slice(0, 100) : "";
  const grupos = lista(GRUPOS, parametros.grupos);
  const itens = parametros.itens === "1";
  const materiais = parametros.materiais === "1";
  return {
    // Sem dizer o que conferir, vale só os itens.
    itens: itens || !materiais,
    materiais,
    filtrosDosItens: { ...filtros, categorias: lista(CATEGORIAS, parametros.categorias) },
    filtrosDosMateriais: {
      busca: mq || undefined,
      grupos,
      local: filtros.local,
      condicao: [...CONDICOES, "nenhuma" as const].find((c) => c === parametros.mcondicao),
      compativel: typeof parametros.mcompativel === "string" && parametros.mcompativel.trim() ? parametros.mcompativel.trim().slice(0, 100) : undefined,
      nome: mnome || undefined,
      // As características são de um grupo: com vários grupos (ou nenhum), não valem.
      caracteristicas: grupos.length === 1 ? lerFiltrosDeCaracteristicas(parametros, "mc") : {},
    },
  };
}
