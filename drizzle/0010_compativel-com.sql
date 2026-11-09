ALTER TABLE "materiais" ADD COLUMN "compativel_com" text;--> statement-breakpoint
CREATE INDEX "materiais_condicao_idx" ON "materiais" USING btree ("condicao");