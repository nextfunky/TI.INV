/** "Patch Cord · Cat 5 Cinza 1 m": o nome com a marca/modelo, para não confundir materiais parecidos. */
export function nomeDoMaterial(material: { nome: string; marcaModelo: string | null }): string {
  return material.marcaModelo ? `${material.nome} · ${material.marcaModelo}` : material.nome;
}
