import { ArrowLeft, MapPin, Pencil, X } from "lucide-react";
import Link from "next/link";

import { cx } from "@/lib/classes";
import { listarParaEscolha } from "@/lib/colaboradores/servico";
import { obterBanco } from "@/lib/db";
import { NOME_DA_CONDICAO } from "@/lib/itens/valores";
import { comMaterial } from "@/lib/materiais/filtros";
import { nomeDoMaterial } from "@/lib/materiais/nomes";
import { movimentosDoMaterial, obterMaterial } from "@/lib/materiais/servico";
import { NOME_DO_GRUPO, NOME_DO_MOVIMENTO } from "@/lib/materiais/valores";
import { formatarDataHora } from "@/lib/texto/data";
import { juntar } from "@/lib/texto/plural";

import { classesDoBotao } from "../botao";
import { Bloco, MOLDURA_DO_PAINEL } from "../inventario/painel-do-item";
import { TeclasDoPainel } from "../inventario/teclas-do-painel";
import { ExcluirMaterial } from "./excluir";
import { BotoesDeMovimento } from "./movimentos";

const numero = (n: number) => n.toLocaleString("pt-BR");

/** "+5" na entrada, "−2" na saída e a diferença (com sinal) no ajuste. */
function variacao(tipo: "entrada" | "saida" | "ajuste", quantidade: number): string {
  const valor = tipo === "saida" ? -quantidade : quantidade;
  return valor > 0 ? `+${numero(valor)}` : `−${numero(-valor)}`;
}

/** Quantos movimentos o painel mostra (o total aparece no título do bloco). */
const MOVIMENTOS_NO_PAINEL = 30;

/**
 * O painel de detalhes do material, ao lado da lista: saldo, Entrada, Saída,
 * Ajuste de contagem e o histórico. Só Editar leva para outra tela.
 */
export async function PainelDoMaterial({ id, lista, ids }: { id: number; lista: string; ids: number[] }) {
  const db = obterBanco();
  const material = await obterMaterial(db, id);
  const fechar = comMaterial(lista, null);
  const posicao = ids.indexOf(id);
  const enderecos = ids.map((i) => comMaterial(lista, i));

  if (!material) {
    return (
      <aside aria-label="Material" className={MOLDURA_DO_PAINEL}>
        <TeclasDoPainel fechar={fechar} />
        <div className="flex items-start justify-between gap-3 p-5">
          <p className="text-gray-600">Este material não existe mais.</p>
          <Link href={fechar} scroll={false} aria-label="Fechar" className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <X aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </aside>
    );
  }

  const [movimentos, pessoas] = await Promise.all([movimentosDoMaterial(db, id), listarParaEscolha(db)]);
  const nomeCompleto = nomeDoMaterial(material);

  return (
    <aside aria-label={`Detalhes de ${nomeCompleto}`} className={MOLDURA_DO_PAINEL}>
      <TeclasDoPainel fechar={fechar} enderecos={enderecos} atual={posicao} />

      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 py-3 lg:hidden">
        <Link href={fechar} scroll={false} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar à lista
        </Link>
      </div>

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-13 text-gray-500">{NOME_DO_GRUPO[material.grupo]}</p>
          <Link
            href={fechar}
            scroll={false}
            aria-label="Fechar o painel"
            title="Fechar (Esc)"
            className="-mt-1 -mr-1 hidden rounded-md p-1 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-900 lg:block"
          >
            <X aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em] break-words">{material.nome}</h2>
        <p className="mt-0.5 text-gray-500">
          {juntar(material.marcaModelo, material.condicao ? NOME_DA_CONDICAO[material.condicao] : null) || "Sem marca/modelo"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/materiais/${id}/editar`} className={classesDoBotao("secundario")}>
            <Pencil aria-hidden="true" />
            Editar
          </Link>
          {material.temSaidas ? null : <ExcluirMaterial id={id} nome={nomeCompleto} voltarPara={fechar} />}
        </div>
      </div>

      <section aria-label="Estoque" className="border-t border-gray-100 px-5 py-4">
        <p className="flex items-baseline gap-2">
          <span className={cx("text-32 font-semibold tabular-nums", material.quantidade === 0 && "text-gray-400")}>
            {numero(material.quantidade)}
          </span>
          <span className="text-gray-500">em estoque</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-13 text-gray-500">
          <MapPin aria-hidden="true" className="size-3.5" />
          {material.localId && material.caminho ? (
            <Link href={`/locais/${material.localId}`} className="hover:text-gray-900">
              {material.caminho}
            </Link>
          ) : (
            "Sem local definido"
          )}
        </p>
        <div className="mt-4">
          <BotoesDeMovimento
            material={{ id, nome: nomeCompleto, quantidade: material.quantidade }}
            pessoas={pessoas.map(({ id: i, nome }) => ({ id: i, nome }))}
          />
        </div>
      </section>

      {material.observacoes ? (
        <Bloco titulo="Observações">
          <p className="whitespace-pre-line break-words">{material.observacoes}</p>
        </Bloco>
      ) : null}

      <Bloco titulo={movimentos.length ? `Histórico · ${movimentos.length}` : "Histórico"}>
        {movimentos.length ? (
          <ol aria-label="Histórico do material" className="flex flex-col gap-3">
            {movimentos.slice(0, MOVIMENTOS_NO_PAINEL).map((m) => (
              <li key={m.id}>
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{NOME_DO_MOVIMENTO[m.tipo]}</span>
                  <span className="font-mono text-13 tabular-nums">
                    {variacao(m.tipo, m.quantidade)} <span className="text-gray-500">→ {numero(m.saldo)}</span>
                  </span>
                </p>
                <p className="text-13 text-gray-500">
                  {formatarDataHora(m.criadoEm)}
                  {m.pessoa ? (
                    <>
                      {" · "}
                      <Link href={`/colaboradores/${m.pessoa.id}`} className="text-gray-700 hover:text-accent">
                        {m.pessoa.nome}
                      </Link>
                    </>
                  ) : null}
                  {m.observacao ? ` · ${m.observacao}` : ""}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-500">Nenhum movimento ainda. Use Entrada quando chegar material.</p>
        )}
        {movimentos.length > MOVIMENTOS_NO_PAINEL ? (
          <p className="mt-3 text-13 text-gray-500">Mostrando os {MOVIMENTOS_NO_PAINEL} mais recentes.</p>
        ) : null}
      </Bloco>

      <p className="hidden border-t border-gray-100 px-5 py-3 text-12 text-gray-500 lg:block">
        Use ↑ e ↓ para passar pelos materiais da lista, e Esc para fechar.
      </p>
    </aside>
  );
}
