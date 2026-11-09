import { eq, sql } from "drizzle-orm";

import { colaboradores, itens, locais, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";

import { conferirValores } from "@/lib/caracteristicas/regras";
import { caracteristicasDoTipo, simples } from "@/lib/caracteristicas/servico";
import { estadoDosItens, registrarCadastro, registrarExclusao, registrarMudancas } from "@/lib/historico/servico";

import { CAMPOS_DE_COMPUTADOR, type DadosDoItem } from "./regras";
import type { Categoria } from "./valores";

/**
 * As regras dos itens. Não dependem do Next: recebem o banco como
 * parâmetro, o que permite testá-las com um banco em memória.
 */

export type Item = typeof itens.$inferSelect;
export type TipoResumido = { id: number; nome: string; categoria: Categoria; prefixo: string; icone: string };
export type UsuarioResumido = { id: number; nome: string };
export type LocalResumido = { id: number; nome: string; caminho: string };
export type ItemComTipo = Item & {
  tipo: TipoResumido;
  usuario: UsuarioResumido | null;
  /** O local atual: o da pessoa (se o item tem usuário) ou o próprio do item. */
  local: LocalResumido | null;
};

/** O local atual do item, em SQL: o da pessoa se há usuário; senão, o do item. */
export const LOCAL_ATUAL = sql<number | null>`case when ${itens.usuarioId} is not null then ${colaboradores.localId} else ${itens.localId} end`;

/** Os campos do item, do tipo e de quem usa, para as consultas que mostram itens. */
const CAMPOS_DO_ITEM_COMPLETO = {
  item: itens,
  tipo: {
    id: tiposDeItem.id,
    nome: tiposDeItem.nome,
    categoria: tiposDeItem.categoria,
    prefixo: tiposDeItem.prefixo,
    icone: tiposDeItem.icone,
  },
  usuario: { id: colaboradores.id, nome: colaboradores.nome },
  local: { id: locais.id, nome: locais.nome, caminho: locais.caminho },
};

/** Começo de toda consulta que mostra itens: o item, o tipo e a pessoa (se houver). */
export function consultaDeItens(db: Banco) {
  return db
    .select(CAMPOS_DO_ITEM_COMPLETO)
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .leftJoin(colaboradores, eq(colaboradores.id, itens.usuarioId))
    .leftJoin(locais, eq(locais.id, LOCAL_ATUAL))
    .$dynamic();
}

export function juntarItemETipo(linha: {
  item: Item;
  tipo: TipoResumido;
  usuario: UsuarioResumido | null;
  local: LocalResumido | null;
}): ItemComTipo {
  return {
    ...linha.item,
    tipo: linha.tipo,
    usuario: linha.usuario?.id ? linha.usuario : null,
    local: linha.local?.id ? linha.local : null,
  };
}

/** "DSK" + 1 → "DSK0001". Acima de 9999 o número só continua crescendo. */
export function montarCodigo(prefixo: string, numero: number): string {
  return `${prefixo}${String(numero).padStart(4, "0")}`;
}

/**
 * Antes de gravar: os campos de computador só valem para tipos da categoria
 * Computador, e o local próprio só vale para itens sem usuário (com usuário,
 * o item fica onde a pessoa está).
 */
export function aplicarCategoria(dados: DadosDoItem, categoria: Categoria) {
  const limpo = { ...dados };
  if (categoria !== "computador") for (const campo of CAMPOS_DE_COMPUTADOR) limpo[campo] = null;
  if (limpo.usuarioId !== null) limpo.localId = null;
  return limpo;
}

/**
 * Reserva o próximo número do tipo. O UPDATE trava a linha do tipo até o fim
 * da transação, então dois cadastros ao mesmo tempo nunca pegam o mesmo número.
 */
async function reservarCodigo(tx: Banco, tipoId: number) {
  const [tipo] = await tx
    .update(tiposDeItem)
    .set({ ultimoNumero: sql`${tiposDeItem.ultimoNumero} + 1` })
    .where(eq(tiposDeItem.id, tipoId))
    .returning({ prefixo: tiposDeItem.prefixo, numero: tiposDeItem.ultimoNumero, categoria: tiposDeItem.categoria });
  return tipo ? { codigo: montarCodigo(tipo.prefixo, tipo.numero), categoria: tipo.categoria } : null;
}

/** A pessoa escolhida ainda existe? (Pode ter sido excluída em outra aba.) */
async function pessoaExiste(tx: Banco, usuarioId: number | null): Promise<boolean> {
  if (usuarioId === null) return true;
  const [linha] = await tx.select({ id: colaboradores.id }).from(colaboradores).where(eq(colaboradores.id, usuarioId));
  return Boolean(linha);
}

const ERRO_DE_PESSOA = { usuarioId: "Escolha uma pessoa da lista." };
const ERRO_DE_LOCAL = { localId: "Escolha um local da lista." };

/** O local escolhido ainda existe? */
async function localExiste(tx: Banco, localId: number | null): Promise<boolean> {
  if (localId === null) return true;
  const [linha] = await tx.select({ id: locais.id }).from(locais).where(eq(locais.id, localId));
  return Boolean(linha);
}

/**
 * Confere as características digitadas contra as do tipo. Só ficam as do tipo
 * (ao trocar o tipo, as do tipo antigo saem).
 */
async function caracteristicasConferidas(tx: Banco, tipoId: number, bruto: Record<string, string>) {
  const campos = (await caracteristicasDoTipo(tx, tipoId)).map(simples);
  return conferirValores(campos, bruto);
}

export async function criarItem(
  db: Banco,
  dados: DadosDoItem,
  /** As características digitadas ({ idDaCaracteristica: valor }), conferidas aqui contra as do tipo. */
  caracteristicasDigitadas: Record<string, string> = {},
): Promise<{ criado: true; codigo: string } | { criado: false; erros: Record<string, string> }> {
  return db.transaction(async (tx) => {
    if (!(await pessoaExiste(tx, dados.usuarioId))) return { criado: false as const, erros: ERRO_DE_PESSOA };
    if (!(await localExiste(tx, dados.localId))) return { criado: false as const, erros: ERRO_DE_LOCAL };
    const { valores, erros } = await caracteristicasConferidas(tx, dados.tipoId, caracteristicasDigitadas);
    if (Object.keys(erros).length) return { criado: false as const, erros };
    const reserva = await reservarCodigo(tx, dados.tipoId);
    if (!reserva) return { criado: false as const, erros: { tipoId: "Escolha o tipo." } };

    const [novo] = await tx
      .insert(itens)
      .values({ ...aplicarCategoria(dados, reserva.categoria), codigo: reserva.codigo, caracteristicas: valores })
      .returning({ id: itens.id });
    await registrarCadastro(tx, [novo.id]);
    return { criado: true as const, codigo: reserva.codigo };
  });
}

export type ResultadoDaEdicao =
  | { salvo: true; codigoAntigo: string; codigo: string }
  | { salvo: false; erros: Record<string, string> }
  | { salvo: false; naoEncontrado: true };

/** Salva as mudanças. Se o tipo mudar, o item ganha o próximo código do tipo novo. */
export async function editarItem(
  db: Banco,
  id: number,
  dados: DadosDoItem,
  caracteristicasDigitadas: Record<string, string> = {},
): Promise<ResultadoDaEdicao> {
  return db.transaction(async (tx): Promise<ResultadoDaEdicao> => {
    const [atual] = await tx
      .select({ codigo: itens.codigo, tipoId: itens.tipoId })
      .from(itens)
      .where(eq(itens.id, id))
      .for("update");
    if (!atual) return { salvo: false, naoEncontrado: true };
    if (!(await pessoaExiste(tx, dados.usuarioId))) return { salvo: false, erros: ERRO_DE_PESSOA };
    if (!(await localExiste(tx, dados.localId))) return { salvo: false, erros: ERRO_DE_LOCAL };
    const caracteristicas = await caracteristicasConferidas(tx, dados.tipoId, caracteristicasDigitadas);
    if (Object.keys(caracteristicas.erros).length) return { salvo: false, erros: caracteristicas.erros };

    let codigo = atual.codigo;
    let categoria: Categoria;
    if (dados.tipoId !== atual.tipoId) {
      const reserva = await reservarCodigo(tx, dados.tipoId);
      if (!reserva) return { salvo: false, erros: { tipoId: "Escolha o tipo." } };
      codigo = reserva.codigo;
      categoria = reserva.categoria;
    } else {
      const [tipo] = await tx
        .select({ categoria: tiposDeItem.categoria })
        .from(tiposDeItem)
        .where(eq(tiposDeItem.id, dados.tipoId));
      categoria = tipo.categoria;
    }

    const antes = await estadoDosItens(tx, [id]);
    await tx
      .update(itens)
      .set({ ...aplicarCategoria(dados, categoria), codigo, caracteristicas: caracteristicas.valores, atualizadoEm: sql`now()` })
      .where(eq(itens.id, id));
    // Mudou a pessoa ou o local? Vai para o histórico.
    await registrarMudancas(tx, antes);
    return { salvo: true, codigoAntigo: atual.codigo, codigo };
  });
}

/** Apaga o item de vez. O código dele nunca volta a ser usado, e o histórico fica (com um último registro "Excluído"). */
export async function excluirItem(db: Banco, id: number): Promise<string | null> {
  return db.transaction(async (tx) => {
    const estado = (await estadoDosItens(tx, [id])).get(id);
    if (!estado) return null;
    await registrarExclusao(tx, estado);
    const [apagado] = await tx.delete(itens).where(eq(itens.id, id)).returning({ codigo: itens.codigo });
    return apagado?.codigo ?? null;
  });
}

/** O item pelo código do endereço (/inventario/DSK0001). Aceita minúsculas. */
export async function obterItemPorCodigo(db: Banco, codigo: string): Promise<ItemComTipo | null> {
  const [linha] = await consultaDeItens(db)
    .where(eq(itens.codigo, codigo.trim().toUpperCase()))
    .limit(1);
  return linha ? juntarItemETipo(linha) : null;
}

/**
 * Para "Salvar e cadastrar outro": o que se repete de um item para o próximo.
 * Nº de série, hostname e observações ficam em branco.
 */
export function camposParaRepetir(item: Item): Record<string, string> {
  return {
    tipoId: String(item.tipoId),
    marca: item.marca ?? "",
    modelo: item.modelo ?? "",
    status: item.status,
    condicao: item.condicao ?? "",
    localId: item.localId ? String(item.localId) : "",
    processador: item.processador ?? "",
    memoriaRam: item.memoriaRam ?? "",
    armazenamento: item.armazenamento ?? "",
    sistemaOperacional: item.sistemaOperacional ?? "",
    dataCompra: item.dataCompra ?? "",
    garantiaAte: item.garantiaAte ?? "",
    // As características também se repetem (ex.: 73 telefones IP iguais). Vão pelo id ({ "12": "IP" }).
    ...(item.caracteristicas ?? {}),
  };
}
