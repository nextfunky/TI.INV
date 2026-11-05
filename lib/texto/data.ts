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
