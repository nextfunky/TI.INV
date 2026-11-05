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

function usaHostname(item: ItemParaNome): boolean {
  return item.tipo.categoria === "computador" && Boolean(item.hostname);
}

/** Computador com hostname: o hostname. Senão: "marca modelo". Sem os dois: o nome do tipo. */
export function tituloDoItem(item: ItemParaNome): string {
  if (usaHostname(item)) return item.hostname!;
  return marcaEModelo(item) || item.tipo.nome;
}

/** Computador com hostname e marca/modelo: "marca modelo". Senão, com série: "Série X". Senão: vazio. */
export function subtituloDoItem(item: ItemParaNome): string {
  const mm = marcaEModelo(item);
  if (usaHostname(item) && mm) return mm;
  if (item.numeroSerie) return `Série ${item.numeroSerie}`;
  return "";
}

/** Para computador, ou quando o título já é o nome do tipo: o título. Para os outros: "tipo título". */
export function nomeCompletoDoItem(item: ItemParaNome): string {
  const titulo = tituloDoItem(item);
  if (item.tipo.categoria === "computador" || titulo === item.tipo.nome) return titulo;
  return `${item.tipo.nome} ${titulo}`;
}

/** Textos longos: "FIN-PC-03 (Dell OptiPlex 7090)" ou "Monitor Dell P2422H, série CN0ABC123". */
export function descricaoDoItem(item: ItemParaNome): string {
  const mm = marcaEModelo(item);
  if (usaHostname(item)) return mm ? `${item.hostname} (${mm})` : item.hostname!;
  const base = [item.tipo.nome, mm].filter(Boolean).join(" ");
  return item.numeroSerie ? `${base}, série ${item.numeroSerie}` : base;
}
