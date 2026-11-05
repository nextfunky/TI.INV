-- As categorias dos tipos passam de 3 para 8. O tipo do banco é refeito
-- (trocar o enum dentro da transação da migração).
ALTER TABLE "tipos_de_item" ALTER COLUMN "categoria" DROP DEFAULT;
--> statement-breakpoint
ALTER TYPE "public"."categoria_do_tipo" RENAME TO "categoria_do_tipo_antiga";
--> statement-breakpoint
CREATE TYPE "public"."categoria_do_tipo" AS ENUM('computador', 'periferico', 'movel', 'impressao', 'telefonia', 'rede', 'seguranca', 'outro');
--> statement-breakpoint
ALTER TABLE "tipos_de_item" ALTER COLUMN "categoria" SET DATA TYPE "public"."categoria_do_tipo" USING "categoria"::text::"public"."categoria_do_tipo";
--> statement-breakpoint
ALTER TABLE "tipos_de_item" ALTER COLUMN "categoria" SET DEFAULT 'outro';
--> statement-breakpoint
DROP TYPE "public"."categoria_do_tipo_antiga";
--> statement-breakpoint
-- Cada tipo que veio pronto vai para a sua categoria (pelo prefixo, que não muda).
UPDATE "tipos_de_item" SET "categoria" = 'periferico' WHERE "prefixo" IN ('MON', 'TEC', 'MOU', 'KIT', 'HST', 'WEB', 'DCK');
--> statement-breakpoint
UPDATE "tipos_de_item" SET "categoria" = 'movel' WHERE "prefixo" IN ('CEL', 'TAB', 'COL', 'RAD');
--> statement-breakpoint
UPDATE "tipos_de_item" SET "categoria" = 'impressao' WHERE "prefixo" IN ('IMP', 'ETQ');
--> statement-breakpoint
UPDATE "tipos_de_item" SET "categoria" = 'telefonia' WHERE "prefixo" IN ('TEL');
--> statement-breakpoint
UPDATE "tipos_de_item" SET "categoria" = 'rede' WHERE "prefixo" IN ('SWT', 'ROT', 'ONU', 'CNV', 'NBK');
--> statement-breakpoint
UPDATE "tipos_de_item" SET "categoria" = 'seguranca' WHERE "prefixo" IN ('CAM');
