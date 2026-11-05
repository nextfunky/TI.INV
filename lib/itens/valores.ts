/** Os valores fixos do inventário e como cada um aparece na tela. */

/** As categorias dos tipos, na ordem em que aparecem. Só "computador" tem os campos de computador. */
export const CATEGORIAS = ["computador", "periferico", "movel", "impressao", "telefonia", "rede", "seguranca", "outro"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

/**
 * Como cada categoria aparece: no singular (formulário de tipo), no filtro e
 * nas contagens ("18 computadores", "4 de impressão").
 */
export const NOME_DA_CATEGORIA: Record<Categoria, { singular: string; filtro: string; contagem: [string, string] }> = {
  computador: { singular: "Computador", filtro: "Computadores", contagem: ["computador", "computadores"] },
  periferico: { singular: "Periférico", filtro: "Periféricos", contagem: ["periférico", "periféricos"] },
  movel: { singular: "Dispositivo móvel", filtro: "Dispositivos móveis", contagem: ["dispositivo móvel", "dispositivos móveis"] },
  impressao: { singular: "Impressão", filtro: "Impressão", contagem: ["de impressão", "de impressão"] },
  telefonia: { singular: "Telefonia", filtro: "Telefonia", contagem: ["de telefonia", "de telefonia"] },
  rede: { singular: "Rede e infraestrutura", filtro: "Rede e infraestrutura", contagem: ["de rede e infraestrutura", "de rede e infraestrutura"] },
  seguranca: { singular: "Segurança", filtro: "Segurança", contagem: ["de segurança", "de segurança"] },
  outro: { singular: "Outro", filtro: "Outros", contagem: ["outro", "outros"] },
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

/** Estado de conservação do item (opcional). */
export const CONDICOES = ["novo", "bom", "usado", "regular", "defeituoso"] as const;
export type Condicao = (typeof CONDICOES)[number];

export const NOME_DA_CONDICAO: Record<Condicao, string> = {
  novo: "Novo",
  bom: "Bom",
  usado: "Usado",
  regular: "Regular",
  defeituoso: "Defeituoso",
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
