-- Os 10 tipos que já vêm cadastrados.
INSERT INTO "tipos_de_item" ("nome", "categoria", "prefixo", "icone") VALUES
  ('Desktop',    'computador', 'DSK', 'monitor'),
  ('Notebook',   'computador', 'NTB', 'laptop'),
  ('Monitor',    'periferico', 'MON', 'monitor'),
  ('Teclado',    'periferico', 'TEC', 'keyboard'),
  ('Mouse',      'periferico', 'MOU', 'mouse'),
  ('Headset',    'periferico', 'HST', 'headset'),
  ('Webcam',     'periferico', 'WEB', 'webcam'),
  ('Dock',       'periferico', 'DCK', 'package'),
  ('Impressora', 'outro',      'IMP', 'printer'),
  ('Nobreak',    'outro',      'NBK', 'zap')
ON CONFLICT DO NOTHING;
