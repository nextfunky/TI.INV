import { expect, test, type Page } from "@playwright/test";

import { entrar, NOVA_SENHA, USUARIO, vigiarErros } from "./ajuda";

/**
 * As características: configurar (Grupos de material e Tipos de item),
 * cadastrar com elas, filtrar e conferir no Resumo.
 * Roda depois dos outros (MOU0001 é do João Lima; existe Matriz › Estoque da TI).
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

const aviso = (page: Page) => page.getByRole("status").filter({ hasText: /\S/ }).first();
const caracteristicas = (page: Page) => page.getByRole("region", { name: "Características" });
const salvar = (page: Page) => page.getByRole("button", { name: "Salvar", exact: true }).click();

test("Grupos de material: cria uma característica, reordena e renomeia uma opção", async ({ page }) => {
  await page.getByRole("button", { name: /^Conta:/ }).click();
  await page.getByRole("link", { name: "Grupos de material" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Grupos de material");
  await expect(page.getByRole("link", { name: /Impressão/ })).toContainText("Cor, Linha, Rendimento");

  await page.getByRole("link", { name: /Segurança/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Segurança");
  await expect(caracteristicas(page)).toContainText("Nenhuma característica ainda.");

  await page.getByRole("link", { name: "Nova característica" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nova característica");
  await salvar(page);
  await expect(page.getByText("Informe o nome.")).toBeVisible();
  await expect(page.getByText("Informe pelo menos uma opção.")).toBeVisible();

  await page.getByLabel("Nome").fill("Tamanho");
  await page.getByLabel("Opção 1", { exact: true }).fill("P");
  await page.getByLabel("Opção 2", { exact: true }).fill("M");
  await page.getByRole("button", { name: "Adicionar opção" }).click();
  await page.getByLabel("Opção 3", { exact: true }).fill("G");
  await salvar(page);
  await expect(page).toHaveURL(/\/configuracoes\/grupos\/seguranca$/);
  await expect(aviso(page)).toHaveText("Tamanho cadastrada.");
  await expect(caracteristicas(page).getByRole("link", { name: /Tamanho/ })).toContainText("Lista: P, M, G");

  // Um número, com unidade.
  await page.getByRole("link", { name: "Nova característica" }).click();
  await page.getByLabel("Nome").fill("Validade");
  await page.getByLabel("Tipo do campo").selectOption({ label: "Número" });
  await page.getByLabel("Unidade").fill("meses");
  await salvar(page);
  await expect(caracteristicas(page).getByRole("listitem")).toHaveText([/Tamanho/, /Validade\s*Número \(meses\)/]);

  await caracteristicas(page).getByRole("button", { name: "Subir Validade" }).click();
  await expect(caracteristicas(page).getByRole("listitem")).toHaveText([/Validade/, /Tamanho/]);

  await caracteristicas(page).getByRole("link", { name: /Tamanho/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Editar característica");
  await expect(page.getByText("O tipo do campo não muda depois de criado.")).toBeVisible();
  await page.getByLabel("Opção 3", { exact: true }).fill("Grande");
  await salvar(page);
  await expect(aviso(page)).toHaveText("Alterações salvas.");
  await expect(caracteristicas(page).getByRole("link", { name: /Tamanho/ })).toContainText("Lista: P, M, Grande");
});

test("excluir uma característica pede confirmação", async ({ page }) => {
  await page.goto("/configuracoes/grupos/seguranca");
  await caracteristicas(page).getByRole("link", { name: /Validade/ }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  const janela = page.getByRole("dialog", { name: "Excluir Validade" });
  await expect(janela).toContainText("Nenhum cadastro tem valor nele");
  await janela.getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/configuracoes\/grupos\/seguranca$/);
  await expect(aviso(page)).toHaveText("Validade excluída.");
  await expect(caracteristicas(page).getByRole("listitem")).toHaveText([/Tamanho/]);
});

async function novoToner(page: Page, cor: string, condicao: string, quantidade: string) {
  await page.goto("/materiais/novo");
  await page.getByLabel("Nome").fill("Toner TN-1060");
  await page.getByLabel("Compatível com").fill("Brother HL-1202");
  await page.getByLabel("Grupo").selectOption({ label: "Impressão" });
  const campos = page.getByRole("group", { name: "Características" });
  await expect(campos.getByLabel(/^Cor$/)).toBeVisible();
  await expect(campos.getByLabel("Rendimento (páginas)")).toBeVisible();
  await campos.getByLabel(/^Cor$/).selectOption({ label: cor });
  await campos.getByLabel("Rendimento (páginas)").fill("1.000");
  await page.getByLabel("Condição").selectOption({ label: condicao });
  await page.getByLabel("Quantidade").fill(quantidade);
  await salvar(page);
  await expect(page).toHaveURL(/\/materiais\?material=\d+$/);
}

test("cadastra toners com cor, filtra pela cor e confere no Resumo", async ({ page }) => {
  await novoToner(page, "Magenta", "Novo", "2");
  const painel = page.getByRole("complementary", { name: /^Detalhes de / });
  await expect(painel.getByRole("region", { name: "Características" })).toContainText("Magenta");
  await expect(painel.getByRole("region", { name: "Características" })).toContainText("1.000 páginas");
  await novoToner(page, "Preto", "Usado", "3");

  // A lista mostra a cor como etiqueta.
  await page.goto("/materiais?grupo=impressao");
  await expect(page.getByRole("row", { name: /Toner TN-1060/ })).toHaveCount(2);
  await expect(page.getByRole("row", { name: /Toner TN-1060/ }).first()).toContainText("Magenta");

  // Com o grupo escolhido, aparece o filtro da cor.
  await page.getByLabel(/^Cor$/).selectOption({ label: "Magenta" });
  await expect(page).toHaveURL(/c\d+=Magenta/);
  await expect(page.getByRole("row", { name: /Toner TN-1060/ })).toHaveCount(1);
  await expect(page.getByRole("row", { name: /Toner TN-1060/ })).toContainText("Magenta");

  // O Resumo: impressora e condição × cor.
  await page.getByLabel(/^Cor$/).selectOption({ label: "Cor: todos" });
  await page.getByRole("navigation", { name: "Visão" }).getByRole("link", { name: "Resumo" }).click();
  await expect(page).toHaveURL(/visao=resumo/);
  const tabela = page.getByRole("table");
  await expect(tabela.getByRole("columnheader")).toHaveText(["Compatível com", "Condição", "Preto", "Magenta", "Total"]);
  const linha = tabela.getByRole("row", { name: /Brother HL-1202 Novo/ });
  await expect(linha.getByRole("cell")).toHaveText(["·", "2", "2"]);

  // Mudar um filtro continua no Resumo.
  await page.getByLabel("Condição", { exact: true }).selectOption({ label: "Usado" });
  await expect(page).toHaveURL(/condicao=usado.*visao=resumo|visao=resumo.*condicao=usado/);
  // Só os usados: sobra a coluna Preto.
  await expect(page.getByRole("table").getByRole("columnheader")).toHaveText(["Compatível com", "Condição", "Preto", "Total"]);
  await expect(page.getByRole("table").getByRole("row", { name: /Usado/ }).getByRole("cell")).toHaveText(["3", "3"]);

  // Clicar num número abre a lista daquela célula.
  await page.getByRole("table").getByRole("row", { name: /Usado/ }).getByRole("link", { name: "3" }).first().click();
  await expect(page).not.toHaveURL(/visao=resumo/);
  await expect(page).toHaveURL(/c\d+=Preto/);
  await expect(page.getByRole("row", { name: /Toner TN-1060/ })).toHaveCount(1);
  await expect(page.getByRole("row", { name: /Toner TN-1060/ })).toContainText("Preto");
});

test("o mouse ganha conexão e receptor, e o Inventário filtra e resume por eles", async ({ page }) => {
  await page.goto("/inventario/MOU0001/editar");
  const secao = page.getByRole("region", { name: "Características" });
  await expect(secao).toContainText("Próprias de Mouse.");
  await secao.getByLabel("Conexão").selectOption({ label: "Sem fio" });
  await secao.getByLabel("Receptor USB").selectOption({ label: "Com receptor" });
  await salvar(page);
  await expect(page).toHaveURL(/\/inventario\?item=MOU0001$/);
  await expect(page.getByRole("complementary", { name: /^Detalhes de / }).getByRole("region", { name: "Características" })).toContainText("Sem fio");

  await page.goto("/inventario");
  await page.getByLabel("Tipo", { exact: true }).selectOption({ label: "Mouse" });
  await page.getByLabel("Conexão").selectOption({ label: "Sem fio" });
  await expect(page).toHaveURL(/c\d+=Sem\+fio/);
  await expect(page.getByRole("row", { name: /MOU0001/ })).toHaveCount(1);
  await expect(page.getByRole("row", { name: /MOU0001/ })).toContainText("Sem fio");

  await page.getByLabel("Conexão").selectOption({ label: "Conexão: todos" });
  await page.getByRole("navigation", { name: "Visão" }).getByRole("link", { name: "Resumo" }).click();
  await expect(page.getByLabel("Linhas")).toHaveValue(/^c\d+$/);
  await expect(page.getByRole("table").getByRole("rowheader", { name: "Sem fio" })).toBeVisible();

  // Trocar o que vai nas linhas.
  await page.getByLabel("Linhas").selectOption({ label: "Local" });
  await expect(page).toHaveURL(/linhas=local/);
  await expect(page.getByRole("table").getByRole("columnheader").first()).toHaveText("Local");
});

test("Tipos de item mostra e edita as características de cada tipo", async ({ page }) => {
  await page.goto("/configuracoes/tipos");
  await expect(page.getByRole("link", { name: /^Mouse/ })).toContainText("Conexão, Receptor USB");
  await page.getByRole("link", { name: /^Mouse/ }).click();
  await expect(caracteristicas(page).getByRole("listitem")).toHaveText([/Conexão\s*Lista: USB, Sem fio, Bluetooth/, /Receptor USB/]);
  await caracteristicas(page).getByRole("link", { name: /Conexão/ }).click();
  // A opção em uso mostra quantos usam e não pode sair.
  await expect(page.getByText("em 1 cadastro", { exact: true })).toBeAttached();
  await expect(page.getByRole("button", { name: "Tirar Sem fio" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tirar Bluetooth" })).toBeEnabled();
});

test("no celular (390px), as telas das características não rolam para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/configuracoes/grupos/seguranca");
  await caracteristicas(page).getByRole("link", { name: /Tamanho/ }).click();
  const edicao = page.url();
  for (const caminho of [
    "/configuracoes/grupos",
    "/configuracoes/grupos/impressao",
    "/configuracoes/caracteristicas/nova?grupo=seguranca",
    edicao,
    "/materiais?grupo=impressao",
    "/materiais?grupo=impressao&visao=resumo",
    "/inventario?visao=resumo",
  ]) {
    await page.goto(caminho);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), caminho).toBeLessThanOrEqual(390);
  }
});
