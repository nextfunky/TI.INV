CREATE TYPE "public"."evento_do_historico" AS ENUM('cadastro', 'entrega', 'troca', 'devolucao', 'mudanca_de_local', 'mudou_com_a_pessoa', 'exclusao');--> statement-breakpoint
CREATE TABLE "historico_de_itens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "historico_de_itens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_id" integer,
	"codigo" text NOT NULL,
	"descricao" text NOT NULL,
	"evento" "evento_do_historico" NOT NULL,
	"de_pessoa_id" integer,
	"de_pessoa" text,
	"para_pessoa_id" integer,
	"para_pessoa" text,
	"de_local" text,
	"para_local" text,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historico_de_itens" ADD CONSTRAINT "historico_de_itens_item_id_itens_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."itens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_de_itens" ADD CONSTRAINT "historico_de_itens_de_pessoa_id_colaboradores_id_fk" FOREIGN KEY ("de_pessoa_id") REFERENCES "public"."colaboradores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_de_itens" ADD CONSTRAINT "historico_de_itens_para_pessoa_id_colaboradores_id_fk" FOREIGN KEY ("para_pessoa_id") REFERENCES "public"."colaboradores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "historico_item_id_idx" ON "historico_de_itens" USING btree ("item_id","id");--> statement-breakpoint
CREATE INDEX "historico_criado_em_idx" ON "historico_de_itens" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "historico_de_pessoa_idx" ON "historico_de_itens" USING btree ("de_pessoa_id");--> statement-breakpoint
CREATE INDEX "historico_para_pessoa_idx" ON "historico_de_itens" USING btree ("para_pessoa_id");