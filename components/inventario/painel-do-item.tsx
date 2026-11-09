import { ArrowLeft, MapPin, Pencil, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { valorFormatado } from "@/lib/caracteristicas/regras";
import { caracteristicasDoTipo, simples } from "@/lib/caracteristicas/servico";
import { listarParaEscolha, tambemCom } from "@/lib/colaboradores/servico";
import { obterBanco } from "@/lib/db";
import { cx } from "@/lib/classes";
import { situacaoDaGarantia } from "@/lib/itens/garantia";
import { nomeCompletoDoItem, subtituloDoItem, tituloDoItem } from "@/lib/itens/nomes";
import { comItem } from "@/lib/itens/painel";
import { obterItemPorCodigo } from "@/lib/itens/servico";
import { NOME_DA_CONDICAO } from "@/lib/itens/valores";
import { historicoDoItem, totalDoHistorico } from "@/lib/historico/servico";
import { caminhoDeCima } from "@/lib/locais/arvore";
import { listarLocais } from "@/lib/locais/servico";
import { FUSO, formatarData, hojeEmSaoPaulo, tempoDesde } from "@/lib/texto/data";
import { juntar } from "@/lib/texto/plural";

import { Avatar } from "../avatar";
import { classesDoBotao } from "../botao";
import { DadosDasCaracteristicas } from "../caracteristicas/etiquetas";
import { ListaDoHistorico } from "../historico/lista";
import { IconeDoTipo } from "../icone-do-tipo";
import { EtiquetaDeStatus } from "../status";
import { AcoesRapidas } from "./acoes-rapidas";
import { ExcluirDoPainel } from "./excluir-do-painel";
import { TeclasDoPainel } from "./teclas-do-painel";

/**
 * A lista e o painel lado a lado. No computador a tela se divide: a lista à
 * esquerda, o painel fixo à direita. No celular, o painel ocupa a tela.
 * O atributo data-painel faz a área da página ficar mais larga (veja o layout).
 */
export function ComPainel({ painel, children }: { painel: ReactNode; children: ReactNode }) {
  if (!painel) return <>{children}</>;
  return (
    <div data-painel className="lg:flex lg:items-start lg:gap-6">
      <div className="min-w-0 flex-1">{children}</div>
      {painel}
    </div>
  );
}

/** A caixa do painel: fixa à direita no computador; a tela inteira no celular. */
export const MOLDURA_DO_PAINEL =
  "fixed inset-0 z-30 overflow-y-auto bg-white lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:max-h-[calc(100dvh-3rem)] lg:w-[360px] lg:shrink-0 lg:rounded-xl lg:border lg:border-gray-200 xl:w-[400px]";

/** Enquanto o painel carrega: o mesmo tamanho, sem conteúdo. */
export function PainelCarregando() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-30 bg-white p-5 lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:h-[420px] lg:w-[360px] lg:shrink-0 lg:rounded-xl lg:border lg:border-gray-200 xl:w-[400px]"
    >
      <div className="h-4 w-20 rounded bg-gray-100" />
      <div className="mt-3 h-6 w-48 rounded bg-gray-100" />
      <div className="mt-3 h-5 w-32 rounded bg-gray-100" />
      <div className="mt-8 h-24 rounded-lg bg-gray-50" />
    </div>
  );
}

/** Quantos registros do histórico o painel mostra (o resto, na tela Histórico). */
const REGISTROS_NO_PAINEL = 8;

const formatoDeData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });

function Dado({ rotulo, vazio = "Não informado", mono, children }: { rotulo: string; vazio?: string; mono?: boolean; children?: ReactNode }) {
  const temValor = children !== null && children !== undefined && children !== "";
  return (
    <div className="min-w-0">
      <dt className="text-13 text-gray-500">{rotulo}</dt>
      <dd className={cx("mt-0.5 break-words", !temValor && "text-gray-500", temValor && mono && "font-mono text-13")}>
        {temValor ? children : vazio}
      </dd>
    </div>
  );
}

export function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="border-t border-gray-100 px-5 py-4">
      <h3 className="text-13 font-medium text-gray-500">{titulo}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * O painel de detalhes do item, ao lado da lista. Só leva para outra tela
 * quem clica em Editar (ou num link de pessoa ou local).
 * `lista` é o endereço da lista sem o painel; `codigos` são os itens da lista, na ordem (para ↑ e ↓).
 */
export async function PainelDoItem({ codigo, lista, codigos }: { codigo: string; lista: string; codigos: string[] }) {
  const db = obterBanco();
  const item = await obterItemPorCodigo(db, codigo);
  const fechar = comItem(lista, null);
  const posicao = codigos.indexOf(item?.codigo ?? codigo);
  const enderecos = codigos.map((c) => comItem(lista, c));

  const moldura = MOLDURA_DO_PAINEL;

  if (!item) {
    return (
      <aside aria-label={`Detalhes de ${codigo}`} className={moldura}>
        <TeclasDoPainel fechar={fechar} />
        <div className="flex items-start justify-between gap-3 p-5">
          <p className="text-gray-600">O item {codigo} não existe mais.</p>
          <Link href={fechar} scroll={false} aria-label="Fechar" className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <X aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </aside>
    );
  }

  const [outros, historico, totalNoHistorico, pessoas, todosOsLocais, caracteristicas] = await Promise.all([
    item.usuario ? tambemCom(db, item.usuario.id, item.id) : null,
    historicoDoItem(db, item.id, REGISTROS_NO_PAINEL),
    totalDoHistorico(db, item.id),
    listarParaEscolha(db),
    listarLocais(db),
    caracteristicasDoTipo(db, item.tipoId),
  ]);
  const agora = new Date();
  const titulo = tituloDoItem(item);
  const marcaEModelo = [item.marca, item.modelo].filter(Boolean).join(" ");
  const garantia = situacaoDaGarantia(item.garantiaAte, hojeEmSaoPaulo(agora));

  return (
    <aside aria-label={`Detalhes de ${item.codigo}`} className={moldura}>
      <TeclasDoPainel fechar={fechar} enderecos={enderecos} atual={posicao} />

      {/* No celular, o painel cobre a lista: o caminho de volta fica no alto. */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 py-3 lg:hidden">
        <Link href={fechar} scroll={false} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar à lista
        </Link>
      </div>

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-13 text-gray-500">{item.codigo}</p>
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
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em] break-words">{titulo}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <EtiquetaDeStatus status={item.status} />
          <span className="text-13 text-gray-500">{juntar(item.tipo.nome, subtituloDoItem(item))}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/inventario/${item.codigo}/editar`} className={classesDoBotao("secundario")}>
            <Pencil aria-hidden="true" />
            Editar
          </Link>
          <ExcluirDoPainel id={item.id} codigo={item.codigo} titulo={titulo} voltarPara={fechar} />
        </div>
      </div>

      <Bloco titulo="Usuário e local">
        {item.usuario ? (
          <Link href={`/colaboradores/${item.usuario.id}`} className="flex items-center gap-3 font-medium hover:text-accent">
            <Avatar nome={item.usuario.nome} tamanho={32} />
            <span className="min-w-0 break-words">{item.usuario.nome}</span>
          </Link>
        ) : (
          <p className="text-gray-500">Sem usuário.</p>
        )}
        <div className="mt-3 flex items-start gap-2 text-gray-700">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gray-500" />
          {item.local ? (
            <span className="min-w-0">
              <Link href={`/locais/${item.local.id}`} className="break-words hover:text-accent">
                {item.local.nome}
              </Link>
              {caminhoDeCima(item.local.caminho) ? (
                <span className="text-gray-500"> · {caminhoDeCima(item.local.caminho)}</span>
              ) : null}
              {item.usuario ? <span className="block text-13 text-gray-500">Onde {item.usuario.nome} está.</span> : null}
            </span>
          ) : (
            <span className="text-gray-500">
              {item.usuario ? `${item.usuario.nome} ainda não tem local.` : "Sem local definido."}
            </span>
          )}
        </div>
      </Bloco>

      {item.status !== "descartado" ? (
        <div className="px-5 pb-4">
          <AcoesRapidas
            item={{
              id: item.id,
              codigo: item.codigo,
              titulo,
              usuarioId: item.usuario?.id ?? null,
              usuario: item.usuario?.nome ?? null,
              descartado: false,
            }}
            pessoas={pessoas.map(({ id, nome }) => ({ id, nome }))}
            locais={todosOsLocais.map(({ id, caminho }) => ({ id, caminho }))}
          />
        </div>
      ) : null}

      <Bloco titulo="Identificação">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Dado rotulo="Tipo">{item.tipo.nome}</Dado>
          <Dado rotulo="Condição" vazio="Não informada">
            {item.condicao ? NOME_DA_CONDICAO[item.condicao] : null}
          </Dado>
          <Dado rotulo="Marca e modelo">{marcaEModelo}</Dado>
          <Dado rotulo="Nº de série" mono>
            {item.numeroSerie}
          </Dado>
        </dl>
      </Bloco>

      {caracteristicas.length ? (
        <Bloco titulo="Características">
          <DadosDasCaracteristicas caracteristicas={caracteristicas.map(simples)} valores={item.caracteristicas} formatar={valorFormatado} />
        </Bloco>
      ) : null}

      {item.tipo.categoria === "computador" ? (
        <Bloco titulo="Computador">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Dado rotulo="Hostname" mono>
              {item.hostname}
            </Dado>
            <Dado rotulo="Memória RAM" vazio="Não informada">
              {item.memoriaRam}
            </Dado>
            <Dado rotulo="Processador">{item.processador}</Dado>
            <Dado rotulo="Armazenamento">{item.armazenamento}</Dado>
            <Dado rotulo="Sistema operacional">{item.sistemaOperacional}</Dado>
          </dl>
        </Bloco>
      ) : null}

      <Bloco titulo="Compra e garantia">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Dado rotulo="Data de compra" vazio="Não informada">
            {item.dataCompra ? formatarData(item.dataCompra) : null}
          </Dado>
          <Dado rotulo="Garantia até" vazio="Não informada">
            {item.garantiaAte ? (
              <>
                {formatarData(item.garantiaAte)}
                {garantia ? (
                  <span className={cx("block text-13", garantia.vencida ? "text-descartado" : "text-gray-500")}>{garantia.texto}</span>
                ) : null}
              </>
            ) : null}
          </Dado>
        </dl>
      </Bloco>

      <Bloco titulo="Observações">
        <p className={cx("whitespace-pre-line break-words", !item.observacoes && "text-gray-500")}>
          {item.observacoes || "Nenhuma observação."}
        </p>
      </Bloco>

      {item.usuario && outros?.itens.length ? (
        <Bloco titulo={`Também com ${item.usuario.nome} · ${outros.total}`}>
          <ul className="-mx-2">
            {outros.itens.map((outro) => (
              <li key={outro.id}>
                <Link
                  href={comItem(lista, outro.codigo)}
                  scroll={false}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-gray-50"
                >
                  <IconeDoTipo icone={outro.tipo.icone} className="size-4 shrink-0 text-gray-500" />
                  <span className="min-w-0 flex-1 truncate">{nomeCompletoDoItem(outro)}</span>
                  <span className="font-mono text-12 text-gray-500">{outro.codigo}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/colaboradores/${item.usuario.id}`}
            className="mt-2 inline-block text-13 font-medium text-accent transition-colors duration-150 hover:text-accent-forte"
          >
            Ver tudo com {item.usuario.nome}
          </Link>
        </Bloco>
      ) : null}

      <Bloco titulo={totalNoHistorico ? `Histórico · ${totalNoHistorico}` : "Histórico"}>
        {historico.length ? (
          <>
            <ListaDoHistorico registros={historico} />
            {totalNoHistorico > historico.length ? (
              <Link
                href={`/historico?item=${item.codigo}`}
                className="mt-3 inline-block text-13 font-medium text-accent transition-colors duration-150 hover:text-accent-forte"
              >
                Ver todo o histórico
              </Link>
            ) : null}
          </>
        ) : (
          <p className="text-gray-500">Nada registrado ainda. As entregas, devoluções e mudanças de local aparecem aqui.</p>
        )}
      </Bloco>

      <Bloco titulo="Registro">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Dado rotulo="Cadastrado em">{formatoDeData.format(item.criadoEm)}</Dado>
          <Dado rotulo="Última alteração">{tempoDesde(item.atualizadoEm, agora)}</Dado>
        </dl>
      </Bloco>

      <p className="hidden border-t border-gray-100 px-5 py-3 text-12 text-gray-500 lg:block">
        Use ↑ e ↓ para passar pelos itens da lista, e Esc para fechar.
      </p>
    </aside>
  );
}
