import { dimensoesDasCaracteristicas } from "@/lib/caracteristicas/resumo";
import type { Caracteristica } from "@/lib/caracteristicas/valores";
import { dimensaoDoLocal, type Dimensao } from "@/lib/resumo/tabela";

import type { ItemComTipo } from "./servico";
import { CATEGORIAS, CONDICOES, NOME_DA_CATEGORIA, NOME_DA_CONDICAO, NOME_DO_STATUS, STATUS, type Categoria, type Condicao, type Status } from "./valores";

/**
 * As dimensões do Resumo do Inventário: tipo, categoria, status, condição,
 * local (o atual: o da pessoa ou o do item) e as características do tipo
 * escolhido (menos as de texto livre). Cada item conta 1.
 */
export function dimensoesDosItens(caracteristicas: Caracteristica[]): Dimensao<ItemComTipo>[] {
  // O tipo segue a ordem das categorias e, dentro delas, o nome.
  const tipos = new Map<string, { nome: string; categoria: Categoria }>();
  return [
    {
      id: "tipo",
      rotulo: "Tipo",
      valor: (i) => {
        tipos.set(String(i.tipoId), { nome: i.tipo.nome, categoria: i.tipo.categoria });
        return { chave: String(i.tipoId), rotulo: i.tipo.nome };
      },
      comparar: (a, b) => {
        const ta = tipos.get(a)!;
        const tb = tipos.get(b)!;
        return CATEGORIAS.indexOf(ta.categoria) - CATEGORIAS.indexOf(tb.categoria) || ta.nome.localeCompare(tb.nome, "pt-BR");
      },
      filtro: (c) => ({ tipo: c ?? "" }),
    },
    {
      id: "categoria",
      rotulo: "Categoria",
      valor: (i) => ({ chave: i.tipo.categoria, rotulo: NOME_DA_CATEGORIA[i.tipo.categoria].filtro }),
      comparar: (a, b) => CATEGORIAS.indexOf(a as Categoria) - CATEGORIAS.indexOf(b as Categoria),
      filtro: (c) => ({ categoria: c ?? "" }),
    },
    {
      id: "status",
      rotulo: "Status",
      valor: (i) => ({ chave: i.status, rotulo: NOME_DO_STATUS[i.status] }),
      comparar: (a, b) => STATUS.indexOf(a as Status) - STATUS.indexOf(b as Status),
      filtro: (c) => ({ status: c ?? "" }),
    },
    {
      id: "condicao",
      rotulo: "Condição",
      valor: (i) => ({ chave: i.condicao, rotulo: i.condicao ? NOME_DA_CONDICAO[i.condicao] : "Não informada" }),
      comparar: (a, b) => CONDICOES.indexOf(a as Condicao) - CONDICOES.indexOf(b as Condicao),
      filtro: (c) => ({ condicao: c ?? "nenhuma" }),
    },
    dimensaoDoLocal((i) => i.local),
    ...dimensoesDasCaracteristicas<ItemComTipo>(caracteristicas, (i) => i.caracteristicas),
  ];
}

/**
 * O cruzamento que já vem montado. Sem tipo: tipo × status. Com um tipo que
 * tem características: a 1ª (e a 3ª) nas linhas × a 2ª nas colunas (ou a
 * condição). Tipo sem características: local × condição.
 */
export function eixosPadraoDosItens(tipo: number | undefined, caracteristicas: Caracteristica[]): { linhas: string[]; colunas: string | null } {
  if (!tipo) return { linhas: ["tipo"], colunas: "status" };
  const dims = caracteristicas.filter((c) => c.tipo !== "texto").map((c) => `c${c.id}`);
  if (!dims.length) return { linhas: ["local"], colunas: "condicao" };
  return { linhas: dims[2] ? [dims[0], dims[2]] : [dims[0]], colunas: dims[1] ?? "condicao" };
}
