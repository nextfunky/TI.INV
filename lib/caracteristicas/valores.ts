/**
 * As características: campos próprios de cada tipo de item e de cada grupo de
 * material (a cor do toner, o comprimento do patch cord, o receptor do kit…).
 */

/** Lista de opções (escolhe uma), número (com unidade) ou texto livre. */
export const TIPOS_DE_CARACTERISTICA = ["lista", "numero", "texto"] as const;
export type TipoDeCaracteristica = (typeof TIPOS_DE_CARACTERISTICA)[number];

export const NOME_DO_TIPO_DE_CARACTERISTICA: Record<TipoDeCaracteristica, string> = {
  lista: "Lista de opções",
  numero: "Número",
  texto: "Texto livre",
};

/** Os valores ficam guardados no item (ou material) assim: { "12": "Magenta", "13": "1.5" }. A chave é o id da característica. */
export type ValoresDasCaracteristicas = Record<string, string>;

/** O que as telas precisam saber de uma característica. */
export type Caracteristica = {
  id: number;
  nome: string;
  tipo: TipoDeCaracteristica;
  opcoes: string[];
  unidade: string | null;
};

export const OPCOES_NO_MAXIMO = 40;
