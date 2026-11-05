CREATE TYPE "public"."categoria_do_tipo" AS ENUM('computador', 'periferico', 'outro');--> statement-breakpoint
CREATE TYPE "public"."status_do_item" AS ENUM('em_uso', 'em_estoque', 'em_manutencao', 'descartado');--> statement-breakpoint
CREATE TABLE "itens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "itens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo" text NOT NULL,
	"tipo_id" integer NOT NULL,
	"marca" text,
	"modelo" text,
	"numero_serie" text,
	"status" "status_do_item" DEFAULT 'em_estoque' NOT NULL,
	"hostname" text,
	"processador" text,
	"memoria_ram" text,
	"armazenamento" text,
	"sistema_operacional" text,
	"data_compra" date,
	"garantia_ate" date,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_de_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tipos_de_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"categoria" "categoria_do_tipo" DEFAULT 'outro' NOT NULL,
	"prefixo" text NOT NULL,
	"icone" text DEFAULT 'package' NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_de_item_prefixo_formato" CHECK ("tipos_de_item"."prefixo" ~ '^[A-Z]{2,5}$'),
	CONSTRAINT "tipos_de_item_ultimo_numero_positivo" CHECK ("tipos_de_item"."ultimo_numero" >= 0)
);
--> statement-breakpoint
ALTER TABLE "itens" ADD CONSTRAINT "itens_tipo_id_tipos_de_item_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_de_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "itens_codigo_unico" ON "itens" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "itens_tipo_id_idx" ON "itens" USING btree ("tipo_id");--> statement-breakpoint
CREATE INDEX "itens_status_idx" ON "itens" USING btree ("status");--> statement-breakpoint
CREATE INDEX "itens_atualizado_em_idx" ON "itens" USING btree ("atualizado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_de_item_nome_unico" ON "tipos_de_item" USING btree (lower("nome"));--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_de_item_prefixo_unico" ON "tipos_de_item" USING btree ("prefixo");