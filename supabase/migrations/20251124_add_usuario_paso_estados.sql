ALTER TABLE locales
ADD COLUMN usuario_paso_naranja_id UUID REFERENCES usuarios(id),
ADD COLUMN fecha_paso_naranja TIMESTAMP,
ADD COLUMN usuario_paso_rojo_id UUID REFERENCES usuarios(id),
ADD COLUMN fecha_paso_rojo TIMESTAMP;
