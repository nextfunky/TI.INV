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
