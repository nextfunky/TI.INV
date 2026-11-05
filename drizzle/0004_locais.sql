CREATE TABLE "locais" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "locais_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"pai_id" integer,
	"caminho" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locais_nao_dentro_de_si" CHECK ("locais"."pai_id" is null or "locais"."pai_id" <> "locais"."id")
);
--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "local_id" integer;--> statement-breakpoint
ALTER TABLE "itens" ADD COLUMN "local_id" integer;--> statement-breakpoint
ALTER TABLE "locais" ADD CONSTRAINT "locais_pai_id_locais_id_fk" FOREIGN KEY ("pai_id") REFERENCES "public"."locais"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "locais_nome_unico_no_pai" ON "locais" USING btree (coalesce("pai_id", 0),lower("nome"));--> statement-breakpoint
CREATE INDEX "locais_pai_id_idx" ON "locais" USING btree ("pai_id");--> statement-breakpoint
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_local_id_locais_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locais"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens" ADD CONSTRAINT "itens_local_id_locais_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locais"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "colaboradores_local_id_idx" ON "colaboradores" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "itens_local_id_idx" ON "itens" USING btree ("local_id");