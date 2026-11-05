/** "1 item", "2 itens", "0 itens". */
export function plural(quantidade: number, singular: string, pluralDaPalavra: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : pluralDaPalavra}`;
}

/** Junta partes com " · ", ignorando as vazias. */
export function juntar(...partes: Array<string | null | undefined | false>): string {
  return partes.filter(Boolean).join(" · ");
}
