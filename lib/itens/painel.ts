/**
 * O painel lateral de detalhes fica no endereço da lista: "/inventario?item=CAM0001".
 * Assim recarregar a página ou voltar no navegador mantém o painel como estava.
 */

/** O código pedido no endereço (?item=...), ou null. */
export function itemDoEndereco(parametros: Record<string, string | string[] | undefined>): string | null {
  const valor = parametros.item;
  return typeof valor === "string" && /^[A-Za-z0-9-]{1,40}$/.test(valor) ? valor.toUpperCase() : null;
}

/** O mesmo endereço com um parâmetro trocado (ou tirado, com null). */
export function comParametro(endereco: string, chave: string, valor: string | null): string {
  const [caminho, consulta = ""] = endereco.split("?");
  const p = new URLSearchParams(consulta);
  if (valor) p.set(chave, valor);
  else p.delete(chave);
  const texto = p.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

/** O mesmo endereço com o painel aberto no item (ou fechado, com null). */
export function comItem(endereco: string, codigo: string | null): string {
  return comParametro(endereco, "item", codigo);
}

/** Só aceita voltar para uma tela do próprio sistema ("/inventario?..."), nunca para outro site. */
export function enderecoInterno(endereco: unknown): string | null {
  return typeof endereco === "string" && endereco.startsWith("/") && !endereco.startsWith("//") && !endereco.includes("\\")
    ? endereco
    : null;
}
