import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { exigeChannelBinding, lerEnderecoDoBanco } from "./endereco";
import * as schema from "./schema";

type BancoDoSistema = NodePgDatabase<typeof schema> & { $client: Pool };

// Em desenvolvimento, o Next recarrega os arquivos a cada mudança. Guardar a
// conexão aqui evita abrir uma nova a cada recarga.
const memoria = globalThis as typeof globalThis & { __banco?: BancoDoSistema };

/** A conexão com o banco, criada no primeiro uso. */
export function obterBanco(): BancoDoSistema {
  if (!memoria.__banco) {
    const endereco = lerEnderecoDoBanco();
    const pool = new Pool({
      connectionString: endereco,
      enableChannelBinding: exigeChannelBinding(endereco),
      max: 5,
      idleTimeoutMillis: 30_000,
    });
    memoria.__banco = drizzle(pool, { schema });
  }
  return memoria.__banco;
}
