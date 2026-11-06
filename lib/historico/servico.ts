import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { historicoDeItens, itens } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { nomeCompletoDoItem } from "@/lib/itens/nomes";
import { consultaDeItens, juntarItemETipo } from "@/lib/itens/servico";

import { REGISTROS_POR_PAGINA, type FiltrosDoHistorico } from "./filtros";

/**
 * O histórico dos itens. Quem muda um item (formulário, Vincular, Devolver,
 * Trazer itens, mudar o local da pessoa...) guarda o estado de antes, faz a
 * mudança e chama `registrarMudancas`: a comparação diz o que aconteceu.
 */

export type EstadoDoItem = {
  id: number;
  codigo: string;
  descricao: string;
  usuarioId: number | null;
  usuario: string | null;
  /** O local atual: o da pessoa (com usuário) ou o próprio do item. */
  localId: number | null;
  local: string | null;
};

export type NovoRegistro = typeof historicoDeItens.$inferInsert;
export type Registro = typeof historicoDeItens.$inferSelect;

/** Como cada item está agora (pessoa e local atual), para comparar depois. */
export async function estadoDosItens(db: Banco, ids: number[]): Promise<Map<number, EstadoDoItem>> {
  if (!ids.length) return new Map();
  const linhas = (await consultaDeItens(db).where(inArray(itens.id, ids))).map(juntarItemETipo);
  return new Map(
    linhas.map((i) => [
      i.id,
      {
        id: i.id,
        codigo: i.codigo,
        descricao: nomeCompletoDoItem(i),
        usuarioId: i.usuario?.id ?? null,
        usuario: i.usuario?.nome ?? null,
        localId: i.local?.id ?? null,
        local: i.local?.caminho ?? null,
      },
    ]),
  );
}

/**
 * O que aconteceu entre o antes e o depois de um item. Mudou a pessoa: entrega,
 * troca ou devolução. Só o local: mudança de local (sem usuário) ou "mudou com
 * a pessoa" (a pessoa mudou de setor). Nada disso: nenhum registro.
 */
export function eventoDaMudanca(antes: EstadoDoItem, depois: EstadoDoItem, observacao: string | null = null): NovoRegistro | null {
  const base = { itemId: depois.id, codigo: depois.codigo, descricao: depois.descricao, observacao, deLocal: antes.local, paraLocal: depois.local };
  const de = { dePessoaId: antes.usuarioId, dePessoa: antes.usuario };
  const para = { paraPessoaId: depois.usuarioId, paraPessoa: depois.usuario };
  if (antes.usuarioId === null && depois.usuarioId !== null) return { ...base, ...para, evento: "entrega" };
  if (antes.usuarioId !== null && depois.usuarioId !== null && antes.usuarioId !== depois.usuarioId) {
    return { ...base, ...de, ...para, evento: "troca" };
  }
  if (antes.usuarioId !== null && depois.usuarioId === null) return { ...base, ...de, evento: "devolucao" };
  if (antes.localId !== depois.localId) {
    return depois.usuarioId === null ? { ...base, evento: "mudanca_de_local" } : { ...base, ...para, evento: "mudou_com_a_pessoa" };
  }
  return null;
}

/** Compara com o estado de agora e grava o que mudou. */
export async function registrarMudancas(db: Banco, antes: Map<number, EstadoDoItem>, observacao: string | null = null) {
  const depois = await estadoDosItens(db, [...antes.keys()]);
  const registros = [...antes.values()]
    .map((a) => (depois.has(a.id) ? eventoDaMudanca(a, depois.get(a.id)!, observacao) : null))
    .filter((r): r is NovoRegistro => r !== null);
  if (registros.length) await db.insert(historicoDeItens).values(registros);
  return registros.length;
}

/** O primeiro registro de cada item: onde ele começou (com quem, ou em que local). */
export async function registrarCadastro(db: Banco, ids: number[], observacao: string | null = null) {
  const estados = await estadoDosItens(db, ids);
  const registros: NovoRegistro[] = ids
    .filter((id) => estados.has(id))
    .map((id) => {
      const e = estados.get(id)!;
      return { itemId: id, codigo: e.codigo, descricao: e.descricao, evento: "cadastro", paraPessoaId: e.usuarioId, paraPessoa: e.usuario, paraLocal: e.local, observacao };
    });
  for (let i = 0; i < registros.length; i += 500) await db.insert(historicoDeItens).values(registros.slice(i, i + 500));
}

/** O último registro, antes de o item sair do sistema. */
export async function registrarExclusao(db: Banco, estado: EstadoDoItem) {
  await db.insert(historicoDeItens).values({
    itemId: estado.id,
    codigo: estado.codigo,
    descricao: estado.descricao,
    evento: "exclusao",
    dePessoaId: estado.usuarioId,
    dePessoa: estado.usuario,
    deLocal: estado.local,
  });
}

// ─── Consultas ─────────────────────────────────────────────────────────────

/** O histórico de um item, do mais novo para o mais antigo. */
export async function historicoDoItem(db: Banco, itemId: number, limite = 200): Promise<Registro[]> {
  return db.select().from(historicoDeItens).where(eq(historicoDeItens.itemId, itemId)).orderBy(desc(historicoDeItens.id)).limit(limite);
}

/** Os últimos registros, para a "Atividade recente" do Início. */
export async function atividadeRecente(db: Banco, limite = 8): Promise<Registro[]> {
  return db.select().from(historicoDeItens).orderBy(desc(historicoDeItens.id)).limit(limite);
}

/** Todos os registros (inclusive de itens excluídos), com busca e filtro por evento, 50 por página. */
export async function listarHistorico(db: Banco, f: FiltrosDoHistorico) {
  const condicoes: Array<SQL | undefined> = [];
  if (f.evento) condicoes.push(eq(historicoDeItens.evento, f.evento));
  // O código é guardado no registro: o histórico de um código continua mesmo se o item mudou de tipo ou foi excluído.
  if (f.item) condicoes.push(eq(historicoDeItens.codigo, f.item));
  if (f.busca) {
    const termo = `%${f.busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    condicoes.push(
      or(
        ilike(historicoDeItens.codigo, termo),
        ilike(historicoDeItens.descricao, termo),
        ilike(historicoDeItens.dePessoa, termo),
        ilike(historicoDeItens.paraPessoa, termo),
        ilike(historicoDeItens.deLocal, termo),
        ilike(historicoDeItens.paraLocal, termo),
        ilike(historicoDeItens.observacao, termo),
      ),
    );
  }
  const onde = and(...condicoes);
  const [{ total }] = await db.select({ total: count() }).from(historicoDeItens).where(onde);
  const paginas = Math.max(1, Math.ceil(total / REGISTROS_POR_PAGINA));
  const pagina = Math.min(f.pagina, paginas);
  const registros = await db
    .select()
    .from(historicoDeItens)
    .where(onde)
    .orderBy(desc(historicoDeItens.id))
    .limit(REGISTROS_POR_PAGINA)
    .offset((pagina - 1) * REGISTROS_POR_PAGINA);
  return { registros, total, pagina, paginas };
}

/** Quantos registros um item tem (para o "Ver todo o histórico"). */
export async function totalDoHistorico(db: Banco, itemId: number): Promise<number> {
  const [{ total }] = await db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(historicoDeItens).where(eq(historicoDeItens.itemId, itemId));
  return total;
}
