/** Os filtros da tela Histórico e o endereço que eles formam (sem banco: roda também no navegador). */
import { EVENTOS, type Evento } from "./valores";

export type FiltrosDoHistorico = { busca?: string; evento?: Evento; item?: string; pagina: number };

export const REGISTROS_POR_PAGINA = 50;

export function lerFiltrosDoHistorico(p: Record<string, string | string[] | undefined>): FiltrosDoHistorico {
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const pagina = Number(texto(p.pagina));
  return {
    busca: texto(p.q).slice(0, 120) || undefined,
    evento: EVENTOS.find((e) => e === p.evento),
    item: /^[A-Za-z]{2,5}\d{4,}$/.test(texto(p.item)) ? texto(p.item).toUpperCase() : undefined,
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

export function enderecoDoHistorico(f: Partial<FiltrosDoHistorico>): string {
  const p = new URLSearchParams();
  if (f.busca) p.set("q", f.busca);
  if (f.evento) p.set("evento", f.evento);
  if (f.item) p.set("item", f.item);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  const c = p.toString();
  return c ? `/historico?${c}` : "/historico";
}
