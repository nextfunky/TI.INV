import { eq } from "drizzle-orm";

import { SEM_VALOR, temFiltroDeCaracteristica } from "@/lib/caracteristicas/filtros";
import { descreverFiltros } from "@/lib/caracteristicas/regras";
import { caracteristicasDoGrupo, caracteristicasDoTipo, simples } from "@/lib/caracteristicas/servico";
import { colaboradores, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { todosOsItens } from "@/lib/itens/consultas";
import type { ItemComTipo } from "@/lib/itens/servico";
import { CATEGORIAS, NOME_DA_CATEGORIA, NOME_DA_CONDICAO, NOME_DO_STATUS } from "@/lib/itens/valores";
import { listarLocais } from "@/lib/locais/servico";
import { listarMateriais } from "@/lib/materiais/servico";
import { GRUPOS, NOME_DO_GRUPO, type Grupo } from "@/lib/materiais/valores";

import type { PedidoDeConferencia } from "./pedido";

type MaterialDaConferencia = Awaited<ReturnType<typeof listarMateriais>>[number];

export type DadosDaConferencia = {
  /** Os filtros usados, em frases curtas: "Categorias: Periféricos", "Status: Em estoque". */
  filtros: string[];
  itens: { total: number; porTipo: Array<{ tipo: string; itens: ItemComTipo[] }> } | null;
  materiais: { total: number; unidades: number; porGrupo: Array<{ grupo: Grupo; materiais: MaterialDaConferencia[] }> } | null;
};

/** Tudo o que o relatório de conferência mostra: os itens por tipo e os materiais por grupo. */
export async function dadosDaConferencia(db: Banco, pedido: PedidoDeConferencia): Promise<DadosDaConferencia> {
  const fi = pedido.filtrosDosItens;
  const fm = pedido.filtrosDosMateriais;
  const filtros: string[] = [];

  // O local vale para os dois (vem do mesmo parâmetro).
  const locais = typeof fi.local === "number" ? await listarLocais(db) : [];
  if (fi.local === "sem") filtros.push("Local: Sem local definido");
  else if (fi.local) filtros.push(`Local: ${locais.find((l) => l.id === fi.local)?.caminho ?? "—"}`);

  let itens: DadosDaConferencia["itens"] = null;
  if (pedido.itens) {
    const categorias = [...new Set([...(fi.categoria ? [fi.categoria] : []), ...fi.categorias])];
    if (categorias.length) filtros.push(`Categorias: ${categorias.map((c) => NOME_DA_CATEGORIA[c].filtro).join(", ")}`);
    if (fi.tipo) {
      const [tipo] = await db.select({ nome: tiposDeItem.nome }).from(tiposDeItem).where(eq(tiposDeItem.id, fi.tipo));
      filtros.push(`Tipo: ${tipo?.nome ?? "—"}`);
      if (temFiltroDeCaracteristica(fi.caracteristicas)) filtros.push(...descreverFiltros((await caracteristicasDoTipo(db, fi.tipo)).map(simples), fi.caracteristicas));
    }
    filtros.push(fi.status ? `Status: ${NOME_DO_STATUS[fi.status]}` : "Sem os descartados");
    if (fi.condicao) filtros.push(`Condição: ${fi.condicao === "nenhuma" ? "Não informada" : NOME_DA_CONDICAO[fi.condicao]}`);
    if (fi.pessoa) {
      const [pessoa] = await db.select({ nome: colaboradores.nome }).from(colaboradores).where(eq(colaboradores.id, fi.pessoa));
      filtros.push(`Com: ${pessoa?.nome ?? "—"}`);
    }
    if (fi.busca) filtros.push(`Busca nos itens: “${fi.busca}”`);

    const lista = await todosOsItens(db, { ...fi, categoria: undefined, categorias });
    const porTipo = new Map<string, ItemComTipo[]>();
    for (const item of lista) porTipo.set(item.tipo.nome, [...(porTipo.get(item.tipo.nome) ?? []), item]);
    const categoriaDe = (nome: string) => CATEGORIAS.indexOf(porTipo.get(nome)![0].tipo.categoria);
    itens = {
      total: lista.length,
      porTipo: [...porTipo.keys()]
        .sort((a, b) => categoriaDe(a) - categoriaDe(b) || a.localeCompare(b, "pt-BR"))
        .map((tipo) => ({ tipo, itens: porTipo.get(tipo)! })),
    };
  }

  let materiais: DadosDaConferencia["materiais"] = null;
  if (pedido.materiais) {
    if (fm.grupos.length) filtros.push(`Grupos de material: ${fm.grupos.map((g) => NOME_DO_GRUPO[g]).join(", ")}`);
    if (fm.nome) filtros.push(`Material: ${fm.nome}`);
    if (temFiltroDeCaracteristica(fm.caracteristicas)) filtros.push(...descreverFiltros((await caracteristicasDoGrupo(db, fm.grupos[0])).map(simples), fm.caracteristicas));
    if (fm.condicao) filtros.push(`Condição dos materiais: ${fm.condicao === "nenhuma" ? "Não informada" : NOME_DA_CONDICAO[fm.condicao]}`);
    if (fm.compativel) filtros.push(`Compatível com: ${fm.compativel === SEM_VALOR ? "não informado" : fm.compativel}`);
    if (fm.busca) filtros.push(`Busca nos materiais: “${fm.busca}”`);
    const lista = (
      await listarMateriais(db, {
        busca: fm.busca,
        // Um grupo só vai direto para a consulta (as características dependem dele); vários, filtra depois.
        grupo: fm.grupos.length === 1 ? fm.grupos[0] : undefined,
        local: fm.local,
        condicao: fm.condicao,
        compativel: fm.compativel,
        nome: fm.nome,
        caracteristicas: fm.caracteristicas,
      })
    ).filter((m) => !fm.grupos.length || fm.grupos.includes(m.grupo));
    materiais = {
      total: lista.length,
      unidades: lista.reduce((s, m) => s + m.quantidade, 0),
      porGrupo: GRUPOS.map((grupo) => ({ grupo, materiais: lista.filter((m) => m.grupo === grupo) })).filter((g) => g.materiais.length),
    };
  }

  return { filtros, itens, materiais };
}
