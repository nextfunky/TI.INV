import { eq, sql } from "drizzle-orm";

import { colaboradores, itens, tiposDeItem } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";

import { CAMPOS_DE_COMPUTADOR, type DadosDoItem } from "./regras";
import type { Categoria } from "./valores";

/**
 * As regras dos itens. Não dependem do Next: recebem o banco como
 * parâmetro, o que permite testá-las com um banco em memória.
 */

export type Item = typeof itens.$inferSelect;
export type TipoResumido = { id: number; nome: string; categoria: Categoria; prefixo: string; icone: string };
export type UsuarioResumido = { id: number; nome: string };
export type ItemComTipo = Item & { tipo: TipoResumido; usuario: UsuarioResumido | null };

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
};

/** Começo de toda consulta que mostra itens: o item, o tipo e a pessoa (se houver). */
export function consultaDeItens(db: Banco) {
  return db
    .select(CAMPOS_DO_ITEM_COMPLETO)
    .from(itens)
    .innerJoin(tiposDeItem, eq(tiposDeItem.id, itens.tipoId))
    .leftJoin(colaboradores, eq(colaboradores.id, itens.usuarioId))
    .$dynamic();
}

export function juntarItemETipo(linha: {
  item: Item;
  tipo: TipoResumido;
  usuario: UsuarioResumido | null;
}): ItemComTipo {
  return { ...linha.item, tipo: linha.tipo, usuario: linha.usuario?.id ? linha.usuario : null };
}

/** "DSK" + 1 → "DSK0001". Acima de 9999 o número só continua crescendo. */
export function montarCodigo(prefixo: string, numero: number): string {
  return `${prefixo}${String(numero).padStart(4, "0")}`;
}

/** Os campos de computador só valem para tipos da categoria Computador. */
function aplicarCategoria(dados: DadosDoItem, categoria: Categoria) {
  if (categoria === "computador") return dados;
  const limpo = { ...dados };
  for (const campo of CAMPOS_DE_COMPUTADOR) limpo[campo] = null;
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

export async function criarItem(
  db: Banco,
  dados: DadosDoItem,
): Promise<{ criado: true; codigo: string } | { criado: false; erros: Record<string, string> }> {
  return db.transaction(async (tx) => {
    if (!(await pessoaExiste(tx, dados.usuarioId))) return { criado: false as const, erros: ERRO_DE_PESSOA };
    const reserva = await reservarCodigo(tx, dados.tipoId);
    if (!reserva) return { criado: false as const, erros: { tipoId: "Escolha o tipo." } };

    await tx.insert(itens).values({ ...aplicarCategoria(dados, reserva.categoria), codigo: reserva.codigo });
    return { criado: true as const, codigo: reserva.codigo };
  });
}

export type ResultadoDaEdicao =
  | { salvo: true; codigoAntigo: string; codigo: string }
  | { salvo: false; erros: Record<string, string> }
  | { salvo: false; naoEncontrado: true };

/** Salva as mudanças. Se o tipo mudar, o item ganha o próximo código do tipo novo. */
export async function editarItem(db: Banco, id: number, dados: DadosDoItem): Promise<ResultadoDaEdicao> {
  return db.transaction(async (tx): Promise<ResultadoDaEdicao> => {
    const [atual] = await tx
      .select({ codigo: itens.codigo, tipoId: itens.tipoId })
      .from(itens)
      .where(eq(itens.id, id))
      .for("update");
    if (!atual) return { salvo: false, naoEncontrado: true };
    if (!(await pessoaExiste(tx, dados.usuarioId))) return { salvo: false, erros: ERRO_DE_PESSOA };

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

    await tx
      .update(itens)
      .set({ ...aplicarCategoria(dados, categoria), codigo, atualizadoEm: sql`now()` })
      .where(eq(itens.id, id));
    return { salvo: true, codigoAntigo: atual.codigo, codigo };
  });
}

/** Apaga o item de vez. O código dele nunca volta a ser usado. */
export async function excluirItem(db: Banco, id: number): Promise<string | null> {
  const [apagado] = await db.delete(itens).where(eq(itens.id, id)).returning({ codigo: itens.codigo });
  return apagado?.codigo ?? null;
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
    processador: item.processador ?? "",
    memoriaRam: item.memoriaRam ?? "",
    armazenamento: item.armazenamento ?? "",
    sistemaOperacional: item.sistemaOperacional ?? "",
    dataCompra: item.dataCompra ?? "",
    garantiaAte: item.garantiaAte ?? "",
  };
}
