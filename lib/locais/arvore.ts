/**
 * A árvore de locais, sem banco: montar caminhos, achar os locais de dentro e
 * impedir ciclos. Roda no servidor e nos testes.
 */

export const SEPARADOR = " › ";

export type NoDoLocal = { id: number; nome: string; paiId: number | null };

/** "Filial 04 › 2º andar › Financeiro" para cada local. */
export function montarCaminhos(locais: NoDoLocal[]): Map<number, string> {
  const porId = new Map(locais.map((l) => [l.id, l]));
  const caminhos = new Map<number, string>();

  function caminhoDe(id: number, visitados: Set<number>): string {
    const pronto = caminhos.get(id);
    if (pronto !== undefined) return pronto;
    const local = porId.get(id);
    if (!local) return "";
    // Proteção extra: um ciclo (que o sistema não deixa criar) não trava a tela.
    if (local.paiId === null || visitados.has(local.paiId) || !porId.has(local.paiId)) {
      caminhos.set(id, local.nome);
      return local.nome;
    }
    visitados.add(id);
    const caminho = `${caminhoDe(local.paiId, visitados)}${SEPARADOR}${local.nome}`;
    caminhos.set(id, caminho);
    return caminho;
  }

  for (const l of locais) caminhoDe(l.id, new Set());
  return caminhos;
}

/** O nível na árvore: 0 = local principal. */
export function nivelDoCaminho(caminho: string): number {
  return caminho.split(SEPARADOR).length - 1;
}

/** "Filial 04 › 2º andar › Financeiro" → "Filial 04 › 2º andar". */
export function caminhoDeCima(caminho: string): string {
  return caminho.split(SEPARADOR).slice(0, -1).join(SEPARADOR);
}

/** O próprio local e todos os que estão dentro dele, em qualquer nível. */
export function comOsDeDentro(locais: NoDoLocal[], id: number): number[] {
  const filhos = new Map<number, number[]>();
  for (const l of locais) {
    if (l.paiId === null) continue;
    filhos.set(l.paiId, [...(filhos.get(l.paiId) ?? []), l.id]);
  }
  const resultado: number[] = [];
  const fila = [id];
  const vistos = new Set<number>();
  while (fila.length) {
    const atual = fila.shift()!;
    if (vistos.has(atual)) continue;
    vistos.add(atual);
    resultado.push(atual);
    fila.push(...(filhos.get(atual) ?? []));
  }
  return resultado;
}

/** Um local não pode ficar dentro dele mesmo nem dentro de um local que está dentro dele. */
export function podeFicarDentro(locais: NoDoLocal[], id: number, novoPaiId: number | null): boolean {
  if (novoPaiId === null) return true;
  return !comOsDeDentro(locais, id).includes(novoPaiId);
}

/** Ordem da tela: alfabética pelo caminho, o que já mostra a árvore. */
export function compararCaminhos(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
}
