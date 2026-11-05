import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { CATEGORIAS, CONDICOES, STATUS } from "@/lib/itens/valores";
import { GRUPOS, TIPOS_DE_MOVIMENTO } from "@/lib/materiais/valores";

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow();

/**
 * A conta de login. Existe no máximo uma: o `id` é sempre 1, e o banco
 * recusa qualquer outra linha.
 */
export const contas = pgTable(
  "contas",
  {
    id: integer("id").primaryKey().default(1),
    usuario: text("usuario").notNull(),
    senhaHash: text("senha_hash").notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [check("contas_uma_so", sql`${t.id} = 1`)],
);

/**
 * Sessões abertas (cada navegador em que a conta entrou).
 * O `id` é o SHA-256 do token guardado no cookie: quem lê o banco não
 * consegue usar o valor para entrar.
 */
export const sessoes = pgTable(
  "sessoes",
  {
    id: text("id").primaryKey(),
    contaId: integer("conta_id")
      .notNull()
      .references(() => contas.id, { onDelete: "cascade" }),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index("sessoes_conta_id_idx").on(t.contaId)],
);

export const categoriaDoTipo = pgEnum("categoria_do_tipo", CATEGORIAS);
export const statusDoItem = pgEnum("status_do_item", STATUS);

/**
 * O que o item é: Desktop, Monitor, Impressora...
 * Cada tipo tem o seu prefixo de código e conta os seus números separado.
 */
export const tiposDeItem = pgTable(
  "tipos_de_item",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nome: text("nome").notNull(),
    categoria: categoriaDoTipo("categoria").notNull().default("outro"),
    prefixo: text("prefixo").notNull(),
    /** Nome do ícone (Lucide). Os tipos criados pelo usuário usam "package". */
    icone: text("icone").notNull().default("package"),
    /** Último número de código já usado. Só aumenta, nunca volta. */
    ultimoNumero: integer("ultimo_numero").notNull().default(0),
    criadoEm: criadoEm(),
  },
  (t) => [
    uniqueIndex("tipos_de_item_nome_unico").on(sql`lower(${t.nome})`),
    uniqueIndex("tipos_de_item_prefixo_unico").on(t.prefixo),
    check("tipos_de_item_prefixo_formato", sql`${t.prefixo} ~ '^[A-Z]{2,5}$'`),
    check("tipos_de_item_ultimo_numero_positivo", sql`${t.ultimoNumero} >= 0`),
  ],
);

/**
 * Os lugares da empresa, em árvore livre: um local pode ficar dentro de outro.
 * O `caminho` ("Filial 04 › 2º andar › Financeiro") é guardado pronto e
 * refeito sempre que um local é renomeado ou movido.
 */
export const locais = pgTable(
  "locais",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nome: text("nome").notNull(),
    paiId: integer("pai_id").references((): AnyPgColumn => locais.id, { onDelete: "restrict" }),
    caminho: text("caminho").notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    // Dois locais com o mesmo nome não podem ficar dentro do mesmo pai.
    uniqueIndex("locais_nome_unico_no_pai").on(sql`coalesce(${t.paiId}, 0)`, sql`lower(${t.nome})`),
    index("locais_pai_id_idx").on(t.paiId),
    check("locais_nao_dentro_de_si", sql`${t.paiId} is null or ${t.paiId} <> ${t.id}`),
  ],
);

/**
 * As pessoas que usam os equipamentos. Não acessam o sistema: são só um cadastro.
 * A `chave` é o nome normalizado (espaços colapsados, minúsculas), para que
 * "JOÃO LIMA" e "João Lima" sejam a mesma pessoa.
 */
export const colaboradores = pgTable(
  "colaboradores",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nome: text("nome").notNull(),
    chave: text("chave").notNull(),
    /** Onde a pessoa senta. Os itens com ela ficam aqui. */
    localId: integer("local_id").references(() => locais.id, { onDelete: "restrict" }),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [uniqueIndex("colaboradores_chave_unica").on(t.chave), index("colaboradores_local_id_idx").on(t.localId)],
);

export const condicaoDoItem = pgEnum("condicao_do_item", CONDICOES);

/** Cada equipamento do inventário. */
export const itens = pgTable(
  "itens",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    codigo: text("codigo").notNull(),
    tipoId: integer("tipo_id")
      .notNull()
      .references(() => tiposDeItem.id, { onDelete: "restrict" }),
    marca: text("marca"),
    modelo: text("modelo"),
    numeroSerie: text("numero_serie"),
    /** Com quem o item está. Não dá para excluir uma pessoa que tem itens. */
    usuarioId: integer("usuario_id").references(() => colaboradores.id, { onDelete: "restrict" }),
    /** Local próprio: só para itens sem usuário (com usuário, o item fica onde a pessoa está). */
    localId: integer("local_id").references(() => locais.id, { onDelete: "restrict" }),
    status: statusDoItem("status").notNull().default("em_estoque"),
    /** Estado de conservação: Novo, Bom, Usado, Regular, Defeituoso. */
    condicao: condicaoDoItem("condicao"),
    // Só para computadores (desktops e notebooks).
    hostname: text("hostname"),
    processador: text("processador"),
    memoriaRam: text("memoria_ram"),
    armazenamento: text("armazenamento"),
    sistemaOperacional: text("sistema_operacional"),
    // Compra e garantia.
    dataCompra: date("data_compra", { mode: "string" }),
    garantiaAte: date("garantia_ate", { mode: "string" }),
    observacoes: text("observacoes"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("itens_codigo_unico").on(t.codigo),
    index("itens_tipo_id_idx").on(t.tipoId),
    index("itens_usuario_id_idx").on(t.usuarioId),
    index("itens_local_id_idx").on(t.localId),
    index("itens_status_idx").on(t.status),
    index("itens_atualizado_em_idx").on(t.atualizadoEm),
  ],
);

export const grupoDoMaterial = pgEnum("grupo_do_material", GRUPOS);
export const tipoDeMovimento = pgEnum("tipo_de_movimento", TIPOS_DE_MOVIMENTO);

/**
 * Os materiais: o que é controlado por quantidade, sem código (cabos, toners,
 * mousepads...). Cada material fica num local só; o mesmo cabo em duas
 * unidades são dois cadastros. A `quantidade` é o saldo atual e só muda
 * pelos movimentos.
 */
export const materiais = pgTable(
  "materiais",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nome: text("nome").notNull(),
    marcaModelo: text("marca_modelo"),
    grupo: grupoDoMaterial("grupo").notNull(),
    localId: integer("local_id").references(() => locais.id, { onDelete: "restrict" }),
    condicao: condicaoDoItem("condicao"),
    observacoes: text("observacoes"),
    quantidade: integer("quantidade").notNull().default(0),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    check("materiais_quantidade_positiva", sql`${t.quantidade} >= 0`),
    index("materiais_grupo_idx").on(t.grupo),
    index("materiais_local_id_idx").on(t.localId),
  ],
);

/**
 * O histórico de cada material. Na entrada e na saída, `quantidade` é quanto
 * entrou ou saiu (sempre positiva); no ajuste, é a diferença da contagem
 * (+3 ou -2). `saldo` é como ficou depois do movimento.
 */
export const movimentosDeMaterial = pgTable(
  "movimentos_de_material",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materiais.id, { onDelete: "cascade" }),
    tipo: tipoDeMovimento("tipo").notNull(),
    quantidade: integer("quantidade").notNull(),
    saldo: integer("saldo").notNull(),
    /** Para quem saiu (só nas saídas, e opcional). Não dá para excluir quem recebeu material. */
    colaboradorId: integer("colaborador_id").references(() => colaboradores.id, { onDelete: "restrict" }),
    observacao: text("observacao"),
    criadoEm: criadoEm(),
  },
  (t) => [
    check(
      "movimentos_quantidade_valida",
      sql`(${t.tipo} = 'ajuste' and ${t.quantidade} <> 0) or (${t.tipo} <> 'ajuste' and ${t.quantidade} > 0)`,
    ),
    check("movimentos_saldo_positivo", sql`${t.saldo} >= 0`),
    check("movimentos_pessoa_so_na_saida", sql`${t.colaboradorId} is null or ${t.tipo} = 'saida'`),
    index("movimentos_material_id_idx").on(t.materialId, t.id),
    index("movimentos_colaborador_id_idx").on(t.colaboradorId),
  ],
);
