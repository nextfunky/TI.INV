import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { SEM_VALOR, type FiltrosDeCaracteristicas } from "./filtros";

/** As condições dos filtros por característica, numa coluna de valores (jsonb). */
export function condicoesDasCaracteristicas(coluna: AnyPgColumn, filtros: FiltrosDeCaracteristicas | undefined): SQL[] {
  return Object.entries(filtros ?? {}).map(([id, valor]) =>
    valor === SEM_VALOR ? sql`(${coluna} ->> ${id}) is null` : sql`(${coluna} ->> ${id}) = ${valor}`,
  );
}

/** Todos os valores das características juntos, para a busca ("magenta" acha o toner Magenta). */
export function textoDasCaracteristicas(coluna: AnyPgColumn): SQL<string> {
  return sql<string>`coalesce((select string_agg(value, ' ') from jsonb_each_text(${coluna})), '')`;
}
