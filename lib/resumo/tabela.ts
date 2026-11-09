/**
 * O Resumo: uma tabela cruzada (linhas × colunas) para conferir o estoque.
 * Ex.: toners por impressora e condição (linhas) × cor (colunas), com as
 * quantidades. Sem banco: recebe a lista já filtrada e as "dimensões".
 */

/** Um valor de uma dimensão: a chave (null = sem valor), o texto e o filtro que leva à lista. */
export type ValorDaDimensao = { chave: string | null; rotulo: string };

export type Dimensao<T> = {
  id: string;
  rotulo: string;
  valor: (t: T) => ValorDaDimensao;
  /** A ordem dos valores (os sem valor vão sempre por último). */
  comparar: (a: string, b: string) => number;
  /** Os parâmetros do endereço que filtram a lista por este valor. */
  filtro: (chave: string | null) => Record<string, string>;
};

export type Eixo = { chave: string | null; rotulo: string; filtro: Record<string, string> };

export type Resumo = {
  colunas: Eixo[];
  linhas: Array<{ eixos: Eixo[]; celulas: number[]; total: number }>;
  totaisDasColunas: number[];
  total: number;
};

const SEM = "\u0000sem";

function ordenarChaves<T>(d: Dimensao<T>, chaves: Array<string | null>): Array<string | null> {
  return [...chaves].sort((a, b) => (a === null ? 1 : b === null ? -1 : d.comparar(a, b)));
}

/**
 * Monta a tabela: cada linha é uma combinação dos valores das dimensões de
 * linha (até duas), cada coluna um valor da dimensão de coluna. A célula soma
 * `quanto` (a quantidade do material, ou 1 por item).
 */
export function montarResumo<T>(dados: T[], dimensoesDasLinhas: Dimensao<T>[], dimensaoDaColuna: Dimensao<T> | null, quanto: (t: T) => number): Resumo {
  const eixo = (d: Dimensao<T>, v: ValorDaDimensao): Eixo => ({ chave: v.chave, rotulo: v.rotulo, filtro: d.filtro(v.chave) });

  // As colunas, na ordem da dimensão.
  const rotulosDasColunas = new Map<string, Eixo>();
  if (dimensaoDaColuna) for (const t of dados) {
    const v = dimensaoDaColuna.valor(t);
    rotulosDasColunas.set(v.chave ?? SEM, eixo(dimensaoDaColuna, v));
  }
  const colunas = dimensaoDaColuna
    ? ordenarChaves(dimensaoDaColuna, [...rotulosDasColunas.values()].map((e) => e.chave)).map((c) => rotulosDasColunas.get(c ?? SEM)!)
    : [];
  const posicaoDaColuna = new Map(colunas.map((c, i) => [c.chave ?? SEM, i]));

  // As linhas: cada combinação dos valores das dimensões de linha.
  const linhas = new Map<string, { eixos: Eixo[]; celulas: number[]; total: number }>();
  for (const t of dados) {
    const valores = dimensoesDasLinhas.map((d) => d.valor(t));
    const chave = valores.map((v) => v.chave ?? SEM).join("\u0001");
    let linha = linhas.get(chave);
    if (!linha) {
      linha = { eixos: valores.map((v, i) => eixo(dimensoesDasLinhas[i], v)), celulas: colunas.map(() => 0), total: 0 };
      linhas.set(chave, linha);
    }
    const q = quanto(t);
    linha.total += q;
    if (dimensaoDaColuna) linha.celulas[posicaoDaColuna.get(dimensaoDaColuna.valor(t).chave ?? SEM)!] += q;
  }

  const ordenadas = [...linhas.values()].sort((a, b) => {
    for (let i = 0; i < dimensoesDasLinhas.length; i++) {
      const ca = a.eixos[i].chave;
      const cb = b.eixos[i].chave;
      if (ca === cb) continue;
      if (ca === null) return 1;
      if (cb === null) return -1;
      const r = dimensoesDasLinhas[i].comparar(ca, cb);
      if (r) return r;
    }
    return 0;
  });

  const totaisDasColunas = colunas.map((_, i) => ordenadas.reduce((s, l) => s + l.celulas[i], 0));
  return { colunas, linhas: ordenadas, totaisDasColunas, total: ordenadas.reduce((s, l) => s + l.total, 0) };
}

/** Lê "linhas=compativel,condicao&colunas=c12", ficando só com as dimensões que existem. */
export function lerEixos(
  parametros: Record<string, string | string[] | undefined>,
  disponiveis: string[],
  padrao: { linhas: string[]; colunas: string | null },
): { linhas: string[]; colunas: string | null } {
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const linhas = texto(parametros.linhas)
    .split(",")
    .filter((d) => disponiveis.includes(d))
    .slice(0, 2);
  const colunas = texto(parametros.colunas);
  if (!linhas.length) return padrao;
  return { linhas: [...new Set(linhas)], colunas: colunas === "nenhuma" ? null : disponiveis.includes(colunas) && !linhas.includes(colunas) ? colunas : padrao.colunas && !linhas.includes(padrao.colunas) ? padrao.colunas : null };
}

/** Os parâmetros que mantêm o Resumo aberto (a visão e o cruzamento escolhido) ao mudar um filtro. */
export function parametrosDoResumo(parametros: Record<string, string | string[] | undefined>): Record<string, string> {
  if (parametros.visao !== "resumo") return {};
  const extras: Record<string, string> = { visao: "resumo" };
  if (typeof parametros.linhas === "string") extras.linhas = parametros.linhas;
  if (typeof parametros.colunas === "string") extras.colunas = parametros.colunas;
  return extras;
}

/** O endereço com mais alguns parâmetros (os do Resumo, por exemplo). */
export function comOsParametros(endereco: string, extras: Record<string, string>): string {
  const [caminho, consulta = ""] = endereco.split("?");
  const p = new URLSearchParams(consulta);
  for (const [chave, valor] of Object.entries(extras)) p.set(chave, valor);
  const texto = p.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

/** A dimensão "Local", comparando pelo caminho (Matriz › Financeiro), não pelo id. */
export function dimensaoDoLocal<T>(local: (t: T) => { id: number; caminho: string } | null): Dimensao<T> {
  const caminhos = new Map<string, string>();
  return {
    id: "local",
    rotulo: "Local",
    valor: (t) => {
      const l = local(t);
      if (!l) return { chave: null, rotulo: "Sem local definido" };
      caminhos.set(String(l.id), l.caminho);
      return { chave: String(l.id), rotulo: l.caminho };
    },
    comparar: (a, b) => (caminhos.get(a) ?? a).localeCompare(caminhos.get(b) ?? b, "pt-BR"),
    filtro: (c) => ({ local: c ?? "sem" }),
  };
}
