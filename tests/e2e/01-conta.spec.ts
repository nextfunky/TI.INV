import { expect, test } from "@playwright/test";

import { entrar, NOVA_SENHA, SENHA, USUARIO, vigiarErros } from "./ajuda";

/**
 * O fluxo da conta (Etapa 1), na ordem em que acontece de verdade:
 * primeiro acesso → Início → alterar senha → sair → entrar de novo.
 * O banco começa vazio (veja preparar-banco.ts).
 */
test.describe.configure({ mode: "serial" });

test("sem conta, qualquer página leva ao primeiro acesso", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/primeiro-acesso$/);
  await expect(page.getByRole("heading", { name: "Crie a conta de acesso" })).toBeVisible();
  await expect(page).toHaveTitle("Primeiro acesso · Inventário de TI");
});

test("o primeiro acesso explica os erros e cria a conta", async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto("/primeiro-acesso");

  await page.getByLabel("Usuário").fill("pé");
  await page.getByLabel("Senha", { exact: true }).fill("123");
  await page.getByLabel("Confirmar senha").fill("456");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Confira os campos destacados abaixo.")).toBeVisible();
  await expect(page.getByText("Use pelo menos 3 caracteres.")).toBeVisible();
  await expect(page.getByText("As senhas não são iguais.")).toBeVisible();
  await expect(page.getByLabel("Usuário")).toBeFocused();

  await page.getByLabel("Usuário").fill("Pedro.Martins");
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByLabel("Confirmar senha").fill(SENHA);
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("status")).toHaveText("Conta criada.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bom dia|Boa tarde|Boa noite)$/);
  await expect(page).toHaveTitle("Início · Inventário de TI");
  expect(erros).toEqual([]);
});

test("depois de criada a conta, o primeiro acesso não abre mais", async ({ page }) => {
  await page.goto("/primeiro-acesso");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("sem login, a página pedida leva à entrada e volta depois", async ({ page }) => {
  await page.goto("/configuracoes/senha");
  await expect(page).toHaveURL(/\/entrar\?para=%2Fconfiguracoes%2Fsenha$/);
  await expect(page).toHaveTitle("Entrar · Inventário de TI");

  await entrar(page, USUARIO, "senha-errada");
  await expect(page.getByText("Usuário ou senha inválidos.")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeFocused();

  // Maiúsculas e espaços no usuário não atrapalham.
  await entrar(page, "  PEDRO.MARTINS ", SENHA);
  await expect(page).toHaveURL(/\/configuracoes\/senha$/);
  await expect(page.getByRole("heading", { name: "Alterar senha" })).toBeVisible();
});

test("o topo mostra os três botões e o menu da conta", async ({ page }) => {
  await page.goto("/entrar");
  await entrar(page, USUARIO, SENHA);
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("link", { name: "Ver inventário" })).toHaveAttribute("href", "/inventario");
  await expect(page.getByRole("button", { name: "Editar item" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Novo item" })).toHaveAttribute("href", "/inventario/novo");

  await page.getByRole("button", { name: `Conta: ${USUARIO}` }).click();
  await expect(page.getByText(`Conectado como ${USUARIO}`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Tipos de item" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Alterar senha" })).toBeHidden();
});

test("alterar senha confere a senha atual e troca a senha", async ({ page }) => {
  await page.goto("/entrar");
  await entrar(page, USUARIO, SENHA);
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: `Conta: ${USUARIO}` }).click();
  await page.getByRole("link", { name: "Alterar senha" }).click();
  await expect(page).toHaveURL(/\/configuracoes\/senha$/);

  await page.getByLabel("Senha atual").fill("errada-123");
  await page.getByLabel("Nova senha", { exact: true }).fill(NOVA_SENHA);
  await page.getByLabel("Confirmar nova senha").fill(NOVA_SENHA);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Senha atual incorreta.")).toBeVisible();

  await page.getByLabel("Senha atual").fill(SENHA);
  await page.getByLabel("Nova senha", { exact: true }).fill(NOVA_SENHA);
  await page.getByLabel("Confirmar nova senha").fill(NOVA_SENHA);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("status")).toHaveText("Senha alterada.");
});

test("sair encerra a sessão e a senha antiga não vale mais", async ({ page }) => {
  await page.goto("/entrar");
  await entrar(page, USUARIO, NOVA_SENHA);
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: `Conta: ${USUARIO}` }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);

  await entrar(page, USUARIO, SENHA);
  await expect(page.getByText("Usuário ou senha inválidos.")).toBeVisible();
});

test("no celular (390px), nada rola para o lado", async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await contexto.newPage();
  const erros = vigiarErros(page);

  await page.goto("/entrar");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await entrar(page, USUARIO, NOVA_SENHA);
  await expect(page).toHaveURL(/\/$/);
  for (const caminho of ["/", "/configuracoes/senha"]) {
    await page.goto(caminho);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  expect(erros).toEqual([]);
  await contexto.close();
});
