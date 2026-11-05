-- Locais em dois níveis: a unidade (sem pai) e o departamento (dentro de uma unidade).
-- Os locais mais fundos passam para a unidade de cima, com o caminho no nome
-- (ex.: "2º andar - Financeiro").
WITH RECURSIVE arvore AS (
  SELECT id, id AS raiz, nome::text AS relativo, 0 AS nivel FROM locais WHERE pai_id IS NULL
  UNION ALL
  SELECT l.id, a.raiz,
         CASE WHEN a.nivel = 0 THEN l.nome ELSE a.relativo || ' - ' || l.nome END,
         a.nivel + 1
  FROM locais l JOIN arvore a ON l.pai_id = a.id
)
UPDATE locais SET pai_id = arvore.raiz, nome = arvore.relativo
FROM arvore
WHERE locais.id = arvore.id AND arvore.nivel >= 2;
--> statement-breakpoint
UPDATE locais SET caminho = nome WHERE pai_id IS NULL;
--> statement-breakpoint
UPDATE locais d SET caminho = u.nome || ' › ' || d.nome FROM locais u WHERE d.pai_id = u.id;
--> statement-breakpoint
-- O banco garante os dois níveis, mesmo que alguém tente gravar direto.
CREATE FUNCTION locais_dois_niveis() RETURNS trigger AS $$
BEGIN
  IF NEW.pai_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM locais WHERE id = NEW.pai_id AND pai_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Um departamento só pode ficar dentro de uma unidade.';
    END IF;
    IF EXISTS (SELECT 1 FROM locais WHERE pai_id = NEW.id) THEN
      RAISE EXCEPTION 'Uma unidade com departamentos não pode virar departamento.';
    END IF;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER locais_dois_niveis BEFORE INSERT OR UPDATE OF pai_id ON locais
FOR EACH ROW EXECUTE FUNCTION locais_dois_niveis();
