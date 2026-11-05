CREATE TYPE "public"."grupo_do_material" AS ENUM('cabos', 'conectores_e_adaptadores', 'fontes_e_carregadores', 'rede_e_rack', 'pecas_de_computador', 'impressao', 'perifericos', 'seguranca', 'outros');--> statement-breakpoint
CREATE TYPE "public"."tipo_de_movimento" AS ENUM('entrada', 'saida', 'ajuste');--> statement-breakpoint
CREATE TABLE "materiais" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "materiais_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"marca_modelo" text,
	"grupo" "grupo_do_material" NOT NULL,
	"local_id" integer,
	"condicao" "condicao_do_item",
	"observacoes" text,
	"quantidade" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materiais_quantidade_positiva" CHECK ("materiais"."quantidade" >= 0)
);
--> statement-breakpoint
CREATE TABLE "movimentos_de_material" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "movimentos_de_material_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"material_id" integer NOT NULL,
	"tipo" "tipo_de_movimento" NOT NULL,
	"quantidade" integer NOT NULL,
	"saldo" integer NOT NULL,
	"colaborador_id" integer,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimentos_quantidade_valida" CHECK (("movimentos_de_material"."tipo" = 'ajuste' and "movimentos_de_material"."quantidade" <> 0) or ("movimentos_de_material"."tipo" <> 'ajuste' and "movimentos_de_material"."quantidade" > 0)),
	CONSTRAINT "movimentos_saldo_positivo" CHECK ("movimentos_de_material"."saldo" >= 0),
	CONSTRAINT "movimentos_pessoa_so_na_saida" CHECK ("movimentos_de_material"."colaborador_id" is null or "movimentos_de_material"."tipo" = 'saida')
);
--> statement-breakpoint
ALTER TABLE "materiais" ADD CONSTRAINT "materiais_local_id_locais_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locais"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_de_material" ADD CONSTRAINT "movimentos_de_material_material_id_materiais_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_de_material" ADD CONSTRAINT "movimentos_de_material_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "materiais_grupo_idx" ON "materiais" USING btree ("grupo");--> statement-breakpoint
CREATE INDEX "materiais_local_id_idx" ON "materiais" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "movimentos_material_id_idx" ON "movimentos_de_material" USING btree ("material_id","id");--> statement-breakpoint
CREATE INDEX "movimentos_colaborador_id_idx" ON "movimentos_de_material" USING btree ("colaborador_id");