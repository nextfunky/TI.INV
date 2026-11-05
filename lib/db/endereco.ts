/**
 * Lê o endereço do banco (DATABASE_URL) e o deixa pronto para o driver `pg`.
 *
 * O Neon entrega o endereço com `sslmode=require`. O `pg` já trata esse modo
 * como `verify-full` (conexão criptografada e certificado conferido), mas
 * mostra um aviso a cada conexão pedindo que isso fique explícito. Aqui
 * fazemos exatamente o que o aviso pede: mesmo comportamento, sem o aviso.
 */
export const MENSAGEM_SEM_BANCO =
  "Falta o DATABASE_URL. Copie o arquivo .env.example para .env.local e cole nele o endereço do banco do Neon (veja o README).";

export function lerEnderecoDoBanco(valor = process.env.DATABASE_URL): string {
  const texto = valor?.trim();
  if (!texto) {
    throw new Error(MENSAGEM_SEM_BANCO);
  }

  let endereco: URL;
  try {
    endereco = new URL(texto);
  } catch {
    throw new Error(
      "O DATABASE_URL não é um endereço válido. Copie de novo o endereço do Neon, começando por postgresql://",
    );
  }

  if (endereco.protocol !== "postgresql:" && endereco.protocol !== "postgres:") {
    throw new Error("O DATABASE_URL precisa começar por postgresql://");
  }

  const modo = endereco.searchParams.get("sslmode");
  if (modo === "require" || modo === "prefer" || modo === "verify-ca") {
    endereco.searchParams.set("sslmode", "verify-full");
  }

  return endereco.toString();
}

/** O Neon pede `channel_binding=require`: uma proteção extra no login do banco. */
export function exigeChannelBinding(endereco: string): boolean {
  return new URL(endereco).searchParams.get("channel_binding") === "require";
}
