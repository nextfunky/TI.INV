/** Os valores fixos do inventário e como cada um aparece na tela. */

export const CATEGORIAS = ["computador", "periferico", "outro"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const NOME_DA_CATEGORIA: Record<Categoria, { singular: string; plural: string; filtro: string }> = {
  computador: { singular: "Computador", plural: "computadores", filtro: "Computadores" },
  periferico: { singular: "Periférico", plural: "periféricos", filtro: "Periféricos" },
  outro: { singular: "Outro", plural: "outros", filtro: "Outros" },
};

/** Ordem dos status: do mais usado ao menos usado. */
export const STATUS = ["em_uso", "em_estoque", "em_manutencao", "descartado"] as const;
export type Status = (typeof STATUS)[number];

export const NOME_DO_STATUS: Record<Status, string> = {
  em_uso: "Em uso",
  em_estoque: "Em estoque",
  em_manutencao: "Em manutenção",
  descartado: "Descartado",
};

/** Classe da cor do ponto de cada status (definida no tema). */
export const COR_DO_STATUS: Record<Status, string> = {
  em_uso: "bg-uso",
  em_estoque: "bg-estoque",
  em_manutencao: "bg-manutencao",
  descartado: "bg-descartado",
};

export const ITENS_POR_PAGINA = 50;
export const MAXIMO_NA_BUSCA = 8;
export const DIAS_PARA_AVISAR_GARANTIA = 60;
