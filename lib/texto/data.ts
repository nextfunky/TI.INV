export const FUSO = "America/Sao_Paulo";

function horaEmSaoPaulo(agora: Date): number {
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "numeric",
    hourCycle: "h23",
  }).format(agora);
  return Number(hora);
}

/** "Bom dia" antes das 12h, "Boa tarde" antes das 18h e "Boa noite" depois. */
export function saudacao(agora: Date): string {
  const hora = horaEmSaoPaulo(agora);
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/** "Quinta-feira, 5 de novembro": dia da semana com inicial maiúscula e mês em minúscula. */
export function dataPorExtenso(agora: Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(agora);

  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  const diaDaSemana = parte("weekday");
  return `${diaDaSemana.charAt(0).toUpperCase()}${diaDaSemana.slice(1)}, ${parte("day")} de ${parte("month")}`;
}

/** A data de hoje em São Paulo, no formato do banco: "2026-11-05". */
export function hojeEmSaoPaulo(agora: Date): string {
  // O formato canadense é exatamente ano-mês-dia.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Soma dias a uma data "aaaa-mm-dd". */
export function somarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Quantos dias de `de` até `ate` (datas "aaaa-mm-dd"). Negativo se `ate` já passou. */
export function diasEntre(de: string, ate: string): number {
  const utc = (d: string) => {
    const [ano, mes, dia] = d.split("-").map(Number);
    return Date.UTC(ano, mes - 1, dia);
  };
  return Math.round((utc(ate) - utc(de)) / 86_400_000);
}

/** "2027-03-15" → "15/03/2027". */
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Confere se "aaaa-mm-dd" é uma data que existe no calendário. */
export function dataValida(dataIso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return false;
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "agora há pouco", "há 5 minutos", "há 2 horas", "ontem", "há 3 dias", "há 2 meses". */
export function tempoDesde(momento: Date, agora: Date): string {
  const segundos = Math.max(0, Math.round((agora.getTime() - momento.getTime()) / 1000));
  if (segundos < 60) return "agora há pouco";
  if (segundos < 3600) return relativo.format(-Math.floor(segundos / 60), "minute");
  if (segundos < 86_400) return relativo.format(-Math.floor(segundos / 3600), "hour");
  const dias = Math.max(1, diasEntre(hojeEmSaoPaulo(momento), hojeEmSaoPaulo(agora)));
  if (dias < 30) return relativo.format(-dias, "day");
  if (dias < 365) return relativo.format(-Math.floor(dias / 30), "month");
  return relativo.format(-Math.floor(dias / 365), "year");
}

/** "05/11/2026 14:30", no horário de São Paulo. */
export function formatarDataHora(momento: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(momento)
    .replace(",", "");
}
