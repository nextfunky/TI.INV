/** Os valores fixos dos materiais (o que é controlado por quantidade) e como aparecem na tela. */

/** Os grupos, na ordem em que aparecem nas listas. */
export const GRUPOS = [
  "cabos",
  "conectores_e_adaptadores",
  "fontes_e_carregadores",
  "rede_e_rack",
  "pecas_de_computador",
  "impressao",
  "perifericos",
  "seguranca",
  "outros",
] as const;
export type Grupo = (typeof GRUPOS)[number];

export const NOME_DO_GRUPO: Record<Grupo, string> = {
  cabos: "Cabos",
  conectores_e_adaptadores: "Conectores e adaptadores",
  fontes_e_carregadores: "Fontes e carregadores",
  rede_e_rack: "Rede e rack",
  pecas_de_computador: "Peças de computador",
  impressao: "Impressão",
  perifericos: "Periféricos",
  seguranca: "Segurança",
  outros: "Outros",
};

/** Entrada (chegou mais), saída (saiu do estoque) e ajuste de contagem. */
export const TIPOS_DE_MOVIMENTO = ["entrada", "saida", "ajuste"] as const;
export type TipoDeMovimento = (typeof TIPOS_DE_MOVIMENTO)[number];

export const NOME_DO_MOVIMENTO: Record<TipoDeMovimento, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste de contagem",
};

/** O maior número aceito numa quantidade. */
export const QUANTIDADE_MAXIMA = 100_000;
