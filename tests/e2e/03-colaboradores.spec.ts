import { expect, test, type Page } from "@playwright/test";

import { entrar, NOVA_SENHA, USUARIO, vigiarErros } from "./ajuda";

/**
 * O fluxo da Etapa 3: colaboradores, o campo Usuário no item, a página da
 * pessoa, o "Também com…" e os filtros novos do Inventário.
 * Roda depois de 02-itens (já existem DSK0001, MON0001, NTB0001 e TEC0002).
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

test("cadastra uma pessoa e recusa o nome repetido", async ({ page }) => {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Colaboradores" }).click();
  await expect(page).toHaveURL(/\/colaboradores$/);
  await expect(page.getByRole("heading", { name: "Nenhum colaborador cadastrado" })).toBeVisible();

  await page.getByRole("link", { name: "Novo colaborador" }).first().click();
  await expect(page).toHaveURL(/\/colaboradores\/novo$/);
  await page.getByLabel("Nome", { exact: true }).fill("  Ana   Paula ");
  await salvar(page);
  await expect(aviso(page)).toHaveText("Cadastro de Ana Paula criado.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ana Paula");
  await expect(page.getByText("Nenhum item com esta pessoa").first()).toBeVisible();

  await page.goto("/colaboradores/novo");
  await page.getByLabel("Nome", { exact: true }).fill("ANA PAULA");
  await salvar(page);
  await expect(page.getByText("Já existe um colaborador com este nome.")).toBeVisible();
});

test("escolher a pessoa num item em estoque passa o status para Em uso", async ({ page }) => {
  await page.goto("/inventario/MON0001/editar");
  await expect(page.getByLabel("Status")).toHaveValue("em_estoque");
  await page.getByLabel("Usuário").selectOption({ label: "Ana Paula" });
  await expect(page.getByLabel("Status")).toHaveValue("em_uso");
  await page.getByLabel("Condição").selectOption("bom");
  await salvar(page);

  await expect(page).toHaveURL(/\/inventario\/MON0001$/);
  const cartao = page.getByRole("complementary");
  await expect(cartao.getByRole("link", { name: "Ana Paula" })).toBeVisible();
  await expect(cartao.getByText("Nenhum outro item com esta pessoa.")).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: /^Bom$/ })).toBeVisible();
});

test("'+ Novo colaborador' cadastra sem sair do formulário de item", async ({ page }) => {
  await page.goto("/inventario/novo");
  await page.getByLabel("Tipo").selectOption({ label: "Mouse" });
  await page.getByLabel("Marca").fill("Logitech");

  await page.getByRole("button", { name: "+ Novo colaborador" }).click();
  const janela = page.getByRole("dialog", { name: "Novo colaborador" });
  await janela.getByLabel("Nome").fill("ana paula");
  await janela.getByRole("button", { name: "Cadastrar" }).click();
  await expect(janela.getByText("Já existe um colaborador com este nome.")).toBeVisible();

  await janela.getByLabel("Nome").fill("João Lima");
  await janela.getByRole("button", { name: "Cadastrar" }).click();
  await expect(janela).toBeHidden();
  await expect(aviso(page)).toHaveText("Cadastro de João Lima criado.");
  await expect(page.getByLabel("Usuário")).toHaveValue(/\d+/);
  await expect(page.getByLabel("Usuário").locator("option:checked")).toHaveText("João Lima");
  await expect(page.getByLabel("Status")).toHaveValue("em_uso");
  await expect(page.getByLabel("Marca")).toHaveValue("Logitech"); // nada se perdeu

  await salvar(page);
  await expect(page).toHaveURL(/\/inventario\/MOU0001$/);
  await expect(page.getByRole("complementary").getByRole("link", { name: "João Lima" })).toBeVisible();
});

test("'Também com' e a página da pessoa mostram os itens dela", async ({ page }) => {
  await page.goto("/inventario/TEC0002/editar");
  await page.getByLabel("Usuário").selectOption({ label: "João Lima" });
  await salvar(page);
  await expect(page).toHaveURL(/\/inventario\/TEC0002$/);

  await page.goto("/inventario/MOU0001");
  const lateral = page.getByRole("complementary");
  await expect(lateral.getByText("Também com João Lima · 1")).toBeVisible();
  await expect(lateral.getByRole("link", { name: /TEC0002/ })).toBeVisible();
  await lateral.getByRole("link", { name: "Ver tudo com João Lima" }).click();

  await expect(page).toHaveURL(/\/colaboradores\/\d+$/);
  await expect(page.getByText("2 itens com esta pessoa")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Excluir" })).toHaveCount(0);

  await page.getByRole("link", { name: "Ver no inventário" }).click();
  await expect(page).toHaveURL(/\/inventario\?pessoa=\d+$/);
  await expect(page.getByRole("link", { name: "Tirar o filtro: com João Lima" })).toBeVisible();
  await expect(page.getByText("Mostrando 2 de")).toBeVisible();
  await page.getByRole("link", { name: "Tirar o filtro: com João Lima" }).click();
  await expect(page).toHaveURL(/\/inventario$/);
});

test("a busca na lista, o tipo e a condição filtram o Inventário", async ({ page }) => {
  await page.goto("/inventario");
  await expect(page.getByRole("columnheader", { name: "Usuário" })).toBeVisible();

  const busca = page.getByRole("searchbox", { name: "Buscar na lista" });
  await busca.fill("joão");
  await busca.press("Enter");
  await expect(page).toHaveURL(/\/inventario\?q=jo%C3%A3o$/);
  await expect(page.getByRole("row")).toHaveCount(3);

  await page.getByLabel("Tipo", { exact: true }).selectOption({ label: "Mouse" });
  await expect(page).toHaveURL(/q=jo%C3%A3o&tipo=\d+/);
  await expect(page.getByRole("row")).toHaveCount(2);

  await page.getByRole("button", { name: "Limpar a busca" }).click();
  await expect(page).toHaveURL(/\/inventario\?tipo=\d+$/);

  await page.goto("/inventario");
  await page.getByLabel("Condição").selectOption("bom");
  await expect(page).toHaveURL(/condicao=bom/);
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(page.getByRole("cell", { name: "MON0001" })).toBeVisible();
});

test("tirar a pessoa de um item em uso volta o status para Em estoque", async ({ page }) => {
  await page.goto("/inventario/TEC0002/editar");
  await expect(page.getByLabel("Status")).toHaveValue("em_uso");
  await page.getByLabel("Usuário").selectOption({ label: "Sem usuário" });
  await expect(page.getByLabel("Status")).toHaveValue("em_estoque");
});

test("a busca rápida mostra com quem está, e o Início conta as pessoas", async ({ page }) => {
  await expect(page.getByRole("region", { name: "Resumo" }).getByText("com 2 colaboradores")).toBeVisible();

  await page.keyboard.press("Control+k");
  const campo = page.getByRole("combobox", { name: "Buscar item para editar" });
  await campo.fill("ana paula");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option")).toContainText("Ana Paula");
});

test("só exclui quem não tem itens", async ({ page }) => {
  await page.goto("/colaboradores/novo");
  await page.getByLabel("Nome", { exact: true }).fill("Pessoa Teste");
  await salvar(page);
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/colaboradores$/);
  await expect(aviso(page)).toHaveText("Cadastro de Pessoa Teste excluído.");

  await page.getByRole("searchbox", { name: "Buscar pelo nome" }).fill("joão");
  await page.getByRole("searchbox", { name: "Buscar pelo nome" }).press("Enter");
  await expect(page.getByRole("link", { name: /João Lima/ })).toContainText("2 itens");
});

test("na página da pessoa, vincula vários itens de uma vez e devolve", async ({ page }) => {
  await page.goto("/colaboradores/novo");
  await page.getByLabel("Nome", { exact: true }).fill("Carla Dias");
  await salvar(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Carla Dias");

  await expect(page.getByRole("button", { name: "Vincular itens" })).toHaveCount(1);
  await page.getByRole("button", { name: "Vincular itens" }).click();
  const janela = page.getByRole("dialog", { name: "Vincular itens a Carla Dias" });
  await expect(janela.getByRole("listitem").first()).toContainText("DSK0001"); // os livres vêm primeiro
  await expect(janela.getByText("Com Ana Paula")).toBeVisible();

  await janela.getByRole("checkbox", { name: /DSK0001/ }).check();
  await janela.getByRole("checkbox", { name: /NTB0001/ }).check();
  await janela.getByRole("checkbox", { name: /MON0001/ }).check();
  await expect(janela.getByText("3 itens escolhidos · 1 sai de outra pessoa")).toBeVisible();

  // A busca muda a lista, mas os escolhidos continuam escolhidos.
  await janela.getByRole("searchbox", { name: "Buscar" }).fill("mou");
  await expect(janela.getByRole("checkbox")).toHaveCount(1);
  await expect(janela.getByText("3 itens escolhidos")).toBeVisible();

  await janela.getByRole("button", { name: "Vincular 3 itens" }).click();
  await expect(janela).toBeHidden();
  await expect(aviso(page)).toHaveText("3 itens agora estão com Carla Dias.");
  await expect(page.getByText("3 itens com esta pessoa")).toBeVisible();
  await expect(page.getByRole("row", { name: /NTB0001/ })).toContainText("Em manutenção"); // manutenção continua

  await page.getByRole("row", { name: /DSK0001/ }).hover();
  await page.getByRole("row", { name: /DSK0001/ }).getByRole("button", { name: "Devolver" }).click();
  const confirmacao = page.getByRole("dialog", { name: "Devolver DSK0001" });
  await expect(confirmacao).toContainText("volta para o estoque");
  await confirmacao.getByRole("button", { name: "Devolver" }).click();
  await expect(aviso(page)).toHaveText("DSK0001 voltou para o estoque.");
  await expect(page.getByText("2 itens com esta pessoa")).toBeVisible();

  await page.goto("/colaboradores");
  await expect(page.getByRole("link", { name: /Ana Paula/ })).toContainText("Nenhum item");
});

test("no celular (390px), as telas novas não rolam para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/colaboradores");
  await page.getByRole("link", { name: /João Lima/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("João Lima");
  const pessoa = page.url();
  for (const caminho of ["/colaboradores", pessoa, `${pessoa}/editar`, "/inventario?q=jo%C3%A3o", "/inventario/MOU0001"]) {
    await page.goto(caminho);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), caminho).toBeLessThanOrEqual(390);
  }
});
