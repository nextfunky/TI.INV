import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();

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
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
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
