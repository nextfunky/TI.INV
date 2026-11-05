import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { CATEGORIAS, STATUS } from "@/lib/itens/valores";

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow();

/**
 * A conta de login. Existe no máximo uma: o `id` é sempre 1, e o banco
 * recusa qualquer outra linha.
 */
export const contas = pgTable(
  "contas",
  {
    id: integer("id").primaryKey().default(1),
    usuario: text("usuario").notNull(),
    senhaHash: text("senha_hash").notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [check("contas_uma_so", sql`${t.id} = 1`)],
);

/**
 * Sessões abertas (cada navegador em que a conta entrou).
 * O `id` é o SHA-256 do token guardado no cookie: quem lê o banco não
 * consegue usar o valor para entrar.
 */
export const sessoes = pgTable(
  "sessoes",
  {
    id: text("id").primaryKey(),
    contaId: integer("conta_id")
      .notNull()
      .references(() => contas.id, { onDelete: "cascade" }),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index("sessoes_conta_id_idx").on(t.contaId)],
);

export const categoriaDoTipo = pgEnum("categoria_do_tipo", CATEGORIAS);
export const statusDoItem = pgEnum("status_do_item", STATUS);

/**
 * O que o item é: Desktop, Monitor, Impressora...
 * Cada tipo tem o seu prefixo de código e conta os seus números separado.
 */
export const tiposDeItem = pgTable(
  "tipos_de_item",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nome: text("nome").notNull(),
    categoria: categoriaDoTipo("categoria").notNull().default("outro"),
    prefixo: text("prefixo").notNull(),
    /** Nome do ícone (Lucide). Os tipos criados pelo usuário usam "package". */
    icone: text("icone").notNull().default("package"),
    /** Último número de código já usado. Só aumenta, nunca volta. */
    ultimoNumero: integer("ultimo_numero").notNull().default(0),
    criadoEm: criadoEm(),
  },
  (t) => [
    uniqueIndex("tipos_de_item_nome_unico").on(sql`lower(${t.nome})`),
    uniqueIndex("tipos_de_item_prefixo_unico").on(t.prefixo),
    check("tipos_de_item_prefixo_formato", sql`${t.prefixo} ~ '^[A-Z]{2,5}$'`),
    check("tipos_de_item_ultimo_numero_positivo", sql`${t.ultimoNumero} >= 0`),
  ],
);

/** Cada equipamento do inventário. */
export const itens = pgTable(
  "itens",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    codigo: text("codigo").notNull(),
    tipoId: integer("tipo_id")
      .notNull()
      .references(() => tiposDeItem.id, { onDelete: "restrict" }),
    marca: text("marca"),
    modelo: text("modelo"),
    numeroSerie: text("numero_serie"),
    status: statusDoItem("status").notNull().default("em_estoque"),
    // Só para computadores (desktops e notebooks).
    hostname: text("hostname"),
    processador: text("processador"),
    memoriaRam: text("memoria_ram"),
    armazenamento: text("armazenamento"),
    sistemaOperacional: text("sistema_operacional"),
    // Compra e garantia.
    dataCompra: date("data_compra", { mode: "string" }),
    garantiaAte: date("garantia_ate", { mode: "string" }),
    observacoes: text("observacoes"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("itens_codigo_unico").on(t.codigo),
    index("itens_tipo_id_idx").on(t.tipoId),
    index("itens_status_idx").on(t.status),
    index("itens_atualizado_em_idx").on(t.atualizadoEm),
  ],
);
