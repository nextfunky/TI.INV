CREATE TABLE "importacoes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "importacoes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"hash" text NOT NULL,
	"arquivo" text NOT NULL,
	"itens" integer NOT NULL,
	"materiais" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "importacoes_hash_unico" ON "importacoes" USING btree ("hash");--> statement-breakpoint
-- Os tipos novos, para os equipamentos da planilha de inventário.
INSERT INTO "tipos_de_item" ("nome", "categoria", "prefixo", "icone") VALUES
  ('Telefone',                'outro',      'TEL', 'phone'),
  ('Câmera',                  'outro',      'CAM', 'cctv'),
  ('Rádio',                   'outro',      'RAD', 'radio'),
  ('Coletor de dados',        'outro',      'COL', 'scan-barcode'),
  ('Tablet',                  'outro',      'TAB', 'tablet'),
  ('Celular',                 'outro',      'CEL', 'smartphone'),
  ('Impressora de etiquetas', 'outro',      'ETQ', 'tag'),
  ('Switch',                  'outro',      'SWT', 'network'),
  ('Roteador',                'outro',      'ROT', 'router'),
  ('ONU',                     'outro',      'ONU', 'router'),
  ('Conversor serial',        'outro',      'CNV', 'cable'),
  ('Kit teclado e mouse',     'periferico', 'KIT', 'keyboard')
ON CONFLICT DO NOTHING;
