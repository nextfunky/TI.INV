"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import { apagarItem, cadastrarItem, salvarItem } from "@/lib/itens/acoes";
import {
  CATEGORIAS,
  CONDICOES,
  NOME_DA_CATEGORIA,
  NOME_DA_CONDICAO,
  NOME_DO_STATUS,
  STATUS,
  type Categoria,
} from "@/lib/itens/valores";
import { cx } from "@/lib/classes";
import { ESTADO_INICIAL } from "@/lib/formulario";

import { BarraDeAcoes } from "../barra-de-acoes";
import { Botao, classesDoBotao } from "../botao";
import { BotaoEnviar } from "../botao-enviar";
import { CampoSelecao, CampoTexto, CampoTextoLongo, FaixaDeErro } from "../campo";
import { Confirmacao, Janela } from "../janela";
import { useFocarErro } from "../use-focar-erro";
import { JanelaNovoColaborador } from "./novo-colaborador";

export type TipoNoFormulario = { id: number; nome: string; categoria: Categoria };

type Props = {
  tipos: TipoNoFormulario[];
  /** As pessoas para a lista "Usuário", com o local de cada uma. */
  pessoas: Array<{ id: number; nome: string; caminho: string | null }>;
  /** Os locais, para o local próprio dos itens sem usuário. */
  locais: Array<{ id: number; caminho: string }>;
  /** Valores iniciais dos campos. */
  iniciais: Record<string, string>;
  /** Na edição: o item que está sendo editado. */
  item?: { id: number; codigo: string; titulo: string };
  /** Depois de "Salvar e cadastrar outro": o cursor já vai para o nº de série. */
  focarNaSerie?: boolean;
};

/** Uma seção do formulário: título e explicação à esquerda, campos à direita. */
function Secao({
  titulo,
  descricao,
  children,
  escondida,
  aparecer,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
  escondida?: boolean;
  aparecer?: boolean;
}) {
  return (
    <section
      hidden={escondida}
      className={cx(
        "grid gap-x-8 gap-y-4 border-t border-gray-100 p-6 first:border-t-0 md:grid-cols-3",
        aparecer && "animate-aparecer",
      )}
    >
      <div>
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="mt-1 text-13 text-gray-500">{descricao}</p>
      </div>
      <div className="grid content-start gap-4 sm:grid-cols-2 md:col-span-2">{children}</div>
    </section>
  );
}

/** O formulário de item: novo e editar. */
export function FormularioDoItem({ tipos, pessoas: pessoasIniciais, locais, iniciais, item, focarNaSerie }: Props) {
  const editando = Boolean(item);
  const acao = item ? salvarItem.bind(null, item.id) : cadastrarItem;
  const [estado, enviar] = useActionState(acao, ESTADO_INICIAL);
  const formulario = useFocarErro(estado);
  const [excluindo, setExcluindo] = useState(false);

  const valores = estado.valores ?? iniciais;
  const erros = estado.erros ?? {};
  const temErros = Object.keys(erros).length > 0;
  const valor = (campo: string) => valores[campo] ?? "";

  // A seção Computador aparece só para desktops e notebooks.
  const [tipoId, setTipoId] = useState(iniciais.tipoId ?? "");
  const [tipoMudou, setTipoMudou] = useState(false);
  const categoria = tipos.find((t) => String(t.id) === tipoId)?.categoria;
  const ehComputador = categoria === "computador";

  // Usuário e status andam juntos: escolher alguém num item em estoque passa
  // para "Em uso"; tirar a pessoa de um item em uso volta para "Em estoque".
  // Depois disso, o status ainda pode ser mudado à mão.
  const [pessoas, setPessoas] = useState(pessoasIniciais);
  const [usuarioId, setUsuarioId] = useState(iniciais.usuarioId ?? "");
  const [status, setStatus] = useState(iniciais.status || "em_estoque");
  const [novaPessoa, setNovaPessoa] = useState(false);

  const caminhoDaPessoa = pessoas.find((p) => String(p.id) === usuarioId)?.caminho ?? null;

  function escolherPessoa(id: string) {
    setUsuarioId(id);
    if (id && status === "em_estoque") setStatus("em_uso");
    if (!id && status === "em_uso") setStatus("em_estoque");
  }

  return (
    <>
      <form ref={formulario} action={enviar} noValidate>
        {temErros ? (
          <div className="mb-4">
            <FaixaDeErro>Confira os campos destacados abaixo.</FaixaDeErro>
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-white">
          <Secao titulo="Identificação" descricao="O que é o item.">
            <CampoSelecao
              id="tipoId"
              name="tipoId"
              rotulo="Tipo"
              className="sm:col-span-2"
              value={tipoId}
              onChange={(e) => {
                setTipoId(e.target.value);
                setTipoMudou(true);
              }}
              autoFocus={!editando && !focarNaSerie}
              erro={erros.tipoId}
              dica={editando ? "Se o tipo mudar, o item ganha um código novo." : undefined}
            >
              <option value="">Escolha o tipo</option>
              {CATEGORIAS.map((c) => {
                const doGrupo = tipos.filter((t) => t.categoria === c);
                if (!doGrupo.length) return null;
                return (
                  <optgroup key={c} label={NOME_DA_CATEGORIA[c].filtro}>
                    {doGrupo.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </CampoSelecao>
            <CampoTexto id="marca" name="marca" rotulo="Marca" placeholder="Ex.: Dell" maxLength={60} defaultValue={valor("marca")} erro={erros.marca} />
            <CampoTexto id="modelo" name="modelo" rotulo="Modelo" placeholder="Ex.: OptiPlex 7090" maxLength={100} defaultValue={valor("modelo")} erro={erros.modelo} />
            <CampoTexto
              id="numeroSerie"
              name="numeroSerie"
              rotulo="Nº de série"
              placeholder="Ex.: BR7X9K2"
              maxLength={100}
              autoFocus={focarNaSerie}
              spellCheck={false}
              defaultValue={valor("numeroSerie")}
              erro={erros.numeroSerie}
            />
          </Secao>

          <Secao titulo="Uso" descricao="Com quem o item está e em que situação.">
            <CampoSelecao
              id="usuarioId"
              name="usuarioId"
              rotulo="Usuário"
              className="sm:col-span-2"
              value={usuarioId}
              onChange={(e) => escolherPessoa(e.target.value)}
              erro={erros.usuarioId}
              acessorio={
                <button
                  type="button"
                  onClick={() => setNovaPessoa(true)}
                  className="text-13 font-medium text-accent transition-colors duration-150 hover:text-accent-forte"
                >
                  + Novo colaborador
                </button>
              }
            >
              <option value="">Sem usuário</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </CampoSelecao>
            <CampoSelecao id="status" name="status" rotulo="Status" value={status} onChange={(e) => setStatus(e.target.value)} erro={erros.status}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {NOME_DO_STATUS[s]}
                </option>
              ))}
            </CampoSelecao>
            <CampoSelecao id="condicao" name="condicao" rotulo="Condição" defaultValue={valor("condicao")} erro={erros.condicao}>
              <option value="">Não informada</option>
              {CONDICOES.map((c) => (
                <option key={c} value={c}>
                  {NOME_DA_CONDICAO[c]}
                </option>
              ))}
            </CampoSelecao>
            {/* Com usuário, o item fica onde a pessoa está; sem usuário, tem local próprio. */}
            {usuarioId ? (
              <p className="flex items-start gap-2 text-13 text-gray-600 sm:col-span-2">
                <MapPin aria-hidden="true" className="mt-px size-4 shrink-0 text-gray-500" />
                {caminhoDaPessoa
                  ? `Fica onde a pessoa está: ${caminhoDaPessoa}`
                  : "Fica onde a pessoa está (ela ainda não tem local definido)."}
              </p>
            ) : (
              <CampoSelecao
                id="localId"
                name="localId"
                rotulo="Local"
                className="sm:col-span-2"
                defaultValue={valor("localId")}
                erro={erros.localId}
                dica="Para itens sem usuário, como os do estoque."
              >
                <option value="">Sem local definido</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.caminho}
                  </option>
                ))}
              </CampoSelecao>
            )}
          </Secao>

          <Secao titulo="Computador" descricao="Só para desktops e notebooks." escondida={!ehComputador} aparecer={tipoMudou}>
            <CampoTexto id="hostname" name="hostname" rotulo="Hostname" placeholder="Ex.: FIN-PC-03" maxLength={63} spellCheck={false} defaultValue={valor("hostname")} erro={erros.hostname} />
            <CampoTexto id="processador" name="processador" rotulo="Processador" placeholder="Ex.: Intel Core i5-11500" maxLength={100} defaultValue={valor("processador")} erro={erros.processador} />
            <CampoTexto id="memoriaRam" name="memoriaRam" rotulo="Memória RAM" placeholder="Ex.: 16 GB" maxLength={30} defaultValue={valor("memoriaRam")} erro={erros.memoriaRam} />
            <CampoTexto id="armazenamento" name="armazenamento" rotulo="Armazenamento" placeholder="Ex.: SSD 512 GB" maxLength={60} defaultValue={valor("armazenamento")} erro={erros.armazenamento} />
            <CampoTexto
              id="sistemaOperacional"
              name="sistemaOperacional"
              rotulo="Sistema operacional"
              placeholder="Ex.: Windows 11 Pro"
              maxLength={60}
              className="sm:col-span-2"
              defaultValue={valor("sistemaOperacional")}
              erro={erros.sistemaOperacional}
            />
          </Secao>

          <Secao titulo="Compra e garantia" descricao="Avisamos no início quando a garantia estiver perto de vencer.">
            <CampoTexto id="dataCompra" name="dataCompra" type="date" rotulo="Data de compra" defaultValue={valor("dataCompra")} erro={erros.dataCompra} />
            <CampoTexto id="garantiaAte" name="garantiaAte" type="date" rotulo="Garantia até" defaultValue={valor("garantiaAte")} erro={erros.garantiaAte} />
          </Secao>

          <Secao titulo="Observações" descricao="Qualquer detalhe que ajude depois.">
            <CampoTextoLongo
              id="observacoes"
              name="observacoes"
              rotulo="Observações"
              rotuloEscondido
              className="sm:col-span-2"
              placeholder="Algo que valha registrar sobre o item."
              maxLength={5000}
              defaultValue={valor("observacoes")}
              erro={erros.observacoes}
            />
          </Secao>
        </div>

        <BarraDeAcoes
          esquerda={
            item ? (
              <Botao variante="perigo" onClick={() => setExcluindo(true)}>
                Excluir item
              </Botao>
            ) : null
          }
        >
          {/* "Salvar" vem primeiro no código para ser o botão do Enter, mas aparece por último. */}
          <BotaoEnviar enviando="Salvando…" className="order-last">
            Salvar
          </BotaoEnviar>
          <Link href={item ? `/inventario/${item.codigo}` : "/inventario"} className={classesDoBotao("secundario")}>
            Cancelar
          </Link>
          {item ? null : (
            <button type="submit" name="depois" value="outro" className={classesDoBotao("secundario", "max-sm:hidden")}>
              Salvar e cadastrar outro
            </button>
          )}
        </BarraDeAcoes>
      </form>

      <JanelaNovoColaborador
        aberta={novaPessoa}
        aoFechar={() => setNovaPessoa(false)}
        aoCadastrar={(pessoa) => {
          setPessoas((lista) =>
            [...lista, { ...pessoa, caminho: null }].sort((a, b) =>
              a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
            ),
          );
          escolherPessoa(String(pessoa.id));
          setNovaPessoa(false);
        }}
      />

      {item ? (
        <Janela aberta={excluindo} aoFechar={() => setExcluindo(false)} rotulo={`Excluir ${item.codigo}`}>
          <Confirmacao
            titulo={`Excluir ${item.codigo}?`}
            texto={
              <>
                {item.titulo} sai do inventário de vez. Se o item só deixou de ser usado, prefira mudar o status para{" "}
                <strong className="font-medium text-gray-900">Descartado</strong>.
              </>
            }
            botoes={
              <>
                <Botao onClick={() => setExcluindo(false)}>Cancelar</Botao>
                <form action={apagarItem.bind(null, item.id)}>
                  <BotaoEnviar variante="perigoSolido" enviando="Excluindo…">
                    Excluir
                  </BotaoEnviar>
                </form>
              </>
            }
          />
        </Janela>
      ) : null}
    </>
  );
}
