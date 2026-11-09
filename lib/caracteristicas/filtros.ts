/**
 * Os filtros por característica no endereço: "?c12=Magenta&c13=nenhum"
 * ("nenhum" = sem valor informado). Sem banco: roda também no navegador.
 */

export const SEM_VALOR = "nenhum";

export type FiltrosDeCaracteristicas = Record<number, string>;

/** Um filtro por característica na tela: as escolhas (o valor guardado e o texto mostrado). */
export type FiltroDeCaracteristicaNaTela = { id: number; nome: string; opcoes: Array<{ valor: string; rotulo: string }> };

/** Lê "c12=Magenta" (ou "mc12=Magenta", com outro prefixo). */
export function lerFiltrosDeCaracteristicas(
  parametros: Record<string, string | string[] | undefined>,
  prefixo = "c",
): FiltrosDeCaracteristicas {
  const filtros: FiltrosDeCaracteristicas = {};
  const padrao = new RegExp(`^${prefixo}(\\d{1,9})$`);
  for (const [chave, valor] of Object.entries(parametros)) {
    const achou = padrao.exec(chave);
    if (achou && typeof valor === "string" && valor.trim() && valor.length <= 100) filtros[Number(achou[1])] = valor.trim();
  }
  return filtros;
}

export function escreverFiltrosDeCaracteristicas(p: URLSearchParams, filtros: FiltrosDeCaracteristicas | undefined, prefixo = "c") {
  for (const [id, valor] of Object.entries(filtros ?? {}).sort(([a], [b]) => Number(a) - Number(b))) {
    if (valor) p.set(`${prefixo}${id}`, valor);
  }
}

export function temFiltroDeCaracteristica(filtros: FiltrosDeCaracteristicas | undefined): boolean {
  return Object.values(filtros ?? {}).some(Boolean);
}
