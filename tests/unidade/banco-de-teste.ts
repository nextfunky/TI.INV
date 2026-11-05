import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/lib/db/schema";
import type { Banco } from "@/lib/db/tipos";

/**
 * Um Postgres de verdade, só que na memória e apagado no fim do teste.
 * Recebe as mesmas migrations do banco do sistema.
 */
export async function criarBancoDeTeste(): Promise<{ db: Banco; fechar: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db, fechar: () => client.close() };
}
