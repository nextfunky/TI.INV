/** O que uma ação de formulário devolve para a tela quando algo precisa ser corrigido. */
export type EstadoDoFormulario = {
  /** Erro de cada campo: { usuario: "Informe o usuário." } */
  erros?: Record<string, string>;
  /** Erro que vale para o formulário todo, mostrado na faixa vermelha. */
  erroGeral?: string;
  /** Valores para manter preenchidos (nunca as senhas). */
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoDoFormulario = {};
