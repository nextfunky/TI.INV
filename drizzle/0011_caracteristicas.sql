CREATE TYPE "public"."tipo_de_caracteristica" AS ENUM('lista', 'numero', 'texto');--> statement-breakpoint
CREATE TABLE "caracteristicas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "caracteristicas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tipo_id" integer,
	"grupo" "grupo_do_material",
	"nome" text NOT NULL,
	"tipo" "tipo_de_caracteristica" DEFAULT 'lista' NOT NULL,
	"opcoes" text[] DEFAULT '{}'::text[] NOT NULL,
	"unidade" text,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "caracteristicas_de_um_tipo_ou_grupo" CHECK (("caracteristicas"."tipo_id" is null) <> ("caracteristicas"."grupo" is null))
);
--> statement-breakpoint
ALTER TABLE "itens" ADD COLUMN "caracteristicas" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "materiais" ADD COLUMN "caracteristicas" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "caracteristicas" ADD CONSTRAINT "caracteristicas_tipo_id_tipos_de_item_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_de_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "caracteristicas_nome_unico_no_tipo" ON "caracteristicas" USING btree ("tipo_id",lower("nome")) WHERE "caracteristicas"."tipo_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "caracteristicas_nome_unico_no_grupo" ON "caracteristicas" USING btree ("grupo",lower("nome")) WHERE "caracteristicas"."grupo" is not null;--> statement-breakpoint
CREATE INDEX "caracteristicas_tipo_id_idx" ON "caracteristicas" USING btree ("tipo_id");
--> statement-breakpoint
-- Os módulos que já vêm prontos: as características de cada grupo de material...
INSERT INTO "caracteristicas" ("grupo", "nome", "tipo", "opcoes", "unidade", "ordem") VALUES
  ('impressao', 'Cor', 'lista', ARRAY['Preto','Ciano','Magenta','Amarelo'], NULL, 0),
  ('impressao', 'Linha', 'lista', ARRAY['Original','Compatível','Remanufaturado'], NULL, 1),
  ('impressao', 'Rendimento', 'numero', '{}', 'páginas', 2),
  ('rede_e_rack', 'Categoria', 'lista', ARRAY['Cat 5','Cat 5e','Cat 6','Cat 6A'], NULL, 0),
  ('rede_e_rack', 'Cor', 'lista', ARRAY['Azul','Branco','Preto','Cinza','Verde','Amarelo','Vermelho'], NULL, 1),
  ('rede_e_rack', 'Comprimento', 'numero', '{}', 'm', 2),
  ('cabos', 'Conector', 'lista', ARRAY['USB-A','USB-B','USB-C','Micro USB','HDMI','VGA','DisplayPort','Força','RJ11','RJ9','P2'], NULL, 0),
  ('cabos', 'Comprimento', 'numero', '{}', 'm', 1),
  ('conectores_e_adaptadores', 'De', 'lista', ARRAY['USB-A','USB-C','Micro USB','HDMI','VGA','DisplayPort','RJ45','P2'], NULL, 0),
  ('conectores_e_adaptadores', 'Para', 'lista', ARRAY['USB-A','USB-C','Micro USB','HDMI','VGA','DisplayPort','RJ45','P2'], NULL, 1),
  ('fontes_e_carregadores', 'Tensão', 'numero', '{}', 'V', 0),
  ('fontes_e_carregadores', 'Potência', 'numero', '{}', 'W', 1),
  ('fontes_e_carregadores', 'Conector', 'lista', ARRAY['P4','USB','Outro'], NULL, 2),
  ('pecas_de_computador', 'Capacidade', 'numero', '{}', 'GB', 0),
  ('pecas_de_computador', 'Tecnologia', 'lista', ARRAY['DDR3','DDR4','DDR5','SATA','NVMe','HD'], NULL, 1),
  ('pecas_de_computador', 'Formato', 'lista', ARRAY['SODIMM','UDIMM','2,5"','3,5"','M.2'], NULL, 2),
  ('perifericos', 'Conexão', 'lista', ARRAY['USB','Sem fio','Bluetooth'], NULL, 0),
  ('perifericos', 'Cor', 'lista', ARRAY['Preto','Branco','Cinza','Azul'], NULL, 1)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- ... e as de cada tipo de item (pelo prefixo, que não muda).
INSERT INTO "caracteristicas" ("tipo_id", "nome", "tipo", "opcoes", "unidade", "ordem")
SELECT t."id", v."nome", v."tipo"::"tipo_de_caracteristica", v."opcoes", v."unidade", v."ordem"
FROM "tipos_de_item" t
JOIN (VALUES
  ('TEC', 'Conexão', 'lista', ARRAY['USB','Sem fio','Bluetooth'], NULL, 0),
  ('TEC', 'Receptor USB', 'lista', ARRAY['Com receptor','Sem receptor'], NULL, 1),
  ('MOU', 'Conexão', 'lista', ARRAY['USB','Sem fio','Bluetooth'], NULL, 0),
  ('MOU', 'Receptor USB', 'lista', ARRAY['Com receptor','Sem receptor'], NULL, 1),
  ('KIT', 'Conexão', 'lista', ARRAY['USB','Sem fio','Bluetooth'], NULL, 0),
  ('KIT', 'Receptor USB', 'lista', ARRAY['Com receptor','Sem receptor'], NULL, 1),
  ('MON', 'Tamanho', 'numero', '{}'::text[], 'pol.', 0),
  ('MON', 'Entradas', 'texto', '{}'::text[], NULL, 1),
  ('IMP', 'Tecnologia', 'lista', ARRAY['Laser','Jato de tinta','Térmica'], NULL, 0),
  ('IMP', 'Conexão', 'lista', ARRAY['USB','Rede','Wi-Fi'], NULL, 1),
  ('ETQ', 'Tecnologia', 'lista', ARRAY['Laser','Jato de tinta','Térmica'], NULL, 0),
  ('ETQ', 'Conexão', 'lista', ARRAY['USB','Rede','Wi-Fi'], NULL, 1),
  ('TEL', 'Tipo', 'lista', ARRAY['IP','Analógico'], NULL, 0),
  ('TEL', 'Ramal', 'texto', '{}'::text[], NULL, 1),
  ('CEL', 'Número da linha', 'texto', '{}'::text[], NULL, 0),
  ('CEL', 'IMEI', 'texto', '{}'::text[], NULL, 1),
  ('TAB', 'Número da linha', 'texto', '{}'::text[], NULL, 0),
  ('TAB', 'IMEI', 'texto', '{}'::text[], NULL, 1),
  ('CAM', 'Tipo', 'lista', ARRAY['IP','Analógica'], NULL, 0),
  ('CAM', 'Alimentação', 'lista', ARRAY['PoE','12 V'], NULL, 1),
  ('SWT', 'Portas', 'numero', '{}'::text[], 'portas', 0),
  ('SWT', 'PoE', 'lista', ARRAY['Com PoE','Sem PoE'], NULL, 1),
  ('ROT', 'Portas', 'numero', '{}'::text[], 'portas', 0),
  ('ROT', 'PoE', 'lista', ARRAY['Com PoE','Sem PoE'], NULL, 1),
  ('NBK', 'Potência', 'numero', '{}'::text[], 'VA', 0)
) AS v("prefixo", "nome", "tipo", "opcoes", "unidade", "ordem") ON v."prefixo" = t."prefixo"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- PREENCHER: daqui para baixo, só preenche o que estiver vazio e claro no texto do cadastro (pode rodar de novo sem estragar nada).
SELECT 1;
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."marca_modelo", '') ~* '\mpreto\M' THEN 'Preto' WHEN coalesce(m."marca_modelo", '') ~* '\mciano\M' THEN 'Ciano'
    WHEN coalesce(m."marca_modelo", '') ~* '\mmagenta\M' THEN 'Magenta' WHEN coalesce(m."marca_modelo", '') ~* '\mamarelo\M' THEN 'Amarelo' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Cor'
  WHERE m."grupo" = 'impressao' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."observacoes", '') ~* '(^|\. )compat[ií]vel\M' THEN 'Compatível' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Linha'
  WHERE m."grupo" = 'impressao' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (replace(substring(coalesce(m."observacoes", '') from '(?i)([0-9][0-9.]*) ?p[aá]ginas'), '.', '')) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Rendimento'
  WHERE m."grupo" = 'impressao' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
-- "Compatível com" (campo do material) dos toners, pelo que está escrito nas observações ou no modelo.
WITH v AS (
  SELECT m."id", CASE
    WHEN coalesce(m."observacoes", '') ~* 'para ricoh.{0,20}mp c2003' THEN 'Ricoh MP C2003'
    WHEN coalesce(m."observacoes", '') ~* 'ricoh sp ?3710' OR coalesce(m."marca_modelo", '') ~* '\msp ?3710' THEN 'Ricoh SP 3710'
    WHEN coalesce(m."observacoes", '') ~* '\mbrother\M' THEN 'Brother'
  END AS "valor"
  FROM "materiais" m WHERE m."grupo" = 'impressao' AND m."compativel_com" IS NULL
)
UPDATE "materiais" m SET "compativel_com" = v."valor" FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL;
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."marca_modelo", '') ~* '\mcat ?5e\M' THEN 'Cat 5e' WHEN coalesce(m."marca_modelo", '') ~* '\mcat ?6a\M' THEN 'Cat 6A'
    WHEN coalesce(m."marca_modelo", '') ~* '\mcat ?6\M' THEN 'Cat 6' WHEN coalesce(m."marca_modelo", '') ~* '\mcat ?5\M' THEN 'Cat 5' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Categoria'
  WHERE m."grupo" = 'rede_e_rack' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."marca_modelo", '') ~* '\mazul\M' THEN 'Azul' WHEN coalesce(m."marca_modelo", '') ~* '\mbranco\M' THEN 'Branco' WHEN coalesce(m."marca_modelo", '') ~* '\mpreto\M' THEN 'Preto'
    WHEN coalesce(m."marca_modelo", '') ~* '\mcinza\M' THEN 'Cinza' WHEN coalesce(m."marca_modelo", '') ~* '\mverde\M' THEN 'Verde' WHEN coalesce(m."marca_modelo", '') ~* '\mamarelo\M' THEN 'Amarelo'
    WHEN coalesce(m."marca_modelo", '') ~* '\mvermelho\M' THEN 'Vermelho' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Cor'
  WHERE m."grupo" = 'rede_e_rack' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (replace(substring(coalesce(m."marca_modelo", '') from '\m([0-9]+(?:,[0-9]+)?) ?m$'), ',', '.')) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Comprimento'
  WHERE m."grupo" = 'rede_e_rack' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN m."nome" ~* 'hdmi' THEN 'HDMI' WHEN m."nome" ~* '\mvga\M' THEN 'VGA' WHEN m."nome" ~* '\mdp\M' THEN 'DisplayPort'
    WHEN m."nome" ~* 'energia' THEN 'Força' WHEN m."nome" ~* 'telefone' THEN 'RJ11' WHEN m."nome" ~* 'monofone' THEN 'RJ9'
    WHEN m."nome" ~* '[áa]udio' THEN 'P2' WHEN coalesce(m."marca_modelo", '') ~* '^cabo usb [23]\.0 b$' THEN 'USB-B' WHEN coalesce(m."marca_modelo", '') ~* '^cabo usb.?c$' THEN 'USB-C' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Conector'
  WHERE m."grupo" = 'cabos' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (substring(coalesce(m."marca_modelo", '') from '(?i)^gen[ée]rico ([0-9]+) metros$')) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Comprimento'
  WHERE m."grupo" = 'cabos' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."marca_modelo", '') ~* '^displayport / hdmi$' THEN 'DisplayPort' WHEN coalesce(m."marca_modelo", '') ~* '^vga / hdmi$' THEN 'VGA'
    WHEN coalesce(m."marca_modelo", '') ~* 'micro usb / rj45$' THEN 'Micro USB' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'De'
  WHERE m."grupo" = 'conectores_e_adaptadores' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."marca_modelo", '') ~* '^(displayport|vga) / hdmi$' THEN 'HDMI' WHEN coalesce(m."marca_modelo", '') ~* 'micro usb / rj45$' THEN 'RJ45' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Para'
  WHERE m."grupo" = 'conectores_e_adaptadores' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (replace(substring(coalesce(m."marca_modelo", '') from '(?i)\m([0-9]+(?:[.,][0-9]+)?) ?v\M'), ',', '.')) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Tensão'
  WHERE m."grupo" = 'fontes_e_carregadores' AND (coalesce(m."marca_modelo", '') !~* '[0-9] ?v a [0-9]')
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (substring(coalesce(m."marca_modelo", '') from '(?i)\m([0-9]+) ?w\M')) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Potência'
  WHERE m."grupo" = 'fontes_e_carregadores' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."observacoes", '') ~* 'conector p4' THEN 'P4' WHEN coalesce(m."marca_modelo", '') ~* '\musb\M' THEN 'USB' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Conector'
  WHERE m."grupo" = 'fontes_e_carregadores' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."marca_modelo", '') ~* '\m[0-9]+ ?gb' THEN substring(coalesce(m."marca_modelo", '') from '(?i)\m([0-9]+) ?gb')
    WHEN coalesce(m."marca_modelo", '') ~* '\m[0-9]+ ?tb' THEN (substring(coalesce(m."marca_modelo", '') from '(?i)\m([0-9]+) ?tb')::int * 1000)::text END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Capacidade'
  WHERE m."grupo" = 'pecas_de_computador' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."marca_modelo", '') ~* '\mddr3\M' THEN 'DDR3' WHEN coalesce(m."marca_modelo", '') ~* '\mddr4\M' THEN 'DDR4' WHEN coalesce(m."marca_modelo", '') ~* '\mddr5\M' THEN 'DDR5'
    WHEN coalesce(m."marca_modelo", '') ~* '\mnvme\M' THEN 'NVMe' WHEN m."nome" ~* '^hd' THEN 'HD' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Tecnologia'
  WHERE m."grupo" = 'pecas_de_computador' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT m."id", c."id" AS "campo", (CASE WHEN coalesce(m."observacoes", '') ~* '\msodimm\M' THEN 'SODIMM' WHEN coalesce(m."observacoes", '') ~* '\mudimm\M' THEN 'UDIMM' WHEN coalesce(m."marca_modelo", '') ~* '\mnvme\M' THEN 'M.2' END) AS "valor"
  FROM "materiais" m JOIN "caracteristicas" c ON c."grupo" = m."grupo" AND c."nome" = 'Formato'
  WHERE m."grupo" = 'pecas_de_computador' AND (TRUE)
)
UPDATE "materiais" m SET "caracteristicas" = m."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = m."id" AND v."valor" IS NOT NULL AND NOT (m."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT i."id", c."id" AS "campo", (CASE WHEN coalesce(i."observacoes", '') ~* '(^|\. )sem fio\.' THEN 'Sem fio' WHEN coalesce(i."observacoes", '') ~* '(^|\. )usb\.' THEN 'USB' END) AS "valor"
  FROM "itens" i JOIN "tipos_de_item" t ON t."id" = i."tipo_id" JOIN "caracteristicas" c ON c."tipo_id" = t."id" AND c."nome" = 'Conexão'
  WHERE t."prefixo" IN ('TEC','MOU','KIT') AND (TRUE)
)
UPDATE "itens" i SET "caracteristicas" = i."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = i."id" AND v."valor" IS NOT NULL AND NOT (i."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT i."id", c."id" AS "campo", (CASE WHEN coalesce(i."observacoes", '') ~* 'n[ãa]o encontramos os conectores|n[ãa]o tem conector' THEN 'Sem receptor'
    WHEN coalesce(i."observacoes", '') ~* 'com seus conectores' THEN 'Com receptor' END) AS "valor"
  FROM "itens" i JOIN "tipos_de_item" t ON t."id" = i."tipo_id" JOIN "caracteristicas" c ON c."tipo_id" = t."id" AND c."nome" = 'Receptor USB'
  WHERE t."prefixo" IN ('TEC','MOU','KIT') AND (TRUE)
)
UPDATE "itens" i SET "caracteristicas" = i."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = i."id" AND v."valor" IS NOT NULL AND NOT (i."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT i."id", c."id" AS "campo", (CASE WHEN coalesce(i."observacoes", '') ~* '(^|\. )telefone ip\.' THEN 'IP' WHEN coalesce(i."observacoes", '') ~* '(^|\. )anal[óo]gico\.' THEN 'Analógico' END) AS "valor"
  FROM "itens" i JOIN "tipos_de_item" t ON t."id" = i."tipo_id" JOIN "caracteristicas" c ON c."tipo_id" = t."id" AND c."nome" = 'Tipo'
  WHERE t."prefixo" IN ('TEL') AND (TRUE)
)
UPDATE "itens" i SET "caracteristicas" = i."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = i."id" AND v."valor" IS NOT NULL AND NOT (i."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT i."id", c."id" AS "campo", (CASE WHEN regexp_replace(coalesce(i."observacoes", ''), '^Em análise\. ', '') IN ('VGA', 'VGA/HDMI', 'HDMI', 'VGA/HDMI/DP')
    THEN regexp_replace(coalesce(i."observacoes", ''), '^Em análise\. ', '') END) AS "valor"
  FROM "itens" i JOIN "tipos_de_item" t ON t."id" = i."tipo_id" JOIN "caracteristicas" c ON c."tipo_id" = t."id" AND c."nome" = 'Entradas'
  WHERE t."prefixo" IN ('MON') AND (TRUE)
)
UPDATE "itens" i SET "caracteristicas" = i."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = i."id" AND v."valor" IS NOT NULL AND NOT (i."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT i."id", c."id" AS "campo", (CASE WHEN coalesce(i."observacoes", '') ~* 'c[âa]mera ip' THEN 'IP' END) AS "valor"
  FROM "itens" i JOIN "tipos_de_item" t ON t."id" = i."tipo_id" JOIN "caracteristicas" c ON c."tipo_id" = t."id" AND c."nome" = 'Tipo'
  WHERE t."prefixo" IN ('CAM') AND (TRUE)
)
UPDATE "itens" i SET "caracteristicas" = i."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = i."id" AND v."valor" IS NOT NULL AND NOT (i."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT i."id", c."id" AS "campo", (CASE WHEN coalesce(i."observacoes", '') ~* '\mt[ée]rmica\M' THEN 'Térmica' END) AS "valor"
  FROM "itens" i JOIN "tipos_de_item" t ON t."id" = i."tipo_id" JOIN "caracteristicas" c ON c."tipo_id" = t."id" AND c."nome" = 'Tecnologia'
  WHERE t."prefixo" IN ('IMP','ETQ') AND (TRUE)
)
UPDATE "itens" i SET "caracteristicas" = i."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = i."id" AND v."valor" IS NOT NULL AND NOT (i."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT i."id", c."id" AS "campo", (substring(coalesce(i."observacoes", '') from '(?i)\m([0-9]+) portas')) AS "valor"
  FROM "itens" i JOIN "tipos_de_item" t ON t."id" = i."tipo_id" JOIN "caracteristicas" c ON c."tipo_id" = t."id" AND c."nome" = 'Portas'
  WHERE t."prefixo" IN ('SWT','ROT') AND (TRUE)
)
UPDATE "itens" i SET "caracteristicas" = i."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = i."id" AND v."valor" IS NOT NULL AND NOT (i."caracteristicas" ? v."campo"::text);
--> statement-breakpoint
WITH v AS (
  SELECT i."id", c."id" AS "campo", (CASE WHEN coalesce(i."observacoes", '') ~* '\mpoe\M' THEN 'Com PoE' END) AS "valor"
  FROM "itens" i JOIN "tipos_de_item" t ON t."id" = i."tipo_id" JOIN "caracteristicas" c ON c."tipo_id" = t."id" AND c."nome" = 'PoE'
  WHERE t."prefixo" IN ('SWT','ROT') AND (TRUE)
)
UPDATE "itens" i SET "caracteristicas" = i."caracteristicas" || jsonb_build_object(v."campo"::text, v."valor")
FROM v WHERE v."id" = i."id" AND v."valor" IS NOT NULL AND NOT (i."caracteristicas" ? v."campo"::text);
