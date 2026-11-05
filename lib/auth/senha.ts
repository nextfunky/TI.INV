import { hash, verify } from "@node-rs/argon2";

// Argon2id com os parâmetros mínimos recomendados pela OWASP
// (19 MiB de memória, 2 passadas, 1 linha de execução).
const OPCOES = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function gerarHashDaSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES);
}

export async function senhaConfere(hashGuardado: string, senha: string): Promise<boolean> {
  try {
    return await verify(hashGuardado, senha);
  } catch {
    return false;
  }
}

let hashFalso: Promise<string> | undefined;

/**
 * Faz uma verificação "de mentira" quando o usuário digitado não existe,
 * para que a resposta demore o mesmo tempo nos dois casos. Assim não dá
 * para descobrir o nome da conta pelo tempo de resposta.
 */
export async function gastarTempoDeVerificacao(senha: string): Promise<void> {
  hashFalso ??= gerarHashDaSenha("senha-que-nunca-sera-usada");
  await senhaConfere(await hashFalso, senha);
}
