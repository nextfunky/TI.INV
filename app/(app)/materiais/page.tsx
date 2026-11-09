import { Boxes, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { classesDoBotao } from "@/components/botao";
import { CabecalhoCarregando, CabecalhoDaPagina } from "@/components/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { ComPainel, PainelCarregando } from "@/components/inventario/painel-do-item";
import { FiltrosDosMateriaisNaTela } from "@/components/materiais/filtros";
import { ListaDeMateriais } from "@/components/materiais/lista";
import { PainelDoMaterial } from "@/components/materiais/painel-do-material";
import { BotaoImprimir } from "@/components/relatorios/botao-imprimir";
import { RelatorioDeConferencia } from "@/components/relatorios/conferencia";
import { AlternarVisao, ControlesDoResumo } from "@/components/resumo/controles";
import { TabelaDoResumo } from "@/components/resumo/tabela";
import { exigirSessao } from "@/lib/auth/sessao";
import { SEM_VALOR } from "@/lib/caracteristicas/filtros";
import { descreverFiltros } from "@/lib/caracteristicas/regras";
import { listarCaracteristicas, opcoesDosFiltros, porGrupo } from "@/lib/caracteristicas/servico";
import { obterBanco } from "@/lib/db";
import { CONDICOES, NOME_DA_CONDICAO } from "@/lib/itens/valores";
import { listarLocais } from "@/lib/locais/servico";
import { enderecoDosMateriais, filtrandoMateriais, lerFiltrosDosMateriais, materialDoEndereco } from "@/lib/materiais/filtros";
import { dimensoesDosMateriais, eixosPadraoDosMateriais } from "@/lib/materiais/resumo";
import { compatibilidadesUsadas, listarMateriais, resumoDosMateriais } from "@/lib/materiais/servico";
import { NOME_DO_GRUPO } from "@/lib/materiais/valores";
import { lerEixos, montarResumo, parametrosDoResumo } from "@/lib/resumo/tabela";
import { juntar, plural } from "@/lib/texto/plural";

export const metadata: Metadata = { title: "Materiais" };

type Props = PageProps<"/materiais">;

export default function PaginaMateriais({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true">
          <CabecalhoCarregando />
          <div className="mt-8 h-8 max-w-md rounded-full bg-gray-100" />
          <div className="mt-6 h-80 rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <Materiais searchParams={searchParams} />
    </Suspense>
  );
}

const numero = (n: number) => n.toLocaleString("pt-BR");

async function Materiais({ searchParams }: Pick<Props, "searchParams">) {
  await exigirSessao();
  const parametros = await searchParams;
  const filtros = lerFiltrosDosMateriais(parametros);
  const visao = parametros.visao === "resumo" ? "resumo" : "lista";
  const aberto = visao === "lista" ? materialDoEndereco(parametros) : null;
  const db = obterBanco();
  const [totais, lista, locais, compatibilidades, todasAsCaracteristicas] = await Promise.all([
    resumoDosMateriais(db),
    listarMateriais(db, filtros),
    listarLocais(db),
    compatibilidadesUsadas(db),
    listarCaracteristicas(db),
  ]);
  const caracteristicasPorGrupo = porGrupo(todasAsCaracteristicas);
  const doGrupo = filtros.grupo ? (caracteristicasPorGrupo[filtros.grupo] ?? []) : [];
  const filtrando = filtrandoMateriais(filtros);
  const endereco = enderecoDosMateriais(filtros);

  // Os filtros por característica do grupo escolhido.
  const filtrosDeCaracteristicas = filtros.grupo ? await opcoesDosFiltros(db, todasAsCaracteristicas.filter((c) => c.grupo === filtros.grupo)) : [];

  // Os filtros da tela em frases curtas (para a janela do relatório e para o Resumo).
  const descricaoDosFiltros = [
    filtros.grupo ? NOME_DO_GRUPO[filtros.grupo] : null,
    filtros.nome ?? null,
    ...descreverFiltros(doGrupo, filtros.caracteristicas),
    filtros.local === "sem" ? "Sem local definido" : filtros.local ? (locais.find((l) => l.id === filtros.local)?.caminho ?? null) : null,
    filtros.condicao ? (filtros.condicao === "nenhuma" ? "Condição não informada" : NOME_DA_CONDICAO[filtros.condicao]) : null,
    filtros.compativel ? (filtros.compativel === SEM_VALOR ? "Compatível com: não informado" : `Compatível com ${filtros.compativel}`) : null,
    filtros.busca ? `Busca “${filtros.busca}”` : null,
  ].filter((t): t is string => Boolean(t));

  // Totais por condição (cadastros e unidades), para conferir de relance.
  const porCondicao = [...CONDICOES, null]
    .map((c) => {
      const daCondicao = lista.filter((m) => m.condicao === c);
      return { condicao: c, cadastros: daCondicao.length, unidades: daCondicao.reduce((s, m) => s + m.quantidade, 0) };
    })
    .filter((c) => c.cadastros);

  const painel = aberto ? (
    <Suspense key={aberto} fallback={<PainelCarregando />}>
      <PainelDoMaterial id={aberto} lista={endereco} ids={lista.map((m) => m.id)} />
    </Suspense>
  ) : null;

  // O Resumo: a tabela cruzada, com o cruzamento que já vem montado para o grupo.
  const dimensoes = dimensoesDosMateriais(doGrupo);
  const eixos = lerEixos(
    parametros,
    dimensoes.map((d) => d.id),
    eixosPadraoDosMateriais(filtros.grupo, doGrupo),
  );
  const parametrosDosFiltros = Object.fromEntries(new URLSearchParams(endereco.split("?")[1] ?? ""));
  const enderecoDoResumo = `/materiais?${new URLSearchParams({ ...parametrosDosFiltros, visao: "resumo" }).toString()}`;
  const dimensoesDasLinhas = eixos.linhas.map((id) => dimensoes.find((d) => d.id === id)!);
  const dimensaoDaColuna = eixos.colunas ? (dimensoes.find((d) => d.id === eixos.colunas) ?? null) : null;
  return (
    <ComPainel painel={painel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CabecalhoDaPagina
          titulo="Materiais"
          subtitulo={
            totais.materiais
              ? filtrando
                ? `Mostrando ${plural(lista.length, "material", "materiais")} de ${totais.materiais}`
                : juntar(plural(totais.materiais, "material", "materiais"), plural(totais.unidades, "unidade em estoque", "unidades em estoque"))
              : "O que é controlado por quantidade: cabos, toners, mousepads…"
          }
        />
        <div className="flex flex-wrap gap-2 print:hidden">
          {totais.materiais ? (
            <RelatorioDeConferencia
              origem="materiais"
              filtrosAtuais={Object.fromEntries(
                [
                  ["mq", filtros.busca],
                  ["grupos", filtros.grupo],
                  ["local", filtros.local ? String(filtros.local) : undefined],
                  ["mcondicao", filtros.condicao],
                  ["mcompativel", filtros.compativel],
                  ["mnome", filtros.nome],
                  ...Object.entries(filtros.caracteristicas ?? {}).map(([id, v]) => [`mc${id}`, v]),
                ].filter((par): par is [string, string] => Boolean(par[1])),
              )}
              resumoDosFiltros={descricaoDosFiltros}
              locais={locais.map(({ id, caminho }) => ({ id, caminho }))}
            />
          ) : null}
          <Link href="/materiais/novo" className={classesDoBotao("secundario")}>
            <Plus aria-hidden="true" />
            Novo material
          </Link>
        </div>
      </div>

      {totais.materiais ? (
        <div className="mt-8 print:mt-4">
          <div className="print:hidden">
            <FiltrosDosMateriaisNaTela
              filtros={filtros}
              locais={locais.map(({ id, caminho }) => ({ id, caminho }))}
              compatibilidades={compatibilidades}
              caracteristicas={filtrosDeCaracteristicas}
              manter={parametrosDoResumo(parametros)}
            />
          </div>
          {lista.length ? (
            <p className="mt-3 text-13 text-gray-600">
              {porCondicao
                .map((c) => `${c.condicao ? NOME_DA_CONDICAO[c.condicao] : "Não informada"}: ${plural(c.cadastros, "material", "materiais")} (${numero(c.unidades)} un.)`)
                .join(" · ")}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <AlternarVisao lista={endereco} resumo={enderecoDoResumo} atual={visao} />
            {visao === "resumo" && lista.length ? <BotaoImprimir /> : null}
          </div>
        </div>
      ) : null}

      {visao === "resumo" && lista.length ? (
        <section aria-label="Resumo" className="mt-6">
          <ControlesDoResumo
            dimensoes={dimensoes.map(({ id, rotulo }) => ({ id, rotulo }))}
            linhas={eixos.linhas}
            colunas={eixos.colunas}
            caminho="/materiais"
            parametros={parametrosDosFiltros}
          />
          <p className="mt-4 mb-2 text-13 text-gray-500">
            {descricaoDosFiltros.length ? `${descricaoDosFiltros.join(" · ")}. ` : ""}Quantidades em unidades.
            <span className="print:hidden"> Clique num número para ver os materiais.</span>
          </p>
          <TabelaDoResumo
            resumo={montarResumo(lista, dimensoesDasLinhas, dimensaoDaColuna, (m) => m.quantidade)}
            rotulosDasLinhas={dimensoesDasLinhas.map((d) => d.rotulo)}
            rotuloDaColuna={dimensaoDaColuna?.rotulo ?? null}
            endereco={(filtro) => enderecoDosMateriais(lerFiltrosDosMateriais({ ...parametrosDosFiltros, ...filtro }))}
            unidade="unidades"
          />
        </section>
      ) : (
        <div className="mt-6">
          {lista.length ? (
            <ListaDeMateriais lista={lista} aberto={aberto} endereco={endereco} caracteristicasPorGrupo={caracteristicasPorGrupo} />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white">
              {filtrando ? (
                <EstadoVazio
                  icone={Search}
                  titulo="Nenhum material encontrado"
                  texto="Tente outra busca ou outro filtro."
                  acao={
                    <Link href="/materiais" className={classesDoBotao("secundario")}>
                      Limpar filtros
                    </Link>
                  }
                />
              ) : (
                <EstadoVazio
                  icone={Boxes}
                  titulo="Nenhum material cadastrado"
                  texto="Cadastre o que é controlado por quantidade, como cabos, toners e mousepads."
                  acao={
                    <Link href="/materiais/novo" className={classesDoBotao("secundario")}>
                      <Plus aria-hidden="true" />
                      Novo material
                    </Link>
                  }
                />
              )}
            </div>
          )}
        </div>
      )}
    </ComPainel>
  );
}
