/** Os eventos do histórico dos itens e como aparecem na tela. */
export const EVENTOS = [
  "cadastro",
  "entrega",
  "troca",
  "devolucao",
  "mudanca_de_local",
  "mudou_com_a_pessoa",
  "exclusao",
] as const;
export type Evento = (typeof EVENTOS)[number];

export const NOME_DO_EVENTO: Record<Evento, string> = {
  cadastro: "Cadastro",
  entrega: "Entrega",
  troca: "Troca de pessoa",
  devolucao: "Devolução",
  mudanca_de_local: "Mudança de local",
  mudou_com_a_pessoa: "Mudou com a pessoa",
  exclusao: "Exclusão",
};
