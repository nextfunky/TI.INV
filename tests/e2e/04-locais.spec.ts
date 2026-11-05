import { expect, test, type Page } from "@playwright/test";

import { entrar, NOVA_SENHA, USUARIO, vigiarErros } from "./ajuda";

/**
 * O fluxo da Etapa 4: a árvore de locais, o local da pessoa e dos itens sem
 * usuário, a página do local ("Trazer pessoas" e "Trazer itens") e o filtro.
 * Roda depois de 03-colaboradores (João Lima tem MOU0001 e TEC0002; Carla Dias
 * tem MON0001 e NTB0001; Ana Paula e DSK0001 estão livres).
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

const salvar = (page: Page) => page.getByRole("button", { name: "Salvar", exact: true }).click();
const aviso = (page: Page) => page.getByRole("status");

async function novoLocal(page: Page, nome: string, dentroDe?: string) {
  await page.goto("/locais/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  if (dentroDe) await page.getByLabel("Dentro de").selectOption({ label: dentroDe });
  await salvar(page);
  await expect(page).toHaveURL(/\/locais$/);
}

test("monta a árvore de locais", async ({ page }) => {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Locais" }).click();
  await expect(page).toHaveURL(/\/locais$/);
  await expect(page.getByRole("heading", { name: "Nenhum local cadastrado" })).toBeVisible();

  await novoLocal(page, "Filial 04");
  await expect(aviso(page)).toHaveText("Filial 04 cadastrado.");

  // "+ Dentro" já escolhe o local de cima.
  await page.getByRole("listitem").filter({ hasText: "Filial 04" }).hover();
  await page.getByRole("link", { name: "+ Dentro" }).click();
  await expect(page.getByLabel("Dentro de").locator("option:checked")).toHaveText("Filial 04");
  await page.getByLabel("Nome", { exact: true }).fill("Estoque da TI");
  await salvar(page);
  await expect(aviso(page)).toHaveText("Filial 04 › Estoque da TI cadastrado.");

  await novoLocal(page, "2º andar", "Filial 04");
  await novoLocal(page, "Financeiro", "Filial 04 › 2º andar");
  await novoLocal(page, "Filial 03");

  await page.goto("/locais/novo");
  await page.getByLabel("Nome", { exact: true }).fill("FINANCEIRO");
  await page.getByLabel("Dentro de").selectOption({ label: "Filial 04 › 2º andar" });
  await salvar(page);
  await expect(page.getByText("Já existe um local com este nome aqui.")).toBeVisible();

  await page.goto("/locais");
  await expect(page.getByRole("listitem")).toHaveText([/Filial 03/, /Filial 04/, /2º andar/, /Financeiro/, /Estoque da TI/]);
});

test("um local não pode ficar dentro dele mesmo", async ({ page }) => {
  await page.goto("/locais");
  await page.getByRole("link", { name: "Filial 04", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Filial 04");
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page).toHaveURL(/\/locais\/\d+\/editar$/);
  await expect(page.getByLabel("Dentro de").locator("option")).toHaveText(["Nenhum (local principal)", "Filial 03"]);
});

test("a pessoa ganha um local, e os itens dela ficam lá", async ({ page }) => {
  await page.goto("/colaboradores");
  await page.getByRole("link", { name: /João Lima/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("João Lima");
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Local").selectOption({ label: "Filial 04 › 2º andar › Financeiro" });
  await salvar(page);
  await expect(page.getByRole("link", { name: "Filial 04 › 2º andar › Financeiro" })).toBeVisible();

  await page.goto("/inventario/MOU0001");
  const lateral = page.getByRole("complementary");
  await expect(lateral.getByRole("link", { name: "Financeiro" })).toBeVisible();
  await expect(lateral.getByText("Onde João Lima está.")).toBeVisible();
});

test("o item sem usuário tem local próprio; com usuário, fica onde a pessoa está", async ({ page }) => {
  await page.goto("/inventario/DSK0001/editar");
  await page.getByLabel("Local").selectOption({ label: "Filial 04 › Estoque da TI" });
  await salvar(page);
  await expect(page).toHaveURL(/\/inventario\/DSK0001$/);
  await expect(page.getByRole("complementary").getByRole("link", { name: "Estoque da TI" })).toBeVisible();

  await page.goto("/inventario/DSK0001/editar");
  await page.getByLabel("Usuário").selectOption({ label: "Carla Dias" });
  await expect(page.getByLabel("Local")).toHaveCount(0);
  await expect(page.getByText("Fica onde a pessoa está (ela ainda não tem local definido).")).toBeVisible();
  await page.getByLabel("Usuário").selectOption({ label: "João Lima" });
  await expect(page.getByText("Fica onde a pessoa está: Filial 04 › 2º andar › Financeiro")).toBeVisible();
});

test("na página do local, traz várias pessoas e itens de uma vez", async ({ page }) => {
  await page.goto("/locais");
  await page.getByRole("link", { name: "Financeiro" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Financeiro");

  await page.getByRole("button", { name: "Trazer pessoas" }).click();
  const janela = page.getByRole("dialog", { name: "Trazer pessoas para Financeiro" });
  await janela.getByRole("checkbox", { name: /Ana Paula/ }).check();
  await janela.getByRole("checkbox", { name: /Carla Dias/ }).check();
  await janela.getByRole("button", { name: "Trazer 2 pessoas" }).click();
  await expect(aviso(page)).toHaveText("2 pessoas agora em Filial 04 › 2º andar › Financeiro.");
  await expect(page.getByText("Filial 04 › 2º andar · 3 pessoas · 0 itens sem usuário")).toBeVisible();

  // Um teclado novo, sem usuário e sem local, vai para o estoque pela página do local.
  await page.goto("/inventario/novo");
  await page.getByLabel("Tipo").selectOption({ label: "Teclado" });
  await salvar(page);
  await expect(page).toHaveURL(/\/inventario\/TEC0003$/);

  await page.goto("/locais");
  await page.getByRole("link", { name: "Estoque da TI" }).click();
  await page.getByRole("button", { name: "Trazer itens" }).click();
  const itens = page.getByRole("dialog", { name: "Trazer itens para Estoque da TI" });
  await expect(itens.getByRole("checkbox")).toHaveCount(1); // os itens com usuário não aparecem
  await itens.getByRole("checkbox", { name: /TEC0003/ }).check();
  await itens.getByRole("button", { name: "Trazer item" }).click();
  await expect(aviso(page)).toHaveText("1 item agora em Filial 04 › Estoque da TI.");
  await expect(page.getByRole("row", { name: /TEC0003/ })).toBeVisible();
});

test("o Inventário filtra por local, incluindo os de dentro", async ({ page }) => {
  await page.goto("/inventario");
  await expect(page.getByRole("columnheader", { name: "Usuário e local" })).toBeVisible();
  await page.getByLabel("Local", { exact: true }).selectOption({ label: "Filial 04" });
  await expect(page).toHaveURL(/local=\d+/);
  await expect(page.getByRole("row")).toHaveCount(7); // cabeçalho + os 6 itens (todos na Filial 04)

  await page.getByLabel("Local", { exact: true }).selectOption({ label: "Filial 04 › Estoque da TI" });
  await expect(page.getByRole("row")).toHaveCount(3);

  await page.getByLabel("Local", { exact: true }).selectOption({ label: "Sem local definido" });
  await expect(page).toHaveURL(/local=sem/);
  await expect(page.getByRole("heading", { name: "Nenhum item encontrado" })).toBeVisible();
});

test("renomear atualiza o caminho, e só exclui local vazio", async ({ page }) => {
  await page.goto("/locais");
  await page.getByRole("link", { name: "2º andar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("2º andar");
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Segundo andar");
  await salvar(page);
  await expect(aviso(page)).toHaveText("Alterações salvas.");
  await expect(page.getByRole("link", { name: "Financeiro" })).toBeVisible();

  await page.goto("/colaboradores");
  await expect(page.getByRole("link", { name: /João Lima/ })).toContainText("Filial 04 › Segundo andar › Financeiro");

  await page.goto("/locais");
  await expect(page.getByRole("listitem").filter({ hasText: "Filial 04" }).first().getByRole("button", { name: "Excluir" })).toHaveCount(0);
  const filial03 = page.getByRole("listitem").filter({ hasText: "Filial 03" });
  await filial03.hover();
  await filial03.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("dialog", { name: "Excluir local" }).getByRole("button", { name: "Excluir" }).click();
  await expect(aviso(page)).toHaveText("Filial 03 excluído.");
  await expect(page.getByRole("link", { name: "Filial 03" })).toHaveCount(0);
});

test("no celular (390px), as telas de locais não rolam para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/locais");
  await page.getByRole("link", { name: "Financeiro" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Financeiro");
  const local = page.url();
  for (const caminho of ["/locais", local, `${local}/editar`, "/inventario", "/inventario/MOU0001"]) {
    await page.goto(caminho);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), caminho).toBeLessThanOrEqual(390);
  }
});
