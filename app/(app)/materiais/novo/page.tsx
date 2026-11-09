import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { FormularioDoMaterial } from "@/components/materiais/formulario";
import { Trilha } from "@/components/trilha";
import { exigirSessao } from "@/lib/auth/sessao";
import { listarCaracteristicas, porGrupo } from "@/lib/caracteristicas/servico";
import { obterBanco } from "@/lib/db";
import { listarLocais } from "@/lib/locais/servico";
import { compatibilidadesUsadas } from "@/lib/materiais/servico";

export const metadata: Metadata = { title: "Novo material" };

export default function PaginaNovoMaterial() {
  return (
    <>
      <Trilha partes={[{ rotulo: "Materiais", href: "/materiais" }, { rotulo: "Novo material" }]} />
      <CabecalhoDaPagina titulo="Novo material" subtitulo="Algo controlado por quantidade, sem código." />
      <div className="mt-8">
        <Suspense fallback={<div aria-hidden="true" className="h-[520px] max-w-2xl rounded-xl border border-gray-200 bg-white" />}>
          <Formulario />
        </Suspense>
      </div>
    </>
  );
}

async function Formulario() {
  await exigirSessao();
  const db = obterBanco();
  const [locais, compatibilidades, caracteristicas] = await Promise.all([listarLocais(db), compatibilidadesUsadas(db), listarCaracteristicas(db)]);
  return (
    <FormularioDoMaterial
      locais={locais.map(({ id, caminho }) => ({ id, caminho }))}
      compatibilidades={compatibilidades}
      caracteristicasPorGrupo={porGrupo(caracteristicas)}
    />
  );
}
