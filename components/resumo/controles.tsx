"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cx } from "@/lib/classes";

import { CampoSelecao } from "../campo";

/** "Lista | Resumo": as duas formas de ver a mesma lista filtrada. */
export function AlternarVisao({ lista, resumo, atual }: { lista: string; resumo: string; atual: "lista" | "resumo" }) {
  const opcao = (href: string, rotulo: string, ativa: boolean) => (
    <Link
      href={href}
      aria-current={ativa ? "page" : undefined}
      className={cx(
        "rounded-md px-3 py-1 text-sm transition-colors duration-150",
        ativa ? "bg-white font-medium text-gray-900 shadow-segmento" : "text-gray-600 hover:text-gray-900",
      )}
    >
      {rotulo}
    </Link>
  );
  return (
    <nav aria-label="Visão" className="inline-flex rounded-lg bg-gray-100 p-1 print:hidden">
      {opcao(lista, "Lista", atual === "lista")}
      {opcao(resumo, "Resumo", atual === "resumo")}
    </nav>
  );
}

/**
 * O que vai nas linhas (até duas dimensões) e nas colunas do Resumo. Mudar já
 * aplica (o endereço guarda a escolha).
 */
export function ControlesDoResumo({
  dimensoes,
  linhas,
  colunas,
  caminho,
  parametros,
}: {
  dimensoes: Array<{ id: string; rotulo: string }>;
  linhas: string[];
  colunas: string | null;
  caminho: string;
  /** Os outros parâmetros do endereço (filtros), que continuam valendo. */
  parametros: Record<string, string>;
}) {
  const router = useRouter();
  function aplicar(novasLinhas: string[], novasColunas: string | null) {
    const p = new URLSearchParams(parametros);
    p.set("visao", "resumo");
    p.set("linhas", novasLinhas.filter(Boolean).join(","));
    p.set("colunas", novasColunas ?? "nenhuma");
    router.push(`${caminho}?${p.toString()}`);
  }
  const opcoes = (excluir: string[]) => dimensoes.filter((d) => !excluir.includes(d.id));
  return (
    <div className="grid gap-3 sm:grid-cols-3 print:hidden">
      <CampoSelecao id="resumo-linhas" rotulo="Linhas" value={linhas[0]} onChange={(e) => aplicar([e.target.value, linhas[1]].filter((d) => d && d !== colunas), colunas === e.target.value ? null : colunas)}>
        {dimensoes.map((d) => (
          <option key={d.id} value={d.id}>
            {d.rotulo}
          </option>
        ))}
      </CampoSelecao>
      <CampoSelecao id="resumo-sublinhas" rotulo="E dentro de cada linha" value={linhas[1] ?? ""} onChange={(e) => aplicar([linhas[0], e.target.value], colunas === e.target.value ? null : colunas)}>
        <option value="">Nada</option>
        {opcoes([linhas[0]]).map((d) => (
          <option key={d.id} value={d.id}>
            {d.rotulo}
          </option>
        ))}
      </CampoSelecao>
      <CampoSelecao id="resumo-colunas" rotulo="Colunas" value={colunas ?? ""} onChange={(e) => aplicar(linhas, e.target.value || null)}>
        <option value="">Nenhuma (só o total)</option>
        {opcoes(linhas).map((d) => (
          <option key={d.id} value={d.id}>
            {d.rotulo}
          </option>
        ))}
      </CampoSelecao>
    </div>
  );
}
