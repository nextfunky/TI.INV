import { describe, expect, it } from "vitest";

import { destinoSeguro } from "@/lib/auth/destino";
import { errosPorCampo, regrasAlterarSenha, regrasEntrar, regrasPrimeiroAcesso } from "@/lib/auth/regras";
import { exigeChannelBinding, lerEnderecoDoBanco, MENSAGEM_SEM_BANCO } from "@/lib/db/endereco";

function erros(resultado: { success: boolean; error?: unknown }) {
  if (resultado.success) return {};
  return errosPorCampo(resultado.error as Parameters<typeof errosPorCampo>[0]);
}

describe("formulário de primeiro acesso", () => {
  it("tira os espaços e deixa o usuário em minúsculas", () => {
    const r = regrasPrimeiroAcesso.safeParse({
      usuario: "  Pedro.Martins ",
      senha: "senha-forte-1",
      confirmacao: "senha-forte-1",
    });
    expect(r.success && r.data.usuario).toBe("pedro.martins");
  });

  it("explica cada problema no campo certo", () => {
    const r = regrasPrimeiroAcesso.safeParse({ usuario: "pé", senha: "123", confirmacao: "456" });
    expect(erros(r)).toEqual({
      usuario: "Use pelo menos 3 caracteres.",
      senha: "Use no mínimo 8 caracteres.",
      confirmacao: "As senhas não são iguais.",
    });
  });

  it("não aceita acentos nem espaços no usuário", () => {
    const r = regrasPrimeiroAcesso.safeParse({ usuario: "joão lima", senha: "senha-forte-1", confirmacao: "senha-forte-1" });
    expect(erros(r).usuario).toBe("Use só letras sem acento, números, ponto, hífen ou sublinhado.");
  });

  it("pede o usuário quando está vazio", () => {
    const r = regrasPrimeiroAcesso.safeParse({ usuario: "   ", senha: "senha-forte-1", confirmacao: "senha-forte-1" });
    expect(erros(r).usuario).toBe("Informe o usuário.");
  });
});

describe("formulário de entrada", () => {
  it("pede usuário e senha", () => {
    expect(erros(regrasEntrar.safeParse({ usuario: "", senha: "" }))).toEqual({
      usuario: "Informe o usuário.",
      senha: "Informe a senha.",
    });
  });

  it("aceita o usuário com maiúsculas e espaços", () => {
    const r = regrasEntrar.safeParse({ usuario: " PEDRO.MARTINS ", senha: "x" });
    expect(r.success && r.data.usuario).toBe("pedro.martins");
  });
});

describe("formulário de alterar senha", () => {
  it("confere a confirmação", () => {
    const r = regrasAlterarSenha.safeParse({ senhaAtual: "a", novaSenha: "nova-senha-2", confirmacao: "outra" });
    expect(erros(r)).toEqual({ confirmacao: "As senhas não são iguais." });
  });
});

describe("volta depois de entrar", () => {
  it("aceita páginas do próprio sistema", () => {
    expect(destinoSeguro("/configuracoes/senha")).toBe("/configuracoes/senha");
    expect(destinoSeguro("/inventario?status=em_uso")).toBe("/inventario?status=em_uso");
  });

  it("recusa endereços de fora e volta para o Início", () => {
    for (const valor of ["https://outro.site", "//outro.site", "/\\outro.site", "javascript:alert(1)", "", undefined, ["/x"]]) {
      expect(destinoSeguro(valor)).toBe("/");
    }
  });

  it("não volta para a própria tela de entrada", () => {
    expect(destinoSeguro("/entrar")).toBe("/");
    expect(destinoSeguro("/primeiro-acesso")).toBe("/");
  });
});

describe("endereço do banco", () => {
  it("explica o que fazer quando falta", () => {
    expect(() => lerEnderecoDoBanco("")).toThrow(MENSAGEM_SEM_BANCO);
    expect(() => lerEnderecoDoBanco(undefined)).toThrow(MENSAGEM_SEM_BANCO);
  });

  it("recusa um endereço que não é de Postgres", () => {
    expect(() => lerEnderecoDoBanco("isso não é um endereço")).toThrow(/não é um endereço válido/);
    expect(() => lerEnderecoDoBanco("mysql://u:p@h/db")).toThrow(/postgresql:\/\//);
  });

  it("aceita o endereço do Neon como ele vem, com a conexão segura explícita", () => {
    const neon = "postgresql://u:p@ep-x.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    const lido = new URL(lerEnderecoDoBanco(neon));
    expect(lido.searchParams.get("sslmode")).toBe("verify-full");
    expect(lido.searchParams.get("channel_binding")).toBe("require");
    expect(exigeChannelBinding(lido.toString())).toBe(true);
  });

  it("não mexe num banco local sem SSL", () => {
    expect(lerEnderecoDoBanco("postgresql://u:p@127.0.0.1:5432/db")).toBe("postgresql://u:p@127.0.0.1:5432/db");
  });
});
