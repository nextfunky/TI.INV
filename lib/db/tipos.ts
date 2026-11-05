import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/**
 * Qualquer banco Postgres acessado pelo Drizzle: o do Neon (no sistema) ou
 * um banco em memória (nos testes automáticos). As regras recebem o banco
 * como parâmetro, então funcionam igual nos dois.
 */
export type Banco = PgDatabase<PgQueryResultHKT, typeof schema>;
