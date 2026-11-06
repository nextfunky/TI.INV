import { and, eq, isNull, ne, or, sql } from "drizzle-orm";

import { STATUS_AO_DEVOLVER, STATUS_AO_VINCULAR } from "@/lib/colaboradores/servico";
import { colaboradores, itens, locais } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";
import { estadoDosItens, registrarMudancas } from "@/lib/historico/servico";

/**
 * As ações rápidas do painel do item: Entregar (ou Trocar pessoa), Devolver e
 * Mudar de local. Cada uma grava o registro no histórico, com a observação.
 */

export type ResultadoDaAcaoRapida =
  | { ok: true; codigo: string; pessoa?: string; local?: string | null }
  | { ok: false; erros?: Record<string, string>; erro?: string };

const NAO_ENCONTRADO = "Este item não existe mais.";

async function nomeDaPessoa(db: Banco, id: number) {
  const [p] = await db.select({ nome: colaboradores.nome }).from(colaboradores).where(eq(colaboradores.id, id));
  return p?.nome ?? null;
}

async function caminhoDoLocal(db: Banco, id: number | null) {
  if (id === null) return null;
  const [l] = await db.select({ caminho: locais.caminho }).from(locais).where(eq(locais.id, id));
  return l?.caminho ?? undefined;
}

/** Entregar a uma pessoa (ou passar para outra). Um item em estoque passa para "Em uso". */
export async function entregarItem(db: Banco, itemId: number, pessoaId: number, observacao: string | null): Promise<ResultadoDaAcaoRapida> {
  return db.transaction(async (tx): Promise<ResultadoDaAcaoRapida> => {
    const pessoa = await nomeDaPessoa(tx, pessoaId);
    if (!pessoa) return { ok: false, erros: { pessoaId: "Escolha uma pessoa da lista." } };
    const antes = await estadoDosItens(tx, [itemId]);
    const atual = antes.get(itemId);
    if (!atual) return { ok: false, erro: NAO_ENCONTRADO };
    if (atual.usuarioId === pessoaId) return { ok: false, erros: { pessoaId: `O item já está com ${pessoa}.` } };
    const [item] = await tx
      .update(itens)
      .set({ usuarioId: pessoaId, localId: null, status: STATUS_AO_VINCULAR, atualizadoEm: sql`now()` })
      .where(and(eq(itens.id, itemId), ne(itens.status, "descartado")))
      .returning({ codigo: itens.codigo });
    if (!item) return { ok: false, erro: "Um item descartado não pode ser entregue." };
    await registrarMudancas(tx, antes, observacao);
    return { ok: true, codigo: item.codigo, pessoa };
  });
}

/** Devolver: o item sai da pessoa e, se quiser, já vai para um local. Em uso volta para "Em estoque". */
export async function devolverItemPara(db: Banco, itemId: number, localId: number | null, observacao: string | null): Promise<ResultadoDaAcaoRapida> {
  return db.transaction(async (tx): Promise<ResultadoDaAcaoRapida> => {
    const local = await caminhoDoLocal(tx, localId);
    if (local === undefined) return { ok: false, erros: { localId: "Escolha um local da lista." } };
    const antes = await estadoDosItens(tx, [itemId]);
    const [item] = await tx
      .update(itens)
      .set({ usuarioId: null, localId, status: STATUS_AO_DEVOLVER, atualizadoEm: sql`now()` })
      .where(and(eq(itens.id, itemId), sql`${itens.usuarioId} is not null`))
      .returning({ codigo: itens.codigo });
    if (!item) return { ok: false, erro: antes.has(itemId) ? "Este item já não estava com ninguém." : NAO_ENCONTRADO };
    await registrarMudancas(tx, antes, observacao);
    return { ok: true, codigo: item.codigo, local };
  });
}

/** Mudar de local: só para itens sem usuário (com usuário, o item fica onde a pessoa está). */
export async function mudarLocalDoItem(db: Banco, itemId: number, localId: number | null, observacao: string | null): Promise<ResultadoDaAcaoRapida> {
  return db.transaction(async (tx): Promise<ResultadoDaAcaoRapida> => {
    const local = await caminhoDoLocal(tx, localId);
    if (local === undefined) return { ok: false, erros: { localId: "Escolha um local da lista." } };
    const antes = await estadoDosItens(tx, [itemId]);
    const atual = antes.get(itemId);
    if (!atual) return { ok: false, erro: NAO_ENCONTRADO };
    if (atual.usuarioId !== null) return { ok: false, erro: `O item está com ${atual.usuario}: ele fica onde a pessoa está.` };
    if (atual.localId === localId) return { ok: false, erros: { localId: "O item já está neste local." } };
    const [item] = await tx
      .update(itens)
      .set({ localId, atualizadoEm: sql`now()` })
      .where(and(eq(itens.id, itemId), isNull(itens.usuarioId), or(isNull(itens.localId), ne(itens.localId, localId ?? 0))))
      .returning({ codigo: itens.codigo });
    if (!item) return { ok: false, erro: NAO_ENCONTRADO };
    await registrarMudancas(tx, antes, observacao);
    return { ok: true, codigo: item.codigo, local };
  });
}
