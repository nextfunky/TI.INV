import { expect, test, type Page } from "@playwright/test";

import { entrar, NOVA_SENHA, USUARIO, vigiarErros } from "./ajuda";

/**
 * A Etapa 6: as ações rápidas do painel (Entregar, Trocar pessoa, Devolver,
 * Mudar de local), o histórico do item, a tela Histórico e a Atividade recente.
 * Roda depois dos outros (TEC0003 está sem usuário em Matriz › Estoque da TI).
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

const painel = (page: Page) => page.getByRole("complementary", { name: "Detalhes de TEC0003" });
const aviso = (page: Page) => page.getByRole("status");

async function acao(page: Page, botao: string, preencher: (janela: ReturnType<Page["getByRole"]>) => Promise<void>) {
  await painel(page).getByRole("button", { name: botao }).click();
  const janela = page.getByRole("dialog", { name: `${botao}: TEC0003` });
  await preencher(janela);
  await janela.getByRole("button", { name: botao, exact: true }).click();
  await expect(janela).toBeHidden();
}

test("as ações rápidas do painel gravam o histórico", async ({ page }) => {
  await page.goto("/inventario?item=TEC0003");
  await expect(painel(page).getByRole("button", { name: "Mudar de local" })).toBeVisible();

  await acao(page, "Entregar", async (j) => {
    await j.getByLabel("Para quem").selectOption({ label: "Ana Paula" });
    await j.getByLabel("Observação").fill("Teclado novo");
  });
  await expect(aviso(page)).toHaveText("TEC0003 agora está com Ana Paula.");
  await expect(painel(page)).toContainText("Entregue a Ana Paula");
  await expect(painel(page)).toContainText("Teclado novo");
  // Com usuário, as ações mudam.
  await expect(painel(page).getByRole("button", { name: "Trocar pessoa" })).toBeVisible();

  await acao(page, "Trocar pessoa", async (j) => {
    await j.getByLabel("Para quem").selectOption({ label: "Carla Dias" });
  });
  await expect(painel(page)).toContainText("Passou de Ana Paula para Carla Dias");

  await acao(page, "Devolver", async (j) => {
    await j.getByLabel("Para onde volta").selectOption({ label: "Matriz › Estoque da TI" });
  });
  await expect(aviso(page)).toHaveText("TEC0003 devolvido para Matriz › Estoque da TI.");

  await acao(page, "Mudar de local", async (j) => {
    await j.getByLabel("Novo local").selectOption({ label: "Matriz › Financeiro" });
  });
  await expect(painel(page)).toContainText("Matriz › Estoque da TI → Matriz › Financeiro");
  // O painel continua aberto o tempo todo.
  await expect(page).toHaveURL(/\/inventario\?item=TEC0003$/);
});

test("mudar a pessoa pelo formulário também entra no histórico", async ({ page }) => {
  await page.goto("/inventario/TEC0003/editar");
  await page.locator("#usuarioId").selectOption({ label: "João Lima" });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page).toHaveURL(/\/inventario\?item=TEC0003$/);
  await expect(painel(page)).toContainText("Entregue a João Lima");
});

test("a tela Histórico: busca, evento e itens excluídos", async ({ page }) => {
  // Um item excluído continua no histórico.
  await page.goto("/inventario?item=TEL0001");
  await page.getByRole("complementary").getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("dialog", { name: "Excluir TEL0001" }).getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/inventario$/);

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Histórico" }).click();
  await expect(page).toHaveURL(/\/historico$/);
  const lista = page.getByRole("main").getByRole("listitem");
  await expect(lista.first()).toContainText("TEL0001");
  await expect(lista.first()).toContainText("Excluído do inventário");
  // O item excluído não tem link.
  await expect(lista.first().getByRole("link")).toHaveCount(0);

  await page.getByLabel("Evento").selectOption({ label: "Troca de pessoa" });
  await expect(page).toHaveURL(/evento=troca/);
  // Só trocas: a do TEC0003 e a do MON0001 (que passou de Ana Paula para Carla Dias pelo Vincular, num teste anterior).
  await expect(lista.filter({ hasText: "Passou de" })).toHaveCount(await lista.count());
  await expect(lista.filter({ hasText: "TEC0003" })).toContainText("Passou de Ana Paula para Carla Dias");

  await page.goto("/historico");
  await page.getByLabel("Buscar no histórico").fill("teclado novo");
  await page.getByLabel("Buscar no histórico").press("Enter");
  await expect(lista).toHaveCount(1);
  await expect(lista.first()).toContainText("Entregue a Ana Paula");

  await page.goto("/historico?item=TEC0003");
  await expect(page.getByRole("link", { name: "Tirar o filtro: só TEC0003" })).toBeVisible();
  await expect(lista.filter({ hasText: "TEC0003" })).toHaveCount(await lista.count());
});

test("o Início mostra a atividade recente", async ({ page }) => {
  const atividade = page.getByRole("region", { name: "Atividade recente" });
  await expect(atividade).toContainText("TEL0001");
  await expect(atividade.getByRole("link", { name: /TEC0003/ }).first()).toBeVisible();
  await atividade.getByRole("link", { name: "Ver histórico" }).click();
  await expect(page).toHaveURL(/\/historico$/);
});

test("no celular (390px), o histórico não rola para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const caminho of ["/historico", "/inventario?item=TEC0003", "/"]) {
    await page.goto(caminho);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), caminho).toBeLessThanOrEqual(390);
  }
});
