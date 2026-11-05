import { expect, test, type Page } from "@playwright/test";

import { daquiA, entrar, NOVA_SENHA, USUARIO, vigiarErros } from "./ajuda";

// Uma garantia que vence daqui a 44 dias (entra no aviso de 60 dias do Início).
const GARANTIA = daquiA(44);

/**
 * O fluxo da Etapa 2: cadastrar, ver, editar, buscar, filtrar e excluir
 * itens, e cuidar dos tipos. Roda depois de 01-conta (a conta já existe).
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

test("sem itens, o Início está em ordem e o Inventário convida a cadastrar", async ({ page }) => {
  await expect(page.getByText("Tudo em ordem")).toBeVisible();
  await expect(page.getByText("Nenhum item cadastrado ainda.")).toBeVisible();

  await page.getByRole("link", { name: "Ver inventário" }).click();
  await expect(page).toHaveURL(/\/inventario$/);
  await expect(page.getByRole("heading", { name: "Nenhum item cadastrado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver inventário" })).toHaveAttribute("aria-current", "page");
});

test("cadastra um desktop, e 'Salvar e cadastrar outro' repete o que é igual", async ({ page }) => {
  await page.getByRole("link", { name: "Novo item" }).click();
  await expect(page).toHaveURL(/\/inventario\/novo$/);
  await expect(page.getByLabel("Hostname")).toBeHidden();

  await page.getByLabel("Tipo").selectOption({ label: "Desktop" });
  await expect(page.getByLabel("Hostname")).toBeVisible();
  await page.getByLabel("Marca").fill("Dell");
  await page.getByLabel("Modelo").fill("OptiPlex 7090");
  await page.getByLabel("Nº de série").fill("BR7X9K2");
  await page.getByLabel("Status").selectOption("em_uso");
  await page.getByLabel("Hostname").fill("FIN-PC-03");
  await page.getByLabel("Memória RAM").fill("16 GB");
  await page.getByLabel("Garantia até").fill(GARANTIA);
  await page.getByRole("button", { name: "Salvar e cadastrar outro" }).click();

  await expect(page).toHaveURL(/\/inventario\/novo\?repetir=DSK0001$/);
  await expect(aviso(page)).toHaveText("DSK0001 cadastrado.");
  await expect(page.getByLabel("Tipo")).toHaveValue(/\d+/);
  await expect(page.getByLabel("Marca")).toHaveValue("Dell");
  await expect(page.getByLabel("Memória RAM")).toHaveValue("16 GB");
  await expect(page.getByLabel("Garantia até")).toHaveValue(GARANTIA);
  await expect(page.getByLabel("Nº de série")).toHaveValue("");
  await expect(page.getByLabel("Hostname")).toHaveValue("");
  await expect(page.getByLabel("Nº de série")).toBeFocused();

  // Enter salva (o botão do Enter é "Salvar").
  await page.getByLabel("Nº de série").fill("BR7X9K3");
  await page.getByLabel("Hostname").fill("FIN-PC-04");
  await page.getByLabel("Hostname").press("Enter");
  await expect(page).toHaveURL(/\/inventario\/DSK0002$/);
  await expect(aviso(page)).toHaveText("DSK0002 cadastrado.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("FIN-PC-04");
  await expect(page).toHaveTitle("DSK0002 · Inventário de TI");
});

test("um monitor não tem a seção Computador, e o formulário avisa o que falta", async ({ page }) => {
  await page.goto("/inventario/novo");
  await salvar(page);
  await expect(page.getByText("Confira os campos destacados abaixo.")).toBeVisible();
  await expect(page.getByText("Escolha o tipo.")).toBeVisible();
  await expect(page.getByLabel("Tipo")).toBeFocused();

  await page.getByLabel("Tipo").selectOption({ label: "Monitor" });
  await expect(page.getByLabel("Hostname")).toBeHidden();
  await page.getByLabel("Marca").fill("Dell");
  await page.getByLabel("Modelo").fill("P2422H");
  await page.getByLabel("Nº de série").fill("CN0ABC123");
  await page.getByLabel("Garantia até").fill("2027-03-15");
  await salvar(page);

  await expect(page).toHaveURL(/\/inventario\/MON0001$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dell P2422H");
  await expect(page.getByRole("heading", { name: "Computador" })).toHaveCount(0);
  await expect(page.getByText("15/03/2027")).toBeVisible();
});

test("mudar o tipo dá um código novo", async ({ page }) => {
  await page.goto("/inventario/DSK0002/editar");
  await expect(page.getByText("Se o tipo mudar, o item ganha um código novo.")).toBeVisible();
  await page.getByLabel("Tipo").selectOption({ label: "Notebook" });
  await page.getByLabel("Status").selectOption("em_manutencao");
  await salvar(page);

  await expect(page).toHaveURL(/\/inventario\/NTB0001$/);
  await expect(aviso(page)).toHaveText("Alterações salvas. Com o novo tipo, DSK0002 virou NTB0001.");
  await page.goto("/inventario/DSK0002");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});

test("a busca rápida (Ctrl+K) acha o item e abre a edição", async ({ page }) => {
  await page.keyboard.press("Control+k");
  const busca = page.getByRole("combobox", { name: "Buscar item para editar" });
  await expect(busca).toBeFocused();
  await expect(page.getByRole("option")).toHaveCount(3);

  await busca.fill("nada-com-isso");
  await expect(page.getByText("Nenhum item encontrado.")).toBeVisible();

  await busca.fill("dell p24");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option")).toContainText("Monitor Dell P2422H");
  await busca.press("Enter");
  await expect(page).toHaveURL(/\/inventario\/MON0001\/editar$/);

  await page.getByRole("button", { name: "Editar item" }).click();
  await expect(busca).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(busca).toBeHidden();
});

test("o Inventário filtra, resume e a linha inteira abre o painel do item", async ({ page }) => {
  await page.goto("/inventario/novo");
  await page.getByLabel("Tipo").selectOption({ label: "Teclado" });
  await page.getByLabel("Status").selectOption("descartado");
  await salvar(page);
  await expect(page).toHaveURL(/\/inventario\/TEC0001$/);

  await page.goto("/inventario");
  await expect(page.getByRole("heading", { name: "Inventário" })).toBeVisible();
  await expect(page.getByText("3 itens · 2 computadores, 1 periférico")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(4); // cabeçalho + 3 (o descartado fica de fora)

  await page.getByRole("navigation", { name: "Categoria" }).getByRole("link", { name: "Periféricos" }).click();
  await expect(page).toHaveURL(/categoria=periferico/);
  await expect(page.getByText("Mostrando 1 de 3 itens")).toBeVisible();

  await page.getByRole("navigation", { name: "Status" }).getByRole("link", { name: "Descartado" }).click();
  await expect(page).toHaveURL(/categoria=periferico&status=descartado/);
  await expect(page.getByRole("cell", { name: "TEC0001" })).toBeVisible();

  // Clicar de novo no status escolhido tira o filtro.
  await page.getByRole("navigation", { name: "Status" }).getByRole("link", { name: "Descartado" }).click();
  await expect(page).toHaveURL(/\/inventario\?categoria=periferico$/);

  await page.getByRole("navigation", { name: "Status" }).getByRole("link", { name: "Em manutenção" }).click();
  await expect(page.getByRole("heading", { name: "Nenhum item encontrado" })).toBeVisible();
  await page.getByRole("link", { name: "Limpar filtros" }).click();
  await expect(page).toHaveURL(/\/inventario$/);

  // Clicar em qualquer ponto da linha (aqui, no meio dela) abre o painel do item certo, sem sair da lista.
  await page.getByRole("row", { name: /MON0001/ }).click();
  await expect(page).toHaveURL(/\/inventario\?item=MON0001$/);
  await expect(page.getByRole("complementary", { name: "Detalhes de MON0001" })).toBeVisible();
  await expect(page.getByRole("row", { name: /MON0001/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("heading", { name: "Inventário" })).toBeVisible();
});

test("o painel lateral: setas, Esc, Editar e Excluir", async ({ page }) => {
  // Um item só para este teste (vai ser excluído pelo painel).
  await page.goto("/inventario/novo");
  await page.getByLabel("Tipo").selectOption({ label: "Webcam" });
  await page.getByLabel("Marca").fill("Logitech");
  await salvar(page);
  await expect(page).toHaveURL(/\/inventario\/WEB0001$/);

  await page.goto("/inventario?categoria=periferico");
  await page.getByRole("link", { name: "Dell P2422H" }).click();
  const painel = (codigo: string) => page.getByRole("complementary", { name: `Detalhes de ${codigo}` });
  await expect(painel("MON0001")).toContainText("Dell P2422H");
  await expect(painel("MON0001")).toContainText("Nº de série");
  // Os filtros continuam no endereço.
  await expect(page).toHaveURL(/categoria=periferico&item=MON0001/);

  // ↓ abre o item de baixo; ↑ volta; Esc fecha.
  await page.keyboard.press("ArrowDown");
  await expect(painel("WEB0001")).toContainText("Logitech");
  await page.keyboard.press("ArrowUp");
  await expect(painel("MON0001")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/inventario\?categoria=periferico$/);
  await expect(page.getByRole("complementary")).toHaveCount(0);

  // Recarregar a página mantém o painel aberto.
  await page.goto("/inventario?item=WEB0001");
  await expect(painel("WEB0001")).toBeVisible();

  // Editar é o único botão que sai da lista.
  await painel("WEB0001").getByRole("link", { name: "Editar" }).click();
  await expect(page).toHaveURL(/\/inventario\/WEB0001\/editar$/);

  await page.goto("/inventario?item=WEB0001");
  await painel("WEB0001").getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("dialog", { name: "Excluir WEB0001" }).getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/inventario$/);
  await expect(aviso(page)).toHaveText("WEB0001 excluído.");
  await expect(page.getByRole("complementary")).toHaveCount(0);
});

test("excluir pede confirmação, e o código não volta a ser usado", async ({ page }) => {
  await page.goto("/inventario/TEC0001/editar");
  await page.getByRole("button", { name: "Excluir item" }).click();
  const janela = page.getByRole("dialog", { name: "Excluir TEC0001" });
  await expect(janela).toContainText("prefira mudar o status para Descartado");
  await janela.getByRole("button", { name: "Cancelar" }).click();
  await expect(janela).toBeHidden();

  await page.getByRole("button", { name: "Excluir item" }).click();
  await janela.getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/inventario$/);
  await expect(aviso(page)).toHaveText("TEC0001 excluído.");

  await page.goto("/inventario/novo");
  await page.getByLabel("Tipo").selectOption({ label: "Teclado" });
  await salvar(page);
  await expect(page).toHaveURL(/\/inventario\/TEC0002$/);
});

test("tipos de item: criar, travar a categoria do computador e excluir", async ({ page }) => {
  await page.getByRole("button", { name: `Conta: ${USUARIO}` }).click();
  await page.getByRole("link", { name: "Tipos de item" }).click();
  await expect(page).toHaveURL(/\/configuracoes\/tipos$/);
  await expect(page.getByRole("link", { name: /Desktop/ })).toBeVisible();

  await page.getByRole("link", { name: "Novo tipo" }).click();
  await page.getByLabel("Nome").fill("Projetor");
  await page.getByLabel("Prefixo do código").fill("mon");
  await salvar(page);
  await expect(page.getByText("Já existe um tipo com este prefixo.")).toBeVisible();

  await page.getByLabel("Prefixo do código").fill("p rj");
  await salvar(page);
  await expect(page).toHaveURL(/\/configuracoes\/tipos$/);
  await expect(aviso(page)).toHaveText("Projetor cadastrado.");
  await expect(page.getByRole("link", { name: /Projetor/ })).toContainText("PRJ");

  // O Notebook tem itens: não deixa de ser Computador.
  await page.getByRole("link", { name: /Notebook/ }).click();
  await expect(page.getByLabel("Categoria")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Excluir" })).toHaveCount(0);

  await page.goto("/configuracoes/tipos");
  await page.getByRole("link", { name: /Projetor/ }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/configuracoes\/tipos$/);
  await expect(aviso(page)).toHaveText("Projetor excluído.");
  await expect(page.getByRole("link", { name: /Projetor/ })).toHaveCount(0);
});

test("o Início mostra os totais, a manutenção e as garantias", async ({ page }) => {
  const resumo = page.getByRole("region", { name: "Resumo" });
  await expect(resumo.getByRole("link", { name: /Total de itens/ })).toContainText("4");
  await expect(resumo.getByRole("link", { name: /Em manutenção/ })).toContainText("NTB0001");
  await expect(page.getByText("1 item em manutenção")).toBeVisible();
  // As garantias do DSK0001 e do NTB0001 vencem daqui a 44 dias.
  await expect(page.getByText("Garantia vence em 44 dias")).toHaveCount(2);
});

test("no celular (390px), nada rola para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const caminho of ["/", "/inventario", "/inventario?item=DSK0001", "/inventario/novo", "/inventario/DSK0001", "/inventario/DSK0001/editar", "/configuracoes/tipos"]) {
    await page.goto(caminho);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), caminho).toBeLessThanOrEqual(390);
  }
  await page.goto("/inventario/novo");
  await expect(page.getByRole("button", { name: "Salvar e cadastrar outro" })).toBeHidden();
});
