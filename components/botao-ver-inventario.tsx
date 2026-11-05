"use client";

import { List } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/lib/classes";

import { classesDoBotao } from "./botao";

/** "Ver inventário". Na própria página do Inventário, fica marcado. */
export function BotaoVerInventario({ marcado }: { marcado?: boolean }) {
  return marcado === undefined ? <ComPagina /> : <Botao marcado={marcado} />;
}

function ComPagina() {
  return <Botao marcado={usePathname() === "/inventario"} />;
}

function Botao({ marcado }: { marcado: boolean }) {
  return (
    <Link
      href="/inventario"
      aria-current={marcado ? "page" : undefined}
      className={cx(classesDoBotao("secundario"), marcado && "border-gray-300 bg-gray-100 hover:bg-gray-100")}
    >
      <List aria-hidden="true" />
      Ver inventário
    </Link>
  );
}
