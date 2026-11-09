import { SEM_VALOR } from "./filtros";
import type { Caracteristica, ValoresDasCaracteristicas } from "./valores";

/**
 * As regras das características que não dependem do banco: ler do formulário,
 * conferir os valores e escrever na tela. Rodam também no navegador.
 */

/** O nome dos campos no formulário: "car_12". */
export const PREFIXO_DO_CAMPO = "car_";
export const nomeDoCampo = (id: number) => `${PREFIXO_DO_CAMPO}${id}`;

/** Os valores digitados no formulário ({ "12": "Magenta" }), ainda sem conferir. */
export function lerValoresDoFormulario(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of dados.entries()) {
    if (chave.startsWith(PREFIXO_DO_CAMPO) && typeof valor === "string") valores[chave.slice(PREFIXO_DO_CAMPO.length)] = valor;
  }
  return valores;
}

/** Os mesmos valores com o nome dos campos ("car_12"), para devolver ao formulário. */
export function comNomesDoFormulario(valores: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(valores).map(([id, v]) => [`${PREFIXO_DO_CAMPO}${id}`, v]));
}

/**
 * Lê um número escrito do jeito brasileiro: "1,5" (vírgula decimal), "15.000"
 * (ponto de milhar) e também "1.5". Devolve null se não for um número.
 */
export function lerNumero(texto: string): number | null {
  let t = texto.trim().replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** "1.5" → "1,5"; "15000" → "15.000". */
export function formatarNumero(valor: string): string {
  const n = Number(valor);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) : valor;
}

/** O valor como vai no campo do formulário (número com vírgula). */
export function valorParaOCampo(c: Caracteristica, valor: string | undefined): string {
  if (!valor) return "";
  return c.tipo === "numero" ? formatarNumero(valor).replace(/\./g, "") : valor;
}

/**
 * Confere os valores contra as características (só as que existem para este
 * tipo ou grupo). Lista: precisa ser uma das opções. Número: precisa ser um
 * número. Texto: até 100 caracteres. Vazio não é erro (todas são opcionais).
 * Os erros vêm com o nome do campo do formulário ("car_12").
 */
export function conferirValores(
  caracteristicas: Caracteristica[],
  bruto: Record<string, string>,
): { valores: ValoresDasCaracteristicas; erros: Record<string, string> } {
  const valores: ValoresDasCaracteristicas = {};
  const erros: Record<string, string> = {};
  for (const c of caracteristicas) {
    const v = (bruto[String(c.id)] ?? "").trim();
    if (!v) continue;
    if (c.tipo === "lista") {
      const opcao = c.opcoes.find((o) => o.toLocaleLowerCase("pt-BR") === v.toLocaleLowerCase("pt-BR"));
      if (opcao) valores[c.id] = opcao;
      else erros[nomeDoCampo(c.id)] = `Escolha uma das opções: ${c.opcoes.join(", ")}.`;
    } else if (c.tipo === "numero") {
      const n = lerNumero(v);
      if (n === null || n < 0) erros[nomeDoCampo(c.id)] = "Use só números (ex.: 1,5).";
      else if (n > 1_000_000_000) erros[nomeDoCampo(c.id)] = "Número grande demais.";
      else valores[c.id] = String(n);
    } else if (v.length > 100) {
      erros[nomeDoCampo(c.id)] = "Use no máximo 100 caracteres.";
    } else {
      valores[c.id] = v;
    }
  }
  return { valores, erros };
}

/** O valor para ler: "1,5 m", "15.000 páginas", "Magenta". */
export function valorFormatado(c: Caracteristica, valor: string): string {
  if (c.tipo !== "numero") return valor;
  return c.unidade ? `${formatarNumero(valor)} ${c.unidade}` : formatarNumero(valor);
}

/**
 * As etiquetas da linha da lista, na ordem das características: "Magenta",
 * "1,5 m". Quando o valor sozinho não diz o que é (texto, número sem unidade),
 * vai com o nome: "Ramal: 2034".
 */
export function etiquetasDasCaracteristicas(caracteristicas: Caracteristica[], valores: ValoresDasCaracteristicas | null | undefined): string[] {
  if (!valores) return [];
  return caracteristicas
    .filter((c) => valores[c.id])
    .map((c) => {
      const v = valorFormatado(c, valores[c.id]);
      return c.tipo === "lista" || (c.tipo === "numero" && c.unidade) ? v : `${c.nome}: ${v}`;
    });
}

/** A ordem dos valores de uma característica: as opções da lista na ordem delas, números em ordem crescente, o resto em ordem alfabética. */
export function compararValores(c: Caracteristica, a: string, b: string): number {
  if (c.tipo === "lista") {
    const ia = c.opcoes.indexOf(a);
    const ib = c.opcoes.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b, "pt-BR");
  }
  if (c.tipo === "numero") return Number(a) - Number(b);
  return a.localeCompare(b, "pt-BR");
}

/** Os filtros por característica em frases curtas: "Cor: Magenta", "Receptor USB: não informado". */
export function descreverFiltros(caracteristicas: Caracteristica[], filtros: Record<number, string> | undefined): string[] {
  return caracteristicas
    .filter((c) => filtros?.[c.id])
    .map((c) => {
      const v = filtros![c.id];
      return `${c.nome}: ${v === SEM_VALOR ? "não informado" : valorFormatado(c, v)}`;
    });
}
