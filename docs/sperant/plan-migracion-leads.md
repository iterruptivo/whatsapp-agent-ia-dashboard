# Plan de Migración: Sperant → Leads

## Fecha: 27 Enero 2026

## Mapeo de Campos (6 campos)

| Campo Sperant | → Campo Leads | Transformación |
|---------------|---------------|----------------|
| celular | telefono | Limpiar: quitar +, espacios |
| nombres + apellidos | nombre | Concatenar |
| email | email | Tal cual |
| proyecto_id | proyecto_id | Ya mapeado |
| canal_entrada_proyecto | utm | Tal cual |
| fecha_creacion | created_at | Fecha del Excel |
| fecha_creacion | fecha_captura | Misma fecha |

## Campos que NO van
- nro_documento
- nivel_interes_proyecto
- usuario_asignado
- Todo lo demás

## Condición de Inserción
Solo insertar si el teléfono NO existe en la tabla leads.

## SQL de Migración

```sql
INSERT INTO leads (telefono, nombre, email, proyecto_id, utm, created_at, fecha_captura)
SELECT
  REPLACE(REPLACE(celular, '+', ''), ' ', ''),
  TRIM(COALESCE(nombres, '') || ' ' || COALESCE(apellidos, '')),
  email,
  proyecto_id,
  canal_entrada_proyecto,
  fecha_creacion,
  fecha_creacion
FROM sperant_migrations_leads s
WHERE celular IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE REPLACE(REPLACE(l.telefono, '+', ''), ' ', '')
        = REPLACE(REPLACE(s.celular, '+', ''), ' ', '')
  );
```
