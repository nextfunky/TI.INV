import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { lerEnderecoDoBanco } from "../../lib/db/endereco";

/** Antes dos testes de navegador: apaga o banco de testes e o recria do zero. */
export default async function prepararBanco() {
  loadEnvConfig(process.cwd());

  const teste = process.env.E2E_DATABASE_URL;
  if (!teste) {
    throw new Error(
      "Para os testes de navegador, defina E2E_DATABASE_URL com um banco SÓ para testes. Ele é apagado a cada rodada.",
    );
  }
  if (teste === process.env.DATABASE_URL) {
    throw new Error("E2E_DATABASE_URL não pode ser o mesmo banco do DATABASE_URL: os testes apagam tudo.");
  }

  const pool = new Pool({ connectionString: lerEnderecoDoBanco(teste), max: 1 });
  try {
    await pool.query("drop schema if exists drizzle cascade; drop schema public cascade; create schema public;");
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  } finally {
    await pool.end();
  }
}
