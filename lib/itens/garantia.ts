import { diasEntre } from "@/lib/texto/data";

const futuro = new Intl.RelativeTimeFormat("pt-BR", { numeric: "always" });

export type SituacaoDaGarantia = { texto: string; vencida: boolean } | null;

/**
 * A situação da garantia, ao lado da data no detalhe do item:
 * "vencida", "vence hoje" ou "em 4 meses" (na maior unidade).
 */
export function situacaoDaGarantia(garantiaAte: string | null, hoje: string): SituacaoDaGarantia {
  if (!garantiaAte) return null;
  const dias = diasEntre(hoje, garantiaAte);
  if (dias < 0) return { texto: "vencida", vencida: true };
  if (dias === 0) return { texto: "vence hoje", vencida: false };
  if (dias >= 365) return { texto: futuro.format(Math.floor(dias / 365), "year"), vencida: false };
  if (dias >= 30) return { texto: futuro.format(Math.floor(dias / 30), "month"), vencida: false };
  if (dias >= 7) return { texto: futuro.format(Math.floor(dias / 7), "week"), vencida: false };
  return { texto: futuro.format(dias, "day"), vencida: false };
}

/** Título do aviso no Início: "Garantia vence hoje" ou "Garantia vence em 45 dias". */
export function avisoDeGarantia(garantiaAte: string, hoje: string): string {
  const dias = diasEntre(hoje, garantiaAte);
  if (dias <= 0) return "Garantia vence hoje";
  return `Garantia vence em ${dias === 1 ? "1 dia" : `${dias} dias`}`;
}
