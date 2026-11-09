import type { DadosDoItem } from "@/lib/itens/regras";
import { regrasDoItem } from "@/lib/itens/regras";
import { CONDICOES, NOME_DA_CONDICAO, NOME_DO_STATUS, STATUS } from "@/lib/itens/valores";
import { SEPARADOR } from "@/lib/locais/arvore";
import { regrasDoNovoMaterial, type DadosDoMaterial } from "@/lib/materiais/regras";
import { GRUPOS, NOME_DO_GRUPO } from "@/lib/materiais/valores";
import { dataValida } from "@/lib/texto/data";

/**
 * A leitura da planilha de importação, sem banco: confere as colunas e cada
 * linha, e diz o que precisa ser corrigido (aba, linha e o quê).
 * Os nomes de tipo, local e pessoa são conferidos depois, com o banco.
 */

export const ABA_DOS_ITENS = "Itens";
export const ABA_DOS_MATERIAIS = "Materiais";

/** As colunas de cada aba, na ordem do modelo. */
export const COLUNAS_DOS_ITENS = [
  "Tipo",
  "Marca",
  "Modelo",
  "Nº de série",
  "Status",
  "Condição",
  "Local",
  "Usuário",
  "Hostname",
  "Processador",
  "Memória RAM",
  "Armazenamento",
  "Sistema operacional",
  "Data de compra",
  "Garantia até",
  "Observações",
] as const;

export const COLUNAS_DOS_MATERIAIS = [
  "Nome",
  "Marca / modelo",
  "Compatível com",
  "Grupo",
  "Local",
  "Condição",
  "Quantidade",
  "Observações",
] as const;

/** O máximo de linhas numa planilha (somando as duas abas). */
export const LINHAS_NO_MAXIMO = 5000;

export type Celula = string | number | boolean | Date | null | undefined;
export type AbaLida = { nome: string; linhas: Celula[][] };

export type ErroDaPlanilha = { aba: string; linha?: number; mensagem: string };

/**
 * As colunas a mais (fora as do modelo), com o que foi escrito: { "Cor": "Magenta" }.
 * Elas são as características do tipo ou do grupo, conferidas depois, com o banco.
 */
export type ColunasExtras = Record<string, string>;

export type LinhaDeItem = {
  linha: number;
  tipo: string;
  local: string;
  usuario: string;
  dados: Omit<DadosDoItem, "tipoId" | "usuarioId" | "localId">;
  caracteristicas: ColunasExtras;
};

export type LinhaDeMaterial = {
  linha: number;
  local: string;
  dados: Omit<DadosDoMaterial, "localId"> & { quantidade: number };
  caracteristicas: ColunasExtras;
};

export type PlanilhaLida = {
  itens: LinhaDeItem[];
  materiais: LinhaDeMaterial[];
  erros: ErroDaPlanilha[];
  /** Os nomes das colunas a mais de cada aba (para avisar das que não servem para nada). */
  colunasExtras: { itens: string[]; materiais: string[] };
};

/** Sem acentos, sem símbolos, minúsculas: "Nº de série" → "ndeserie". */
function chave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Sem acentos e com os espaços arrumados, para comparar nomes ("em manutencao" = "Em manutenção"). */
export function comparavel(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

/** Outros jeitos comuns de escrever o nome de uma coluna. */
const APELIDOS: Record<string, string> = {
  numerodeserie: "Nº de série",
  ndeserie: "Nº de série",
  serie: "Nº de série",
  numeroserie: "Nº de série",
  ram: "Memória RAM",
  memoria: "Memória RAM",
  so: "Sistema operacional",
  garantia: "Garantia até",
  observacao: "Observações",
  obs: "Observações",
  marcamodelo: "Marca / modelo",
  compativel: "Compatível com",
  compativelcom: "Compatível com",
  impressora: "Compatível com",
  qtd: "Quantidade",
  quantidadedisponivel: "Quantidade",
};

function nomeDaColuna(cabecalho: Celula, colunas: readonly string[]): string | null {
  if (typeof cabecalho !== "string") return null;
  const k = chave(cabecalho);
  return colunas.find((c) => chave(c) === k) ?? (APELIDOS[k] && colunas.includes(APELIDOS[k]) ? APELIDOS[k] : null);
}

function dataIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** O texto da célula, sem espaços nas pontas. */
function texto(valor: Celula): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return dataIso(valor);
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor).trim();
}

/** Datas: célula de data do Excel, "dd/mm/aaaa" ou "aaaa-mm-dd". Devolve "aaaa-mm-dd" ou null se não der. */
function data(valor: Celula): string | null | "invalida" {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? "invalida" : dataIso(valor);
  const t = texto(valor);
  if (!t) return null;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const iso = br ? `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}` : t;
  return dataValida(iso) ? iso : "invalida";
}

function porNome<T extends string>(valores: readonly T[], nomes: Record<T, string>, digitado: string): T | null {
  const k = comparavel(digitado);
  return valores.find((v) => comparavel(nomes[v]) === k) ?? null;
}

const lista = (nomes: string[], e = "ou") =>
  nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} ${e} ${nomes.at(-1)}`;

/** Confere o formato do local: "Unidade" ou "Unidade › Departamento" (também aceita ">"). */
export function partesDoLocal(local: string): string[] | null {
  if (!local) return [];
  const partes = local.split(/\s*[›>]\s*/).map((p) => p.trim().replace(/\s+/g, " "));
  if (partes.length > 2 || partes.some((p) => !p || p.length > 80)) return null;
  return partes;
}

export function caminhoDoLocal(partes: string[]): string {
  return partes.join(SEPARADOR);
}

const ROTULO_DO_CAMPO: Record<string, string> = {
  marca: "Marca",
  modelo: "Modelo",
  numeroSerie: "Nº de série",
  hostname: "Hostname",
  processador: "Processador",
  memoriaRam: "Memória RAM",
  armazenamento: "Armazenamento",
  sistemaOperacional: "Sistema operacional",
  dataCompra: "Data de compra",
  garantiaAte: "Garantia até",
  observacoes: "Observações",
  nome: "Nome",
  marcaModelo: "Marca / modelo",
  compativelCom: "Compatível com",
  quantidade: "Quantidade",
};

/**
 * Separa o cabeçalho (a primeira linha com algo escrito) das linhas de dados.
 * As colunas que não são do modelo ficam como "extras" (as características).
 */
function lerAba(aba: AbaLida, colunas: readonly string[], obrigatorias: string[], erros: ErroDaPlanilha[]) {
  const vazia = { linhas: [] as Array<{ numero: number; valor: (coluna: string) => Celula; extras: ColunasExtras }>, extras: [] as string[] };
  const inicio = aba.linhas.findIndex((l) => l.some((c) => texto(c) !== ""));
  if (inicio < 0) return vazia;
  const indice = new Map<string, number>();
  const extras = new Map<string, number>();
  aba.linhas[inicio].forEach((c, i) => {
    const nome = nomeDaColuna(c, colunas);
    if (nome && !indice.has(nome)) indice.set(nome, i);
    else if (!nome && texto(c)) {
      const t = texto(c).replace(/\s+/g, " ").slice(0, 60);
      if (![...extras.keys()].some((e) => comparavel(e) === comparavel(t))) extras.set(t, i);
    }
  });
  const faltando = obrigatorias.filter((c) => !indice.has(c));
  if (faltando.length) {
    erros.push({
      aba: aba.nome,
      linha: inicio + 1,
      mensagem: `${faltando.length === 1 ? "Falta a coluna" : "Faltam as colunas"} ${lista(faltando.map((c) => `“${c}”`), "e")} no cabeçalho. Use o modelo de importação.`,
    });
    return vazia;
  }
  const linhas: Array<{ numero: number; valor: (coluna: string) => Celula; extras: ColunasExtras }> = [];
  for (let i = inicio + 1; i < aba.linhas.length; i++) {
    const linha = aba.linhas[i];
    if (!linha.some((c) => texto(c) !== "")) continue;
    const valoresExtras: ColunasExtras = {};
    for (const [nome, j] of extras) {
      const v = texto(linha[j]);
      if (v) valoresExtras[nome] = v;
    }
    linhas.push({ numero: i + 1, valor: (coluna) => (indice.has(coluna) ? linha[indice.get(coluna)!] : null), extras: valoresExtras });
  }
  return { linhas, extras: [...extras.keys()] };
}

function mensagensDoZod(issues: Array<{ path: PropertyKey[]; message: string }>): string[] {
  return issues.map((i) => {
    const campo = String(i.path[0] ?? "");
    return ROTULO_DO_CAMPO[campo] ? `${ROTULO_DO_CAMPO[campo]}: ${i.message}` : i.message;
  });
}

function lerItens(aba: AbaLida, erros: ErroDaPlanilha[]): { linhas: LinhaDeItem[]; extras: string[] } {
  const resultado: LinhaDeItem[] = [];
  const lida = lerAba(aba, COLUNAS_DOS_ITENS, ["Tipo"], erros);
  for (const { numero, valor, extras } of lida.linhas) {
    const problemas: string[] = [];
    const tipo = texto(valor("Tipo"));
    const usuario = texto(valor("Usuário")).replace(/\s+/g, " ");
    const local = texto(valor("Local"));
    if (!tipo) problemas.push("Informe o tipo.");

    const statusDigitado = texto(valor("Status"));
    let status: (typeof STATUS)[number] = usuario ? "em_uso" : "em_estoque";
    if (statusDigitado) {
      const achado = porNome(STATUS, NOME_DO_STATUS, statusDigitado);
      if (achado) status = achado;
      else problemas.push(`Status “${statusDigitado}” não existe. Use ${lista(STATUS.map((s) => NOME_DO_STATUS[s]))}.`);
    }
    const condicaoDigitada = texto(valor("Condição"));
    const condicao = condicaoDigitada ? porNome(CONDICOES, NOME_DA_CONDICAO, condicaoDigitada) : null;
    if (condicaoDigitada && !condicao) {
      problemas.push(`Condição “${condicaoDigitada}” não existe. Use ${lista(CONDICOES.map((c) => NOME_DA_CONDICAO[c]))}, ou deixe em branco.`);
    }
    if (partesDoLocal(local) === null) problemas.push("Local: use “Unidade” ou “Unidade › Departamento”.");
    if (usuario && local) {
      problemas.push("Com o Usuário preenchido, deixe o Local em branco: o item fica onde a pessoa está.");
    }
    if (usuario.length > 120) problemas.push("Usuário: use no máximo 120 caracteres.");

    const datas: Record<"dataCompra" | "garantiaAte", string> = { dataCompra: "", garantiaAte: "" };
    for (const [campo, coluna] of [
      ["dataCompra", "Data de compra"],
      ["garantiaAte", "Garantia até"],
    ] as const) {
      const d = data(valor(coluna));
      if (d === "invalida") problemas.push(`${coluna}: data inválida. Use dd/mm/aaaa.`);
      else datas[campo] = d ?? "";
    }

    const validacao = regrasDoItem.safeParse({
      tipoId: "1",
      usuarioId: "",
      localId: "",
      status,
      condicao: condicao ?? "",
      marca: texto(valor("Marca")),
      modelo: texto(valor("Modelo")),
      numeroSerie: texto(valor("Nº de série")),
      hostname: texto(valor("Hostname")),
      processador: texto(valor("Processador")),
      memoriaRam: texto(valor("Memória RAM")),
      armazenamento: texto(valor("Armazenamento")),
      sistemaOperacional: texto(valor("Sistema operacional")),
      dataCompra: datas.dataCompra,
      garantiaAte: datas.garantiaAte,
      observacoes: texto(valor("Observações")),
    });
    if (!validacao.success) problemas.push(...mensagensDoZod(validacao.error.issues));

    if (problemas.length || !validacao.success) {
      for (const mensagem of problemas) erros.push({ aba: aba.nome, linha: numero, mensagem });
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tipoId, usuarioId, localId, ...dados } = validacao.data;
    resultado.push({ linha: numero, tipo, local, usuario, dados, caracteristicas: extras });
  }
  return { linhas: resultado, extras: lida.extras };
}

function lerMateriais(aba: AbaLida, erros: ErroDaPlanilha[]): { linhas: LinhaDeMaterial[]; extras: string[] } {
  const resultado: LinhaDeMaterial[] = [];
  const lida = lerAba(aba, COLUNAS_DOS_MATERIAIS, ["Nome", "Grupo", "Quantidade"], erros);
  for (const { numero, valor, extras } of lida.linhas) {
    const problemas: string[] = [];
    const local = texto(valor("Local"));
    const grupoDigitado = texto(valor("Grupo"));
    const grupo = grupoDigitado ? porNome(GRUPOS, NOME_DO_GRUPO, grupoDigitado) : null;
    if (!grupoDigitado) problemas.push("Informe o grupo.");
    else if (!grupo) problemas.push(`Grupo “${grupoDigitado}” não existe. Os grupos estão na aba Instruções.`);
    const condicaoDigitada = texto(valor("Condição"));
    const condicao = condicaoDigitada ? porNome(CONDICOES, NOME_DA_CONDICAO, condicaoDigitada) : null;
    if (condicaoDigitada && !condicao) {
      problemas.push(`Condição “${condicaoDigitada}” não existe. Use ${lista(CONDICOES.map((c) => NOME_DA_CONDICAO[c]))}, ou deixe em branco.`);
    }
    if (partesDoLocal(local) === null) problemas.push("Local: use “Unidade” ou “Unidade › Departamento”.");

    const quantidade = valor("Quantidade");
    const validacao = regrasDoNovoMaterial.safeParse({
      nome: texto(valor("Nome")),
      marcaModelo: texto(valor("Marca / modelo")),
      compativelCom: texto(valor("Compatível com")),
      grupo: grupo ?? "outros",
      localId: "",
      condicao: condicao ?? "",
      observacoes: texto(valor("Observações")),
      // Um número do Excel com casas decimais vira "1.5", que a regra recusa.
      quantidade: typeof quantidade === "number" ? String(quantidade) : texto(quantidade),
    });
    if (!validacao.success) problemas.push(...mensagensDoZod(validacao.error.issues));

    if (problemas.length || !validacao.success) {
      for (const mensagem of problemas) erros.push({ aba: aba.nome, linha: numero, mensagem });
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { localId, ...dados } = validacao.data;
    resultado.push({ linha: numero, local, dados, caracteristicas: extras });
  }
  return { linhas: resultado, extras: lida.extras };
}

/** Lê as abas Itens e Materiais. As outras abas (como Instruções) são ignoradas. */
export function lerPlanilha(abas: AbaLida[]): PlanilhaLida {
  const erros: ErroDaPlanilha[] = [];
  const achar = (nome: string) => abas.find((a) => chave(a.nome) === chave(nome));
  const abaDosItens = achar(ABA_DOS_ITENS);
  const abaDosMateriais = achar(ABA_DOS_MATERIAIS);
  const nada = { itens: [], materiais: [], colunasExtras: { itens: [], materiais: [] } };
  if (!abaDosItens && !abaDosMateriais) {
    return { ...nada, erros: [{ aba: "Arquivo", mensagem: "Não encontramos as abas “Itens” e “Materiais”. Use o modelo de importação." }] };
  }
  const total = (abaDosItens?.linhas.length ?? 0) + (abaDosMateriais?.linhas.length ?? 0);
  if (total > LINHAS_NO_MAXIMO + 2) {
    return { ...nada, erros: [{ aba: "Arquivo", mensagem: `A planilha passa de ${LINHAS_NO_MAXIMO.toLocaleString("pt-BR")} linhas. Divida em arquivos menores.` }] };
  }
  const itens = abaDosItens ? lerItens({ ...abaDosItens, nome: ABA_DOS_ITENS }, erros) : { linhas: [], extras: [] };
  const materiais = abaDosMateriais ? lerMateriais({ ...abaDosMateriais, nome: ABA_DOS_MATERIAIS }, erros) : { linhas: [], extras: [] };
  if (!erros.length && !itens.linhas.length && !materiais.linhas.length) {
    erros.push({ aba: "Arquivo", mensagem: "A planilha não tem nenhuma linha preenchida." });
  }
  return { itens: itens.linhas, materiais: materiais.linhas, erros, colunasExtras: { itens: itens.extras, materiais: materiais.extras } };
}
