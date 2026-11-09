"use client";

import { nomeDoCampo, valorParaOCampo } from "@/lib/caracteristicas/regras";
import type { Caracteristica } from "@/lib/caracteristicas/valores";

import { CampoSelecao, CampoTexto } from "../campo";

/**
 * Os campos das características de um tipo ou grupo (Cor, Comprimento…), no
 * formulário. Lista vira uma escolha; número aceita vírgula; texto é livre.
 * Todas são opcionais.
 */
export function CamposDasCaracteristicas({
  caracteristicas,
  valores,
  erros,
}: {
  caracteristicas: Caracteristica[];
  /** Os valores atuais, pelo nome do campo ("car_12") ou já guardados ({ "12": "Magenta" }). */
  valores: Record<string, string>;
  erros: Record<string, string>;
}) {
  return (
    <>
      {caracteristicas.map((c) => {
        const nome = nomeDoCampo(c.id);
        // O valor que voltou do servidor (com erro) vem como "car_12"; o guardado, como "12".
        const inicial = valores[nome] ?? valorParaOCampo(c, valores[String(c.id)]);
        const rotulo = c.tipo === "numero" && c.unidade ? `${c.nome} (${c.unidade})` : c.nome;
        if (c.tipo === "lista") {
          return (
            <CampoSelecao key={c.id} id={nome} name={nome} rotulo={rotulo} defaultValue={inicial} erro={erros[nome]}>
              <option value="">Não informado</option>
              {/* Um valor antigo que não está mais na lista continua aparecendo, para não sumir sem querer. */}
              {inicial && !c.opcoes.includes(inicial) ? <option value={inicial}>{inicial}</option> : null}
              {c.opcoes.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </CampoSelecao>
          );
        }
        return (
          <CampoTexto
            key={c.id}
            id={nome}
            name={nome}
            rotulo={rotulo}
            inputMode={c.tipo === "numero" ? "decimal" : undefined}
            maxLength={c.tipo === "numero" ? 20 : 100}
            autoComplete="off"
            placeholder={c.tipo === "numero" ? "Só o número" : undefined}
            defaultValue={inicial}
            erro={erros[nome]}
          />
        );
      })}
    </>
  );
}
