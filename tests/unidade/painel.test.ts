import { describe, expect, it } from "vitest";

import { comItem, enderecoInterno, itemDoEndereco } from "@/lib/itens/painel";

describe("o painel lateral no endereço", () => {
  it("lê o código aberto (?item=)", () => {
    expect(itemDoEndereco({ item: "mon0001" })).toBe("MON0001");
    expect(itemDoEndereco({})).toBeNull();
    expect(itemDoEndereco({ item: ["A", "B"] })).toBeNull();
    expect(itemDoEndereco({ item: "<script>" })).toBeNull();
  });

  it("abre e fecha o painel mantendo os filtros", () => {
    expect(comItem("/inventario", "DSK0001")).toBe("/inventario?item=DSK0001");
    expect(comItem("/inventario?categoria=periferico&pagina=2", "MON0001")).toBe(
      "/inventario?categoria=periferico&pagina=2&item=MON0001",
    );
    expect(comItem("/inventario?categoria=periferico&item=MON0001", null)).toBe("/inventario?categoria=periferico");
    expect(comItem("/colaboradores/3?item=X", null)).toBe("/colaboradores/3");
  });

  it("depois de excluir, só volta para uma tela do próprio sistema", () => {
    expect(enderecoInterno("/inventario?categoria=periferico")).toBe("/inventario?categoria=periferico");
    expect(enderecoInterno("//outro-site.com")).toBeNull();
    expect(enderecoInterno("https://outro-site.com")).toBeNull();
    expect(enderecoInterno("/\\outro-site.com")).toBeNull();
    expect(enderecoInterno(undefined)).toBeNull();
  });
});
