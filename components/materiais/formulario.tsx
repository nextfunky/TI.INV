"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ESTADO_INICIAL } from "@/lib/formulario";
import { CONDICOES, NOME_DA_CONDICAO } from "@/lib/itens/valores";
import { cadastrarMaterial, salvarMaterial } from "@/lib/materiais/acoes";
import { GRUPOS, NOME_DO_GRUPO } from "@/lib/materiais/valores";

import type { Caracteristica } from "@/lib/caracteristicas/valores";

import { classesDoBotao } from "../botao";
import { CamposDasCaracteristicas } from "../caracteristicas/campos";
import { BotaoEnviar } from "../botao-enviar";
import { CampoSelecao, CampoTexto, CampoTextoLongo, FaixaDeErro } from "../campo";
import { useFocarErro } from "../use-focar-erro";

/** O formulário de material: novo e editar. Na edição, a quantidade não aparece (ela muda pelos movimentos). */
export function FormularioDoMaterial({
  material,
  locais,
  compatibilidades = [],
  caracteristicasPorGrupo,
}: {
  material?: {
    id: number;
    nome: string;
    marcaModelo: string | null;
    compativelCom: string | null;
    caracteristicas: Record<string, string>;
    grupo: string;
    localId: number | null;
    condicao: string | null;
    observacoes: string | null;
  };
  locais: Array<{ id: number; caminho: string }>;
  /** Os valores já usados em "Compatível com", sugeridos ao digitar. */
  compatibilidades?: string[];
  /** As características de cada grupo: os campos mudam ao trocar o grupo. */
  caracteristicasPorGrupo: Partial<Record<string, Caracteristica[]>>;
}) {
  const acao = material ? salvarMaterial.bind(null, material.id) : cadastrarMaterial;
  const [estado, enviar] = useActionState(acao, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const erros = estado.erros ?? {};
  const valores: Record<string, string> = {
    nome: material?.nome ?? "",
    marcaModelo: material?.marcaModelo ?? "",
    compativelCom: material?.compativelCom ?? "",
    grupo: material?.grupo ?? "",
    localId: material?.localId ? String(material.localId) : "",
    condicao: material?.condicao ?? "",
    observacoes: material?.observacoes ?? "",
    quantidade: "",
    ...material?.caracteristicas,
    ...estado.valores,
  };
  const [grupo, setGrupo] = useState(valores.grupo);
  const caracteristicas = caracteristicasPorGrupo[grupo] ?? [];

  return (
    <form ref={formulario} action={enviar} noValidate className="max-w-2xl">
      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
        {Object.keys(erros).length ? (
          <div className="sm:col-span-2">
            <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro>
          </div>
        ) : null}
        <CampoTexto
          id="nome"
          name="nome"
          rotulo="Nome"
          placeholder="Ex.: Cabo HDMI"
          maxLength={100}
          autoFocus
          autoComplete="off"
          defaultValue={valores.nome}
          erro={erros.nome}
          className="sm:col-span-2"
        />
        <CampoTexto
          id="marcaModelo"
          name="marcaModelo"
          rotulo="Marca / modelo"
          placeholder="Ex.: Genérico 2 metros"
          maxLength={100}
          autoComplete="off"
          defaultValue={valores.marcaModelo}
          erro={erros.marcaModelo}
        />
        <CampoSelecao id="grupo" name="grupo" rotulo="Grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} erro={erros.grupo}>
          <option value="" disabled>
            Escolha o grupo
          </option>
          {GRUPOS.map((g) => (
            <option key={g} value={g}>
              {NOME_DO_GRUPO[g]}
            </option>
          ))}
        </CampoSelecao>
        <CampoTexto
          id="compativelCom"
          name="compativelCom"
          rotulo="Compatível com"
          placeholder="Ex.: Ricoh SP 3710"
          maxLength={100}
          autoComplete="off"
          list="compatibilidades"
          defaultValue={valores.compativelCom}
          erro={erros.compativelCom}
          dica="Opcional. Para que equipamento serve (toner, fonte, bateria…)."
          className="sm:col-span-2"
        />
        <datalist id="compatibilidades">
          {compatibilidades.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <CampoSelecao
          id="localId"
          name="localId"
          rotulo="Local"
          defaultValue={valores.localId}
          erro={erros.localId}
          dica="Onde o material está guardado."
          className="sm:col-span-2"
        >
          <option value="">Sem local definido</option>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>
              {l.caminho}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao id="condicao" name="condicao" rotulo="Condição" defaultValue={valores.condicao} erro={erros.condicao}>
          <option value="">Não informada</option>
          {CONDICOES.map((c) => (
            <option key={c} value={c}>
              {NOME_DA_CONDICAO[c]}
            </option>
          ))}
        </CampoSelecao>
        {material ? null : (
          <CampoTexto
            id="quantidade"
            name="quantidade"
            rotulo="Quantidade"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            defaultValue={valores.quantidade}
            erro={erros.quantidade}
            dica="Quantos existem hoje. Entra como a primeira entrada."
          />
        )}
        {caracteristicas.length ? (
          <fieldset className="grid gap-4 border-t border-gray-100 pt-4 sm:col-span-2 sm:grid-cols-2">
            <legend className="mb-1 text-13 font-medium text-gray-700 sm:col-span-2">Características</legend>
            {/* Ao trocar o grupo, os campos são outros: a chave recomeça os campos do zero. */}
            <CamposDasCaracteristicas key={grupo} caracteristicas={caracteristicas} valores={valores} erros={erros} />
          </fieldset>
        ) : null}
        <CampoTextoLongo
          id="observacoes"
          name="observacoes"
          rotulo="Observações"
          placeholder="Algo que valha registrar sobre o material."
          maxLength={5000}
          defaultValue={valores.observacoes}
          erro={erros.observacoes}
          className="sm:col-span-2"
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Link href={material ? `/materiais?material=${material.id}` : "/materiais"} className={classesDoBotao("secundario")}>
          Cancelar
        </Link>
        <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
      </div>
    </form>
  );
}
