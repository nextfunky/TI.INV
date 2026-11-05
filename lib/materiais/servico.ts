import { and, asc, count, desc, eq, ilike, or, sql, sum } from "drizzle-orm";

import { colaboradores, locais, materiais, movimentosDeMaterial } from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";

import type { DadosDoMaterial } from "./regras";
import type { FiltrosDosMateriais } from "./filtros";

/**
 * As regras dos materiais (o que é controlado por quantidade).
 * O saldo só muda por um movimento: entrada, saída ou ajuste de contagem.
 * Recebem o banco como parâmetro, para poderem ser testadas com um banco em memória.
 */

export type Material = typeof materiais.$inferSelect;
type Erros = Record<string, string>;

const LOCAL_INVALIDO = "Escolha um local da lista.";
const PESSOA_INVALIDA = "Escolha uma pessoa da lista.";

async function localExiste(db: Banco, localId: number | null) {
  if (localId === null) return true;
  const [linha] = await db.select({ id: locais.id }).from(locais).where(eq(locais.id, localId));
  return Boolean(linha);
}

/** Cadastra o material. A quantidade que já existe entra como a primeira entrada. */
export async function criarMaterial(
  db: Banco,
  dados: DadosDoMaterial & { quantidade: number },
): Promise<{ criado: true; material: Material } | { criado: false; erros: Erros }> {
  if (!(await localExiste(db, dados.localId))) return { criado: false, erros: { localId: LOCAL_INVALIDO } };
  const material = await db.transaction(async (tx) => {
    const [novo] = await tx.insert(materiais).values(dados).returning();
    if (dados.quantidade > 0) {
      await tx.insert(movimentosDeMaterial).values({
        materialId: novo.id,
        tipo: "entrada",
        quantidade: dados.quantidade,
        saldo: dados.quantidade,
        observacao: "Quantidade no cadastro",
      });
    }
    return novo;
  });
  return { criado: true, material };
}

/** Muda os dados do material. A quantidade não muda aqui: só pelos movimentos. */
export async function editarMaterial(
  db: Banco,
  id: number,
  dados: DadosDoMaterial,
): Promise<{ salvo: true } | { salvo: false; erros: Erros } | { salvo: false; naoEncontrado: true }> {
  if (!(await localExiste(db, dados.localId))) return { salvo: false, erros: { localId: LOCAL_INVALIDO } };
  const [salvo] = await db
    .update(materiais)
    .set({ ...dados, atualizadoEm: sql`now()` })
    .where(eq(materiais.id, id))
    .returning({ id: materiais.id });
  return salvo ? { salvo: true } : { salvo: false, naoEncontrado: true };
}

async function totalDeSaidas(db: Banco, id: number): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(movimentosDeMaterial)
    .where(and(eq(movimentosDeMaterial.materialId, id), eq(movimentosDeMaterial.tipo, "saida")));
  return total;
}

/** Só exclui material que nunca teve saída, para não apagar o que foi entregue às pessoas. */
export async function excluirMaterial(
  db: Banco,
  id: number,
): Promise<{ excluido: true; nome: string } | { excluido: false; motivo: "tem_saidas" | "nao_encontrado"; nome?: string }> {
  const [material] = await db.select({ nome: materiais.nome }).from(materiais).where(eq(materiais.id, id));
  if (!material) return { excluido: false, motivo: "nao_encontrado" };
  if ((await totalDeSaidas(db, id)) > 0) return { excluido: false, motivo: "tem_saidas", nome: material.nome };
  await db.delete(materiais).where(eq(materiais.id, id));
  return { excluido: true, nome: material.nome };
}

function escaparBusca(termo: string): string {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** A lista de materiais, por grupo (na ordem da lista) e por nome. A busca olha o nome, a marca/modelo e o local. */
export async function listarMateriais(db: Banco, filtros: FiltrosDosMateriais = {}) {
  const termo = filtros.busca ? `%${escaparBusca(filtros.busca)}%` : null;
  return db
    .select({
      id: materiais.id,
      nome: materiais.nome,
      marcaModelo: materiais.marcaModelo,
      grupo: materiais.grupo,
      condicao: materiais.condicao,
      quantidade: materiais.quantidade,
      caminho: locais.caminho,
    })
    .from(materiais)
    .leftJoin(locais, eq(locais.id, materiais.localId))
    .where(
      and(
        filtros.grupo ? eq(materiais.grupo, filtros.grupo) : undefined,
        termo ? or(ilike(materiais.nome, termo), ilike(materiais.marcaModelo, termo), ilike(locais.caminho, termo)) : undefined,
      ),
    )
    .orderBy(asc(materiais.grupo), sql`lower(${materiais.nome})`, sql`lower(coalesce(${materiais.marcaModelo}, ''))`, asc(materiais.id));
}

/** Quantos materiais estão cadastrados e quantas unidades há no total. */
export async function resumoDosMateriais(db: Banco): Promise<{ materiais: number; unidades: number }> {
  const [linha] = await db
    .select({ materiais: count(), unidades: sum(materiais.quantidade).mapWith(Number) })
    .from(materiais);
  return { materiais: linha.materiais, unidades: linha.unidades ?? 0 };
}

/** Um material, com o caminho do local e se já teve alguma saída. */
export async function obterMaterial(db: Banco, id: number) {
  const [linha] = await db
    .select({
      id: materiais.id,
      nome: materiais.nome,
      marcaModelo: materiais.marcaModelo,
      grupo: materiais.grupo,
      localId: materiais.localId,
      condicao: materiais.condicao,
      observacoes: materiais.observacoes,
      quantidade: materiais.quantidade,
      caminho: locais.caminho,
    })
    .from(materiais)
    .leftJoin(locais, eq(locais.id, materiais.localId))
    .where(eq(materiais.id, id));
  if (!linha) return null;
  return { ...linha, temSaidas: (await totalDeSaidas(db, id)) > 0 };
}

/** O histórico do material, do mais novo para o mais antigo. */
export async function movimentosDoMaterial(db: Banco, id: number) {
  return db
    .select({
      id: movimentosDeMaterial.id,
      tipo: movimentosDeMaterial.tipo,
      quantidade: movimentosDeMaterial.quantidade,
      saldo: movimentosDeMaterial.saldo,
      observacao: movimentosDeMaterial.observacao,
      criadoEm: movimentosDeMaterial.criadoEm,
      pessoa: { id: colaboradores.id, nome: colaboradores.nome },
    })
    .from(movimentosDeMaterial)
    .leftJoin(colaboradores, eq(colaboradores.id, movimentosDeMaterial.colaboradorId))
    .where(eq(movimentosDeMaterial.materialId, id))
    .orderBy(desc(movimentosDeMaterial.id));
}

/** O que saiu para a pessoa, do mais novo para o mais antigo (para a página dela). */
export async function materiaisDaPessoa(db: Banco, pessoaId: number) {
  return db
    .select({
      id: movimentosDeMaterial.id,
      quantidade: movimentosDeMaterial.quantidade,
      observacao: movimentosDeMaterial.observacao,
      criadoEm: movimentosDeMaterial.criadoEm,
      material: { id: materiais.id, nome: materiais.nome, marcaModelo: materiais.marcaModelo },
    })
    .from(movimentosDeMaterial)
    .innerJoin(materiais, eq(materiais.id, movimentosDeMaterial.materialId))
    .where(eq(movimentosDeMaterial.colaboradorId, pessoaId))
    .orderBy(desc(movimentosDeMaterial.id));
}

// ─── Movimentos ──────────────────────────────────────────────────────────

export type ResultadoDoMovimento =
  | { ok: true; nome: string; saldo: number; pessoa?: string; diferenca?: number }
  | { ok: false; erros: Erros }
  | { ok: false; naoEncontrado: true };

/** Entrada: chegou mais. */
export async function registrarEntrada(
  db: Banco,
  id: number,
  dados: { quantidade: number; observacao: string | null },
): Promise<ResultadoDoMovimento> {
  return db.transaction(async (tx): Promise<ResultadoDoMovimento> => {
    const [material] = await tx
      .update(materiais)
      .set({ quantidade: sql`${materiais.quantidade} + ${dados.quantidade}`, atualizadoEm: sql`now()` })
      .where(and(eq(materiais.id, id), sql`${materiais.quantidade} + ${dados.quantidade} <= 2147483647`))
      .returning({ nome: materiais.nome, saldo: materiais.quantidade });
    if (!material) return { ok: false as const, naoEncontrado: true as const };
    await tx.insert(movimentosDeMaterial).values({ materialId: id, tipo: "entrada", saldo: material.saldo, ...dados });
    return { ok: true as const, nome: material.nome, saldo: material.saldo };
  });
}

/** Saída: saiu do estoque, para uma pessoa ou não. Não deixa sair mais do que tem. */
export async function registrarSaida(
  db: Banco,
  id: number,
  dados: { quantidade: number; colaboradorId: number | null; observacao: string | null },
): Promise<ResultadoDoMovimento> {
  return db.transaction(async (tx): Promise<ResultadoDoMovimento> => {
    let pessoa: string | undefined;
    if (dados.colaboradorId !== null) {
      const [linha] = await tx.select({ nome: colaboradores.nome }).from(colaboradores).where(eq(colaboradores.id, dados.colaboradorId));
      if (!linha) return { ok: false as const, erros: { colaboradorId: PESSOA_INVALIDA } };
      pessoa = linha.nome;
    }
    // A conta e a conferência do saldo acontecem juntas, no banco: duas saídas ao mesmo tempo não passam do que existe.
    const [material] = await tx
      .update(materiais)
      .set({ quantidade: sql`${materiais.quantidade} - ${dados.quantidade}`, atualizadoEm: sql`now()` })
      .where(and(eq(materiais.id, id), sql`${materiais.quantidade} >= ${dados.quantidade}`))
      .returning({ nome: materiais.nome, saldo: materiais.quantidade });
    if (!material) {
      const [atual] = await tx.select({ quantidade: materiais.quantidade }).from(materiais).where(eq(materiais.id, id));
      if (!atual) return { ok: false as const, naoEncontrado: true as const };
      return {
        ok: false as const,
        erros: { quantidade: atual.quantidade === 0 ? "Não há nenhum em estoque." : `Só há ${atual.quantidade} em estoque.` },
      };
    }
    await tx.insert(movimentosDeMaterial).values({ materialId: id, tipo: "saida", saldo: material.saldo, ...dados });
    return { ok: true as const, nome: material.nome, saldo: material.saldo, pessoa };
  });
}

/** Ajuste de contagem: "contei e tem 12". Corrige o saldo e guarda a diferença. */
export async function ajustarContagem(
  db: Banco,
  id: number,
  dados: { contagem: number; observacao: string | null },
): Promise<ResultadoDoMovimento> {
  return db.transaction(async (tx): Promise<ResultadoDoMovimento> => {
    const [atual] = await tx
      .select({ nome: materiais.nome, quantidade: materiais.quantidade })
      .from(materiais)
      .where(eq(materiais.id, id))
      .for("update");
    if (!atual) return { ok: false as const, naoEncontrado: true as const };
    const diferenca = dados.contagem - atual.quantidade;
    if (diferenca === 0) {
      return { ok: false as const, erros: { contagem: `O saldo já é ${atual.quantidade}. Nada para ajustar.` } };
    }
    await tx.update(materiais).set({ quantidade: dados.contagem, atualizadoEm: sql`now()` }).where(eq(materiais.id, id));
    await tx.insert(movimentosDeMaterial).values({
      materialId: id,
      tipo: "ajuste",
      quantidade: diferenca,
      saldo: dados.contagem,
      observacao: dados.observacao,
    });
    return { ok: true as const, nome: atual.nome, saldo: dados.contagem, diferenca };
  });
}
