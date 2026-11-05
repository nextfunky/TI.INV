CREATE TYPE "public"."condicao_do_item" AS ENUM('novo', 'bom', 'usado', 'regular', 'defeituoso');--> statement-breakpoint
CREATE TABLE "colaboradores" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "colaboradores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"chave" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "itens" ADD COLUMN "usuario_id" integer;--> statement-breakpoint
ALTER TABLE "itens" ADD COLUMN "condicao" "condicao_do_item";--> statement-breakpoint
CREATE UNIQUE INDEX "colaboradores_chave_unica" ON "colaboradores" USING btree ("chave");--> statement-breakpoint
ALTER TABLE "itens" ADD CONSTRAINT "itens_usuario_id_colaboradores_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."colaboradores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "itens_usuario_id_idx" ON "itens" USING btree ("usuario_id");