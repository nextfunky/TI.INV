import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Padrão do Next 16: as partes que dependem do pedido (sessão, banco)
  // carregam depois, e o resto da tela aparece na hora.
  cacheComponents: true,
  partialPrefetching: true,
  // Não gerar o AGENTS.md: o repositório guarda só o código.
  agentRules: false,
  // Não revelar a tecnologia usada no cabeçalho das respostas.
  poweredByHeader: false,
  // A página própria do item virou o painel lateral do Inventário: os links
  // antigos (/inventario/DSK0001) abrem a lista com o painel do item.
  async redirects() {
    return [
      {
        source: "/inventario/:codigo([A-Za-z]{2,5}[0-9]{4,})",
        destination: "/inventario?item=:codigo",
        permanent: false,
      },
      // O mesmo para a página própria do material.
      { source: "/materiais/:id(\\d+)", destination: "/materiais?material=:id", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
