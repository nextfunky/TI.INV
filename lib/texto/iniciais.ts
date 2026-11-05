/**
 * Iniciais para o avatar: a primeira letra do primeiro e do último nome.
 * "João Lima" → "JL"; "Ana" → "A"; "pedro.martins" → "PM".
 */
export function iniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (partes.length === 0) return "?";

  const primeira = partes[0].charAt(0);
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : "";
  return (primeira + ultima).toLocaleUpperCase("pt-BR");
}
