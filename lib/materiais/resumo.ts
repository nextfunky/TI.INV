import { SEM_VALOR } from "@/lib/caracteristicas/filtros";
import { dimensoesDasCaracteristicas } from "@/lib/caracteristicas/resumo";
import type { Caracteristica } from "@/lib/caracteristicas/valores";
import { CONDICOES, NOME_DA_CONDICAO, type Condicao } from "@/lib/itens/valores";
import { dimensaoDoLocal, type Dimensao } from "@/lib/resumo/tabela";

import type { listarMateriais } from "./servico";
import { GRUPOS, NOME_DO_GRUPO, type Grupo } from "./valores";

export type MaterialDoResumo = Awaited<ReturnType<typeof listarMateriais>>[number];

const alfabetica = (a: string, b: string) => a.localeCompare(b, "pt-BR");

/**
 * As dimensões do Resumo dos materiais: grupo, nome, condição, compatível com,
 * local e as características do grupo escolhido (menos as de texto livre).
 */
export function dimensoesDosMateriais(caracteristicas: Caracteristica[]): Dimensao<MaterialDoResumo>[] {
  return [
    {
      id: "grupo",
      rotulo: "Grupo",
      valor: (m) => ({ chave: m.grupo, rotulo: NOME_DO_GRUPO[m.grupo] }),
      comparar: (a, b) => GRUPOS.indexOf(a as Grupo) - GRUPOS.indexOf(b as Grupo),
      filtro: (c) => ({ grupo: c ?? "" }),
    },
    {
      id: "nome",
      rotulo: "Material",
      valor: (m) => ({ chave: m.nome, rotulo: m.nome }),
      comparar: alfabetica,
      filtro: (c) => ({ nome: c ?? "" }),
    },
    {
      id: "condicao",
      rotulo: "Condição",
      valor: (m) => ({ chave: m.condicao, rotulo: m.condicao ? NOME_DA_CONDICAO[m.condicao] : "Não informada" }),
      comparar: (a, b) => CONDICOES.indexOf(a as Condicao) - CONDICOES.indexOf(b as Condicao),
      filtro: (c) => ({ condicao: c ?? "nenhuma" }),
    },
    {
      id: "compativel",
      rotulo: "Compatível com",
      valor: (m) => ({ chave: m.compativelCom, rotulo: m.compativelCom ?? "Não informado" }),
      comparar: alfabetica,
      filtro: (c) => ({ compativel: c ?? SEM_VALOR }),
    },
    dimensaoDoLocal((m) => (m.localId !== null && m.caminho ? { id: m.localId, caminho: m.caminho } : null)),
    ...dimensoesDasCaracteristicas<MaterialDoResumo>(caracteristicas, (m) => m.caracteristicas),
  ];
}

/**
 * O cruzamento que já vem montado. Sem grupo: grupo × condição. Impressão:
 * impressora e condição × cor. Outro grupo com características: a 1ª (e a 3ª)
 * nas linhas × a 2ª nas colunas (ou a condição).
 */
export function eixosPadraoDosMateriais(grupo: Grupo | undefined, caracteristicas: Caracteristica[]): { linhas: string[]; colunas: string | null } {
  if (!grupo) return { linhas: ["grupo"], colunas: "condicao" };
  const dims = caracteristicas.filter((c) => c.tipo !== "texto").map((c) => `c${c.id}`);
  if (grupo === "impressao") {
    const cor = caracteristicas.find((c) => c.nome.toLocaleLowerCase("pt-BR") === "cor");
    return { linhas: ["compativel", "condicao"], colunas: cor ? `c${cor.id}` : (dims[0] ?? null) };
  }
  if (!dims.length) return { linhas: ["nome"], colunas: "condicao" };
  return { linhas: dims[2] ? [dims[0], dims[2]] : [dims[0]], colunas: dims[1] ?? "condicao" };
}
