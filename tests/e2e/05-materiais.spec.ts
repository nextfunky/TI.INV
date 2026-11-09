import { expect, test, type Page } from "@playwright/test";

import { entrar, NOVA_SENHA, USUARIO, vigiarErros } from "./ajuda";

/**
 * O fluxo da Etapa 5A: materiais (controlados por quantidade), entrada, saída,
 * ajuste de contagem, histórico e "Materiais entregues" na página da pessoa.
 * Roda depois de 04-locais (existem Matriz › Estoque da TI e a Ana Paula, sem itens).
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
const estoque = (page: Page) => page.getByRole("region", { name: "Estoque" });
const painel = (page: Page) => page.getByRole("complementary", { name: /^Detalhes de / });
const historico = (page: Page) => page.getByRole("list", { name: "Histórico do material" }).getByRole("listitem");

/** Abre o painel do material, ao lado da lista. */
async function abrirMaterial(page: Page, nome: string) {
  await page.goto("/materiais");
  await page.getByRole("link", { name: nome, exact: true }).click();
  await expect(page).toHaveURL(/\/materiais\?material=\d+$/);
  await expect(painel(page).getByRole("heading", { level: 2 })).toHaveText(nome);
}

test("cadastra um material com a quantidade que já existe", async ({ page }) => {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Materiais" }).click();
  await expect(page).toHaveURL(/\/materiais$/);
  await expect(page.getByRole("heading", { name: "Nenhum material cadastrado" })).toBeVisible();

  await page.getByRole("link", { name: "Novo material" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Novo material");
  await page.getByLabel("Quantidade").fill("1,5");
  await salvar(page);
  await expect(page.getByText("Informe o nome do material.")).toBeVisible();
  await expect(page.getByText("Escolha o grupo.")).toBeVisible();
  await expect(page.getByText("Use só números inteiros, sem vírgula.")).toBeVisible();
  await expect(page.getByLabel("Nome")).toBeFocused();

  await page.getByLabel("Nome").fill("Cabo HDMI");
  await page.getByLabel("Marca / modelo").fill("Genérico 2 metros");
  await page.getByLabel("Grupo").selectOption({ label: "Cabos" });
  await page.getByLabel("Local").selectOption({ label: "Matriz › Estoque da TI" });
  await page.getByLabel("Condição").selectOption({ label: "Novo" });
  await page.getByLabel("Quantidade").fill("3");
  await salvar(page);

  // Salvar abre a lista com o painel do material.
  await expect(page).toHaveURL(/\/materiais\?material=\d+$/);
  await expect(aviso(page)).toHaveText("Cadastro de Cabo HDMI · Genérico 2 metros criado.");
  await expect(painel(page)).toHaveAccessibleName("Detalhes de Cabo HDMI · Genérico 2 metros");
  await expect(painel(page)).toContainText("Genérico 2 metros · Novo");
  await expect(estoque(page)).toContainText(/^3\s*em estoque\s*Matriz › Estoque da TI/);
  await expect(historico(page)).toHaveCount(1);
  await expect(historico(page).first()).toContainText("+3");
  await expect(historico(page).first()).toContainText("Quantidade no cadastro");
  // Na lista, o material fica sob o título do grupo.
  await expect(page.getByRole("rowheader", { name: /Cabos · 1/ }).or(page.getByRole("columnheader", { name: /Cabos · 1/ }))).toBeVisible();
});

test("entrada, saída e ajuste de contagem mudam o saldo e ficam no histórico", async ({ page }) => {
  await abrirMaterial(page, "Cabo HDMI");

  await estoque(page).getByRole("button", { name: "Entrada" }).click();
  let janela = page.getByRole("dialog", { name: "Entrada: Cabo HDMI · Genérico 2 metros" });
  await janela.getByLabel("Quantos chegaram").fill("5");
  await janela.getByLabel("Observação").fill("Compra de novembro");
  await janela.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(aviso(page)).toHaveText("Entrada de 5 registrada. Agora há 8 em estoque.");
  await expect(janela).toBeHidden();
  await expect(estoque(page)).toContainText(/^8\s*em estoque/);

  await estoque(page).getByRole("button", { name: "Saída" }).click();
  janela = page.getByRole("dialog", { name: "Saída: Cabo HDMI · Genérico 2 metros" });
  await janela.getByLabel("Quantos saíram").fill("10");
  await janela.getByRole("button", { name: "Registrar saída" }).click();
  await expect(janela.getByText("Só há 8 em estoque.")).toBeVisible();
  await janela.getByLabel("Quantos saíram").fill("2");
  await janela.getByLabel("Para quem").selectOption({ label: "Ana Paula" });
  await janela.getByRole("button", { name: "Registrar saída" }).click();
  await expect(aviso(page)).toHaveText("Saída de 2 para Ana Paula registrada. Agora há 6 em estoque.");
  await expect(estoque(page)).toContainText(/^6\s*em estoque/);

  await estoque(page).getByRole("button", { name: "Ajustar contagem" }).click();
  janela = page.getByRole("dialog", { name: "Ajustar contagem: Cabo HDMI · Genérico 2 metros" });
  await janela.getByLabel("Quantos você contou").fill("6");
  await janela.getByRole("button", { name: "Ajustar" }).click();
  await expect(janela.getByText("O saldo já é 6. Nada para ajustar.")).toBeVisible();
  await janela.getByLabel("Quantos você contou").fill("5");
  await janela.getByRole("button", { name: "Ajustar" }).click();
  await expect(aviso(page)).toHaveText("Contagem ajustada (1 a menos). Agora há 5 em estoque.");

  // Tudo aconteceu sem sair da lista: o painel continua aberto.
  await expect(page).toHaveURL(/\/materiais\?material=\d+$/);
  await expect(historico(page)).toHaveCount(4);
  await expect(historico(page).nth(0)).toContainText("Ajuste de contagem");
  await expect(historico(page).nth(0)).toContainText("−1");
  await expect(historico(page).nth(1)).toContainText("Ana Paula");
  await expect(historico(page).nth(1)).toContainText("−2");
  await expect(historico(page).nth(2)).toContainText("Compra de novembro");
});

test("a pessoa vê o que recebeu, e quem recebeu material não pode ser excluído", async ({ page }) => {
  await abrirMaterial(page, "Cabo HDMI");
  await painel(page).getByRole("link", { name: "Ana Paula" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ana Paula");
  const bloco = page.getByRole("region", { name: "Materiais entregues" });
  await expect(bloco.getByRole("row", { name: /Cabo HDMI/ })).toContainText("2");
  await expect(page.getByRole("button", { name: "Excluir" })).toHaveCount(0);
});

test("a lista busca e filtra por grupo; só exclui material sem saída", async ({ page }) => {
  await page.goto("/materiais/novo");
  await page.getByLabel("Nome").fill("Toner");
  await page.getByLabel("Marca / modelo").fill("HP 85A");
  await page.getByLabel("Grupo").selectOption({ label: "Impressão" });
  await salvar(page);
  await expect(page).toHaveURL(/\/materiais\?material=\d+$/);
  await expect(estoque(page)).toContainText(/^0\s*em estoque\s*Sem local definido/);
  await expect(estoque(page).getByRole("button", { name: "Saída" })).toBeDisabled();
  await expect(page.getByText("Nenhum movimento ainda.")).toBeVisible();

  await page.goto("/materiais");
  await expect(page.getByText("2 materiais · 5 unidades em estoque")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(7); // cabeçalho + 2 grupos + 2 condições + 2 materiais
  // Dentro do grupo, um subtítulo por condição, e os totais por condição embaixo dos filtros.
  await expect(page.getByRole("rowheader", { name: /^Novo · 1 material/ }).or(page.getByRole("columnheader", { name: /^Novo · 1 material/ }))).toBeVisible();
  await expect(page.getByText("Novo: 1 material (5 un.) · Não informada: 1 material (0 un.)")).toBeVisible();
  await page.getByLabel("Condição", { exact: true }).selectOption({ label: "Não informada" });
  await expect(page).toHaveURL(/condicao=nenhuma/);
  await expect(page.getByRole("row", { name: /Toner/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Cabo HDMI/ })).toHaveCount(0);

  await page.goto("/materiais");
  await page.getByLabel("Grupo").selectOption({ label: "Impressão" });
  await expect(page).toHaveURL(/grupo=impressao/);
  await expect(page.getByRole("row")).toHaveCount(4);
  await expect(page.getByRole("row", { name: /Toner/ })).toBeVisible();

  await page.goto("/materiais");
  await page.getByLabel("Buscar materiais").fill("estoque da ti");
  await page.getByLabel("Buscar materiais").press("Enter");
  await expect(page).toHaveURL(/q=estoque/);
  await expect(page.getByRole("row")).toHaveCount(4);

  // O filtro por local também acha o material.
  await page.goto("/materiais");
  await page.getByLabel("Local", { exact: true }).selectOption({ label: "Matriz › Estoque da TI" });
  await expect(page).toHaveURL(/local=\d+/);
  await expect(page.getByRole("row", { name: /Cabo HDMI/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Toner/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Cabo HDMI/ })).toBeVisible();

  await page.goto("/materiais?q=nada-assim");
  await expect(page.getByRole("heading", { name: "Nenhum material encontrado" })).toBeVisible();

  // Cabo HDMI teve saída: o cadastro fica.
  await abrirMaterial(page, "Cabo HDMI");
  await expect(painel(page).getByRole("button", { name: "Excluir" })).toHaveCount(0);
  await painel(page).getByRole("link", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Editar material");
  await expect(page.getByLabel("Quantidade")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Excluir" })).toHaveCount(0);

  // "Compatível com": aparece no painel e vira filtro na lista.
  await abrirMaterial(page, "Toner");
  await painel(page).getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Compatível com").fill("Ricoh SP 3710");
  await salvar(page);
  await expect(page).toHaveURL(/\/materiais\?material=\d+$/);
  await expect(painel(page)).toContainText("Compatível com Ricoh SP 3710");
  await page.goto("/materiais");
  await page.getByLabel("Compatível com", { exact: true }).selectOption({ label: "Ricoh SP 3710" });
  await expect(page).toHaveURL(/compativel=Ricoh/);
  await expect(page.getByRole("row", { name: /Toner/ })).toContainText("para Ricoh SP 3710");
  await expect(page.getByRole("row", { name: /Cabo HDMI/ })).toHaveCount(0);

  // Toner nunca teve saída: dá para excluir direto do painel.
  await abrirMaterial(page, "Toner");
  await painel(page).getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("dialog", { name: "Excluir Toner · HP 85A" }).getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/materiais$/);
  await expect(aviso(page)).toHaveText("Cadastro de Toner · HP 85A excluído.");
  await expect(page.getByRole("row")).toHaveCount(4);
});

test("um local com material não pode ser excluído", async ({ page }) => {
  await page.goto("/locais");
  await expect(page.getByRole("listitem").filter({ hasText: "Estoque da TI" }).getByRole("button", { name: "Excluir" })).toHaveCount(0);
});

test("no celular (390px), as telas de materiais não rolam para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirMaterial(page, "Cabo HDMI");
  const material = page.url();
  const editar = `/materiais/${new URL(material).searchParams.get("material")}/editar`;
  await painel(page).getByRole("link", { name: "Ana Paula" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ana Paula");
  const pessoa = page.url();
  for (const caminho of ["/materiais", "/materiais/novo", material, editar, pessoa]) {
    await page.goto(caminho);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), caminho).toBeLessThanOrEqual(390);
  }
});
