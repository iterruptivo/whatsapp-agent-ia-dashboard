-- Aumentar el campo nombre de leads a 250 caracteres
ALTER TABLE leads ALTER COLUMN nombre TYPE varchar(250);

-- Comentario
COMMENT ON COLUMN leads.nombre IS 'Nombre del lead (max 250 chars)';
