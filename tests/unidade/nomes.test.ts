import { describe, expect, it } from "vitest";

import { avisoDeGarantia, situacaoDaGarantia } from "@/lib/itens/garantia";
import { descricaoDoItem, nomeCompletoDoItem, subtituloDoItem, tituloDoItem, type ItemParaNome } from "@/lib/itens/nomes";
import { dataValida, diasEntre, formatarData, hojeEmSaoPaulo, somarDias, tempoDesde } from "@/lib/texto/data";
import { plural } from "@/lib/texto/plural";

const desktop = { nome: "Desktop", categoria: "computador" as const };
const monitor = { nome: "Monitor", categoria: "periferico" as const };
const item = (parcial: Partial<ItemParaNome>): ItemParaNome => ({
  hostname: null,
  marca: null,
  modelo: null,
  numeroSerie: null,
  tipo: desktop,
  ...parcial,
});

describe("nome do item nas telas", () => {
  const pc = item({ hostname: "FIN-PC-03", marca: "Dell", modelo: "OptiPlex 7090" });
  const tela = item({ tipo: monitor, marca: "Dell", modelo: "P2422H", numeroSerie: "CN0ABC123" });
  const semNada = item({ tipo: monitor });

  it("título: sempre marca e modelo, senão o tipo (o hostname não vira título)", () => {
    expect(tituloDoItem(pc)).toBe("Dell OptiPlex 7090");
    expect(tituloDoItem(tela)).toBe("Dell P2422H");
    expect(tituloDoItem(semNada)).toBe("Monitor");
    expect(tituloDoItem(item({ marca: "Dell" }))).toBe("Dell");
    expect(tituloDoItem(item({ hostname: "SO-HOST" }))).toBe("Desktop");
  });

  it("subtítulo: hostname (só de computador) e série, quando existirem", () => {
    expect(subtituloDoItem(pc)).toBe("FIN-PC-03");
    expect(subtituloDoItem(tela)).toBe("Série CN0ABC123");
    expect(subtituloDoItem(item({ hostname: "APT-ANA-CAD", modelo: "Inspiron 5490", numeroSerie: "CC7F973" }))).toBe(
      "APT-ANA-CAD · Série CC7F973",
    );
    expect(subtituloDoItem(item({ tipo: monitor, hostname: "X", marca: "LG" }))).toBe("");
    expect(subtituloDoItem(semNada)).toBe("");
  });

  it("nome completo: o tipo na frente, para todos", () => {
    expect(nomeCompletoDoItem(pc)).toBe("Desktop Dell OptiPlex 7090");
    expect(nomeCompletoDoItem(tela)).toBe("Monitor Dell P2422H");
    expect(nomeCompletoDoItem(semNada)).toBe("Monitor");
  });

  it("descrição para textos longos", () => {
    expect(descricaoDoItem(pc)).toBe("Desktop Dell OptiPlex 7090 (FIN-PC-03)");
    expect(descricaoDoItem(tela)).toBe("Monitor Dell P2422H, série CN0ABC123");
  });
});

describe("situação da garantia", () => {
  const HOJE = "2026-11-05";

  it("sem data, nada", () => {
    expect(situacaoDaGarantia(null, HOJE)).toBeNull();
  });

  it("vencida, vence hoje e no futuro na maior unidade", () => {
    expect(situacaoDaGarantia("2026-11-04", HOJE)).toEqual({ texto: "vencida", vencida: true });
    expect(situacaoDaGarantia("2026-11-05", HOJE)).toEqual({ texto: "vence hoje", vencida: false });
    expect(situacaoDaGarantia("2026-11-10", HOJE)?.texto).toBe("em 5 dias");
    expect(situacaoDaGarantia("2026-11-06", HOJE)?.texto).toBe("em 1 dia");
    expect(situacaoDaGarantia("2026-11-19", HOJE)?.texto).toBe("em 2 semanas");
    expect(situacaoDaGarantia("2027-03-15", HOJE)?.texto).toBe("em 4 meses");
    expect(situacaoDaGarantia("2027-11-05", HOJE)?.texto).toBe("em 1 ano");
  });

  it("título do aviso no Início", () => {
    expect(avisoDeGarantia("2026-11-05", HOJE)).toBe("Garantia vence hoje");
    expect(avisoDeGarantia("2026-11-06", HOJE)).toBe("Garantia vence em 1 dia");
    expect(avisoDeGarantia("2026-12-20", HOJE)).toBe("Garantia vence em 45 dias");
  });
});

describe("datas e plural", () => {
  it("hoje em São Paulo", () => {
    expect(hojeEmSaoPaulo(new Date("2026-11-05T01:00:00Z"))).toBe("2026-11-04");
    expect(hojeEmSaoPaulo(new Date("2026-11-05T12:00:00Z"))).toBe("2026-11-05");
  });

  it("contas com datas", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(diasEntre("2026-11-05", "2027-01-04")).toBe(60);
    expect(formatarData("2027-03-15")).toBe("15/03/2027");
    expect(dataValida("2028-02-29")).toBe(true);
    expect(dataValida("2027-02-29")).toBe(false);
    expect(dataValida("15/03/2027")).toBe(false);
  });

  it("tempo desde", () => {
    const agora = new Date("2026-11-05T15:00:00-03:00");
    const antes = (ms: number) => new Date(agora.getTime() - ms);
    expect(tempoDesde(antes(10_000), agora)).toBe("agora há pouco");
    expect(tempoDesde(antes(5 * 60_000), agora)).toBe("há 5 minutos");
    expect(tempoDesde(antes(2 * 3_600_000), agora)).toBe("há 2 horas");
    expect(tempoDesde(antes(26 * 3_600_000), agora)).toBe("ontem");
    expect(tempoDesde(antes(3 * 86_400_000), agora)).toBe("há 3 dias");
    expect(tempoDesde(antes(65 * 86_400_000), agora)).toBe("há 2 meses");
  });

  it("singular e plural", () => {
    expect(plural(1, "item", "itens")).toBe("1 item");
    expect(plural(0, "item", "itens")).toBe("0 itens");
    expect(plural(2, "pessoa", "pessoas")).toBe("2 pessoas");
  });
});
