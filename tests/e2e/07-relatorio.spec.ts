import { expect, test } from "@playwright/test";

import { entrar, NOVA_SENHA, USUARIO, vigiarErros } from "./ajuda";

/**
 * O relatório de conferência: com os filtros da tela ou escolhendo categorias,
 * abre numa aba nova, pronto para imprimir ou salvar em PDF.
 * Roda depois dos outros (há itens, o Cabo HDMI e o Patch Cord da importação).
 */
test.describe.configure({ mode: "serial" });

let erros: string[] = [];

test.beforeEach(async ({ page }) => {
  erros = vigiarErros(page);
  await page.goto("/entrar");
  await entrar(page, USUARIO, NOVA_SENHA);
  await expect(page).toHaveURL(/\/$/);
});

test.afterEach(() => {
  expect(erros).toEqual([]);
});

test("com os filtros da tela: só os periféricos, agrupados por tipo", async ({ page }) => {
  await page.goto("/inventario?categoria=periferico");
  await page.getByRole("button", { name: "Relatório" }).click();
  const janela = page.getByRole("dialog", { name: "Conferência" });
  await expect(janela.getByRole("checkbox", { name: "Itens com código" })).toBeChecked();
  await expect(janela.getByRole("checkbox", { name: "Materiais" })).not.toBeChecked();
  await expect(janela.getByRole("radio", { name: /Usar os filtros da tela/ })).toBeChecked();
  await expect(janela).toContainText("Periféricos");

  const [relatorio] = await Promise.all([page.waitForEvent("popup"), janela.getByRole("button", { name: "Gerar relatório" }).click()]);
  await expect(relatorio).toHaveURL(/\/relatorios\/conferencia\?itens=1.*categoria=periferico/);
  await expect(relatorio.getByRole("heading", { level: 1 })).toHaveText("Conferência de inventário");
  await expect(relatorio.getByText("Categorias: Periféricos · Sem os descartados")).toBeVisible();
  const itens = relatorio.getByRole("region", { name: "Itens" });
  await expect(itens.getByRole("heading", { level: 3 }).first()).toContainText("Monitor");
  await expect(itens.getByRole("heading", { name: /Telefone/ })).toHaveCount(0);
  await expect(itens.getByRole("cell", { name: "MON0001" })).toBeVisible();
  await expect(relatorio.getByRole("region", { name: "Materiais" })).toHaveCount(0);
  await expect(relatorio.getByRole("button", { name: "Imprimir / Salvar PDF" })).toBeVisible();
  await relatorio.close();
});

test("escolhendo as categorias, com os materiais junto", async ({ page }) => {
  await page.goto("/inventario");
  await page.getByRole("button", { name: "Relatório" }).click();
  const janela = page.getByRole("dialog", { name: "Conferência" });
  await janela.getByRole("checkbox", { name: "Materiais" }).check();
  await janela.getByRole("radio", { name: "Escolher as categorias" }).check();
  await janela.getByRole("checkbox", { name: "Telefonia" }).check();
  await janela.getByRole("checkbox", { name: "Rede e rack" }).check();

  const [relatorio] = await Promise.all([page.waitForEvent("popup"), janela.getByRole("button", { name: "Gerar relatório" }).click()]);
  await expect(relatorio.getByText(/Categorias: Telefonia/)).toBeVisible();
  await expect(relatorio.getByText(/Grupos de material: Rede e rack/)).toBeVisible();
  const itens = relatorio.getByRole("region", { name: "Itens" });
  await expect(itens.getByRole("heading", { level: 3 })).toHaveText([/^Telefone/]);
  const materiais = relatorio.getByRole("region", { name: "Materiais" });
  await expect(materiais.getByRole("row", { name: /Patch Cord/ })).toContainText("10");
  await expect(materiais.getByRole("row", { name: /Cabo HDMI/ })).toHaveCount(0);
  await relatorio.close();
});

test("da tela de Materiais, já vem marcado Materiais", async ({ page }) => {
  await page.goto("/materiais");
  await page.getByRole("button", { name: "Relatório" }).click();
  const janela = page.getByRole("dialog", { name: "Conferência" });
  await expect(janela.getByRole("checkbox", { name: "Materiais" })).toBeChecked();
  await expect(janela.getByRole("checkbox", { name: "Itens com código" })).not.toBeChecked();
  // Sem nada marcado, não dá para gerar.
  await janela.getByRole("checkbox", { name: "Materiais" }).uncheck();
  await expect(janela.getByRole("button", { name: "Gerar relatório" })).toBeDisabled();
  await janela.getByRole("checkbox", { name: "Materiais" }).check();
  const [relatorio] = await Promise.all([page.waitForEvent("popup"), janela.getByRole("button", { name: "Gerar relatório" }).click()]);
  await expect(relatorio.getByRole("region", { name: "Materiais" }).getByRole("row", { name: /Cabo HDMI/ })).toBeVisible();
  await expect(relatorio.getByRole("region", { name: "Itens" })).toHaveCount(0);
  await relatorio.close();
});

test("no celular (390px), a janela e o relatório não rolam para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/relatorios/conferencia?itens=1&materiais=1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // A tabela pode rolar dentro da folha, mas a página não.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
