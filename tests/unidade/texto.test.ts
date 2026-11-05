import { describe, expect, it } from "vitest";

import { dataPorExtenso, saudacao } from "@/lib/texto/data";
import { iniciais } from "@/lib/texto/iniciais";

// Horários escritos no fuso de São Paulo (-03:00).
const sp = (horario: string) => new Date(`2026-11-04T${horario}-03:00`);

describe("saudação", () => {
  it("bom dia antes do meio-dia", () => {
    expect(saudacao(sp("00:30:00"))).toBe("Bom dia");
    expect(saudacao(sp("11:59:59"))).toBe("Bom dia");
  });

  it("boa tarde do meio-dia até as 18h", () => {
    expect(saudacao(sp("12:00:00"))).toBe("Boa tarde");
    expect(saudacao(sp("17:59:59"))).toBe("Boa tarde");
  });

  it("boa noite a partir das 18h", () => {
    expect(saudacao(sp("18:00:00"))).toBe("Boa noite");
    expect(saudacao(sp("23:59:59"))).toBe("Boa noite");
  });

  it("usa a hora de São Paulo, mesmo com o servidor em outro fuso", () => {
    // 01:00 em Londres (UTC) ainda é 22:00 do dia anterior em São Paulo.
    expect(saudacao(new Date("2026-11-05T01:00:00Z"))).toBe("Boa noite");
  });
});

describe("data por extenso", () => {
  it("dia da semana com inicial maiúscula e mês em minúscula", () => {
    expect(dataPorExtenso(sp("09:00:00"))).toBe("Quarta-feira, 4 de novembro");
  });

  it("usa o dia de São Paulo", () => {
    expect(dataPorExtenso(new Date("2026-11-05T01:00:00Z"))).toBe("Quarta-feira, 4 de novembro");
  });

  it("sábado e domingo não têm '-feira'", () => {
    expect(dataPorExtenso(new Date("2026-11-07T12:00:00-03:00"))).toBe("Sábado, 7 de novembro");
  });
});

describe("iniciais do avatar", () => {
  it("primeira letra do primeiro e do último nome", () => {
    expect(iniciais("João Lima")).toBe("JL");
    expect(iniciais("Ana Paula de Souza")).toBe("AS");
    expect(iniciais("Ana")).toBe("A");
  });

  it("funciona com o nome de usuário do login", () => {
    expect(iniciais("pedro.martins")).toBe("PM");
    expect(iniciais("admin")).toBe("A");
    expect(iniciais("ti_suporte")).toBe("TS");
  });

  it("acentos e minúsculas", () => {
    expect(iniciais("élio ávila")).toBe("ÉÁ");
  });
});
