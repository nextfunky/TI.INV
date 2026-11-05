CREATE TABLE "contas" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"usuario" text NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contas_uma_so" CHECK ("contas"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"conta_id" integer NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessoes_conta_id_idx" ON "sessoes" USING btree ("conta_id");