import { defineConfig, devices } from "@playwright/test";

/**
 * Testes no navegador: abrem o sistema de verdade e fazem o que uma pessoa
 * faria. Usam um banco SÓ para testes (E2E_DATABASE_URL), que é apagado a
 * cada rodada. Nunca use aqui o endereço do banco do dia a dia.
 */
const PORTA = 3101;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/preparar-banco.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORTA}`,
    // Um arquivo que não consulta o banco (ele ainda está sendo preparado).
    url: `http://localhost:${PORTA}/icon.svg`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: process.env.E2E_DATABASE_URL ?? "" },
  },
});
