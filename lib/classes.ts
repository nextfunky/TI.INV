/** Junta classes CSS, ignorando as vazias: cx("a", condicao && "b") */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
