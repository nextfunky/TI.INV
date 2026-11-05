import { expect, test, type Page } from "@playwright/test";

import { entrar, NOVA_SENHA, USUARIO, vigiarErros } from "./ajuda";

/**
 * A importação de planilha: prévia com os problemas, prévia sem problemas,
 * importar e não deixar o mesmo arquivo entrar duas vezes.
 * Roda depois de 05-materiais (existem Matriz › Estoque da TI e a Ana Paula).
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

const CERTA = "tests/e2e/arquivos/importacao-certa.xlsx";
const COM_ERROS = "tests/e2e/arquivos/importacao-com-erros.xlsx";
const escolher = (page: Page, arquivo: string) => page.getByLabel(/Escolher (planilha|outro arquivo)/).setInputFiles(arquivo);

test("mostra os problemas da planilha sem gravar nada", async ({ page }) => {
  await page.goto("/inventario");
  await page.getByRole("link", { name: "Importação" }).click();
  await expect(page).toHaveURL(/\/inventario\/importar$/);
  await expect(page.getByRole("link", { name: "Baixar modelo vazio" })).toHaveAttribute("href", "/modelo-de-importacao.xlsx");

  await escolher(page, COM_ERROS);
  const problemas = page.getByRole("region", { name: /problemas para corrigir/ });
  await expect(problemas.getByRole("heading")).toHaveText("2 problemas para corrigir");
  await expect(problemas.getByRole("row", { name: /Tipo “Telefonee” não existe/ })).toContainText("Itens");
  await expect(problemas.getByRole("row", { name: /Status “Estocado” não existe/ })).toContainText("3");
  await expect(page.getByRole("button", { name: "Importar" })).toHaveCount(0);
});

test("lê a planilha, mostra a prévia e importa tudo", async ({ page }) => {
  await page.goto("/inventario/importar");
  await escolher(page, CERTA);
  const pronto = page.getByRole("region", { name: "Pronto para importar" });
  await expect(pronto).toContainText("4 itens");
  await expect(pronto).toContainText("2 Telefone · 1 Desktop · 1 Monitor");
  await expect(pronto).toContainText("1 material, 10 unidades");
  await expect(pronto).toContainText("Filial 05");
  await expect(pronto).toContainText("Pessoa Nova Teste");

  await pronto.getByRole("button", { name: "Importar" }).click();
  await expect(page).toHaveURL(/\/inventario$/);
  await expect(page.getByRole("status")).toHaveText("Importação concluída: 4 itens e 1 material.");

  await page.goto("/inventario/TEL0002");
  await expect(page.getByRole("complementary", { name: "Detalhes de TEL0002" })).toContainText("Cisco CP-7821");
  await page.goto("/colaboradores");
  await expect(page.getByRole("link", { name: /Pessoa Nova Teste/ })).toContainText("1 item");
  await page.goto("/materiais?q=cat 6 azul");
  await expect(page.getByRole("row", { name: /Patch Cord/ })).toContainText("Filial 05");
});

test("o mesmo arquivo não entra duas vezes", async ({ page }) => {
  await page.goto("/inventario/importar");
  await escolher(page, CERTA);
  const problemas = page.getByRole("region", { name: /para corrigir/ });
  await expect(problemas).toContainText("Este arquivo já foi importado em");
  await expect(page.getByRole("button", { name: "Importar" })).toHaveCount(0);
});

test("no celular (390px), a importação não rola para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inventario/importar");
  await escolher(page, COM_ERROS);
  await expect(page.getByRole("region", { name: /problemas para corrigir/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
