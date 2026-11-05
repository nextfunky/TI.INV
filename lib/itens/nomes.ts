import type { Categoria } from "./valores";

/** O mínimo que as regras de nome precisam saber de um item. */
export type ItemParaNome = {
  hostname: string | null;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  tipo: { nome: string; categoria: Categoria };
};

function marcaEModelo(item: ItemParaNome): string {
  return [item.marca, item.modelo].filter(Boolean).join(" ");
}

/** O hostname só vale para computadores (num monitor, ele é ignorado). */
function hostnameDoItem(item: ItemParaNome): string | null {
  return item.tipo.categoria === "computador" && item.hostname ? item.hostname : null;
}

/** O nome do item nas listas: sempre "marca modelo"; sem os dois, o nome do tipo. */
export function tituloDoItem(item: ItemParaNome): string {
  return marcaEModelo(item) || item.tipo.nome;
}

/** A linha de baixo: o hostname (só computadores) e a série, quando existirem. "APT-ANA-CAD · Série CC7F973". */
export function subtituloDoItem(item: ItemParaNome): string {
  return [hostnameDoItem(item), item.numeroSerie ? `Série ${item.numeroSerie}` : null].filter(Boolean).join(" · ");
}

/** Com o tipo na frente: "Notebook Avell Lite New", "Monitor Dell P2422H". Sem marca e modelo: só o tipo. */
export function nomeCompletoDoItem(item: ItemParaNome): string {
  const mm = marcaEModelo(item);
  return mm ? `${item.tipo.nome} ${mm}` : item.tipo.nome;
}

/** Textos longos: "Notebook Avell Lite New (APT-ANA-CAD)" ou "Monitor Dell P2422H, série CN0ABC123". */
export function descricaoDoItem(item: ItemParaNome): string {
  const base = nomeCompletoDoItem(item);
  const hostname = hostnameDoItem(item);
  const comHostname = hostname ? `${base} (${hostname})` : base;
  return item.numeroSerie ? `${comHostname}, série ${item.numeroSerie}` : comHostname;
}
