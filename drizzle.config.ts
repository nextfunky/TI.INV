import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { lerEnderecoDoBanco } from "./lib/db/endereco";

// Lê o .env.local do mesmo jeito que o Next.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: lerEnderecoDoBanco() },
});
