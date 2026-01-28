# Mapeo de Campos: Sperant Migrations Leads → Tabla Leads

**Fecha de Análisis:** 27 Enero 2026
**Versión:** 1.0

---

## Resumen Ejecutivo

Este documento define el mapeo de campos para migrar datos desde `sperant_migrations_leads` (58 columnas) hacia la tabla `leads` (27 columnas) del sistema EcoPlaza Dashboard.

**Métricas:**
- Campos origen: 58
- Campos destino: 27
- Mapeo directo: 11 campos
- Mapeo con transformación: 8 campos
- Campos descartados: 39 campos
- Campos calculados/generados: 8 campos

---

## Estructura Tabla Destino: `leads`

### Campos Existentes (27 total)

| # | Campo | Tipo | Nullable | Default | Descripción |
|---|-------|------|----------|---------|-------------|
| 1 | `id` | uuid | NO | gen_random_uuid() | PK generado automáticamente |
| 2 | `telefono` | varchar | NO | - | Teléfono principal (requerido) |
| 3 | `nombre` | varchar | YES | - | Nombre completo del lead |
| 4 | `rubro` | varchar | YES | - | Rubro de negocio |
| 5 | `horario_visita` | text | YES | - | Horario preferido de visita |
| 6 | `estado` | text | YES | - | Estado del lead |
| 7 | `historial_conversacion` | text | YES | - | Historial completo de chat |
| 8 | `historial_reciente` | text | YES | - | Últimas conversaciones |
| 9 | `resumen_historial` | text | YES | - | Resumen generado por IA |
| 10 | `ultimo_mensaje` | text | YES | - | Último mensaje del chat |
| 11 | `intentos_bot` | integer | YES | 0 | Contador de intentos bot |
| 12 | `fecha_captura` | timestamptz | YES | now() | Fecha captura inicial |
| 13 | `created_at` | timestamptz | YES | now() | Fecha creación registro |
| 14 | `updated_at` | timestamptz | YES | now() | Fecha última actualización |
| 15 | `notificacion_enviada` | boolean | YES | false | Flag notificación |
| 16 | `estado_al_notificar` | varchar | YES | - | Estado en momento notif |
| 17 | `horario_visita_timestamp` | timestamptz | YES | - | Timestamp visita agendada |
| 18 | `vendedor_asignado_id` | uuid | YES | - | FK a vendedores |
| 19 | `proyecto_id` | uuid | YES | - | FK a proyectos |
| 20 | `email` | varchar | YES | - | Email del lead |
| 21 | `asistio` | boolean | YES | false | Asistió a visita |
| 22 | `utm` | varchar | YES | - | Parámetros UTM |
| 23 | `excluido_repulse` | boolean | YES | false | Excluido de campañas |
| 24 | `tipificacion_nivel_1` | varchar | YES | - | Primera tipificación |
| 25 | `tipificacion_nivel_2` | varchar | YES | - | Segunda tipificación |
| 26 | `tipificacion_nivel_3` | varchar | YES | - | Tercera tipificación |
| 27 | `observaciones_vendedor` | text | YES | - | Notas del vendedor |

---

## Estructura Tabla Origen: `sperant_migrations_leads`

### 58 Columnas Disponibles

```
id, created_at, numero, fecha_creacion, usuario_creador, tipo_persona,
denominacion, apellidos, nombres, tipo_documento, nro_documento, email,
celular, telefono_principal, proyecto, agrupacion_medios_captacion,
medio_captacion_proyecto, agrupacion_canal_entrada, canal_entrada_proyecto,
nivel_interes_proyecto, segmento, usuario_asignado, fecha_asignacion,
fecha_primera_interaccion_manual_proyecto, ultima_interaccion_proyecto,
fecha_ultima_interaccion_proyecto, numero_interacciones_proyecto,
fecha_proximo_evento_proyecto, utm_source, utm_medium, utm_campaign,
utm_term, utm_content, estado_civil, genero, ocupacion, edad,
fecha_nacimiento, nacionalidad, pais, departamento, provincia, distrito,
domicilio, observaciones, proceso_captacion, autorizacion_uso_datos,
apto, autorizacion_publicidad, alto_riesgo, conyuge, conyuge_principal,
prioridad, observacion_interaccion_proyecto, que_me_gustaria_preguntar,
estas_buscando_financiamiento, en_que_horario_comunicar, proyecto_id
```

---

## Mapeo Propuesto

### 1. MAPEO DIRECTO (11 campos)

Campos que se copian directamente sin transformación:

| Destino | Origen | Nota |
|---------|--------|------|
| `email` | `email` | Directo |
| `proyecto_id` | `proyecto_id` | UUID - Directo |
| `observaciones_vendedor` | `observaciones` | Directo |

---

### 2. MAPEO CON TRANSFORMACIÓN (8 campos)

#### 2.1 Teléfono (REQUERIDO)
```sql
telefono = COALESCE(celular, telefono_principal)
```
**Validación:** Si ambos son NULL → Rechazar registro

#### 2.2 Nombre Completo
```sql
nombre = TRIM(COALESCE(nombres, '') || ' ' || COALESCE(apellidos, ''))
```
**Fallback:** Si NULL → usar `denominacion`

#### 2.3 Estado del Lead
```sql
estado = CASE nivel_interes_proyecto
    WHEN 'por contactar' THEN 'lead_nuevo'
    WHEN 'interesado' THEN 'lead_calificado'
    WHEN 'muy interesado' THEN 'lead_caliente'
    WHEN 'no interesado' THEN 'descartado'
    ELSE 'lead_nuevo'
END
```

#### 2.4 UTM Consolidado
```sql
utm = JSON_BUILD_OBJECT(
    'source', utm_source,
    'medium', utm_medium,
    'campaign', utm_campaign,
    'term', utm_term,
    'content', utm_content
)::text
```

#### 2.5 Fecha Captura
```sql
fecha_captura = TO_TIMESTAMP(
    CAST(fecha_creacion AS NUMERIC) * 24 * 60 * 60
) + '1899-12-30'::timestamp
```
**Nota:** Conversión desde formato numérico de Excel (días desde 1900)

#### 2.6 Vendedor Asignado
```sql
vendedor_asignado_id = (
    SELECT id
    FROM vendedores
    WHERE username = usuario_asignado
    LIMIT 1
)
```
**Validación:** Si no existe → NULL

#### 2.7 Rubro (Ocupación)
```sql
rubro = ocupacion
```
**Nota:** Mapeo conceptual - ocupación del lead → rubro de negocio

#### 2.8 Horario Visita
```sql
horario_visita = en_que_horario_comunicar
```

---

### 3. CAMPOS GENERADOS/DEFAULT (8 campos)

| Campo | Valor | Justificación |
|-------|-------|---------------|
| `id` | `gen_random_uuid()` | PK nuevo, no reusar ID antiguo |
| `created_at` | `NOW()` | Fecha de migración |
| `updated_at` | `NOW()` | Fecha de migración |
| `intentos_bot` | `0` | Reiniciar contador |
| `notificacion_enviada` | `false` | Requiere nueva notificación |
| `excluido_repulse` | `false` | Default seguro |
| `asistio` | `false` | Default |
| `estado_al_notificar` | `NULL` | Será calculado en próxima notif |

---

### 4. CAMPOS SIN MAPEO DIRECTO (NULL por defecto)

Estos campos no tienen equivalente en Sperant o requieren lógica adicional:

| Campo | Estrategia |
|-------|-----------|
| `historial_conversacion` | NULL (no existe en Sperant) |
| `historial_reciente` | NULL |
| `resumen_historial` | NULL |
| `ultimo_mensaje` | NULL |
| `horario_visita_timestamp` | NULL (o calcular si existe `fecha_proximo_evento_proyecto`) |
| `tipificacion_nivel_1` | NULL (mapeo manual posterior) |
| `tipificacion_nivel_2` | NULL |
| `tipificacion_nivel_3` | NULL |

---

### 5. CAMPOS DE SPERANT DESCARTADOS (39 campos)

Estos campos NO se migran porque:
- No tienen equivalente en `leads`
- Son metadatos de sistema antiguo
- Son redundantes

**Lista completa de campos descartados:**
```
id, created_at, numero, usuario_creador, tipo_persona, denominacion,
tipo_documento, nro_documento, telefono_principal (si celular existe),
agrupacion_medios_captacion, medio_captacion_proyecto,
agrupacion_canal_entrada, canal_entrada_proyecto, segmento,
fecha_asignacion, fecha_primera_interaccion_manual_proyecto,
ultima_interaccion_proyecto, fecha_ultima_interaccion_proyecto,
numero_interacciones_proyecto, fecha_proximo_evento_proyecto,
estado_civil, genero, edad, fecha_nacimiento, nacionalidad,
pais, departamento, provincia, distrito, domicilio,
proceso_captacion, autorizacion_uso_datos, apto,
autorizacion_publicidad, alto_riesgo, conyuge, conyuge_principal,
prioridad, observacion_interaccion_proyecto,
que_me_gustaria_preguntar, estas_buscando_financiamiento
```

**Recomendación:** Archivar `sperant_migrations_leads` después de migración exitosa para consulta histórica.

---

## SQL de Migración (Borrador)

```sql
-- ============================================================================
-- MIGRACIÓN: sperant_migrations_leads → leads
-- Fecha: 2026-01-27
-- Autor: DataDev (Database Architect)
-- ============================================================================

BEGIN;

-- Paso 1: Validar datos críticos
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Validar que todos los registros tengan al menos un teléfono
    SELECT COUNT(*) INTO invalid_count
    FROM sperant_migrations_leads
    WHERE celular IS NULL AND telefono_principal IS NULL;

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Hay % registros sin teléfono. Abortando migración.', invalid_count;
    END IF;

    RAISE NOTICE 'Validación OK: Todos los registros tienen teléfono';
END $$;

-- Paso 2: Insertar leads
INSERT INTO leads (
    -- Campos base
    telefono,
    nombre,
    email,
    rubro,

    -- Campos de estado
    estado,
    horario_visita,

    -- Relaciones
    proyecto_id,
    vendedor_asignado_id,

    -- UTM
    utm,

    -- Fechas
    fecha_captura,
    created_at,
    updated_at,

    -- Flags
    intentos_bot,
    notificacion_enviada,
    excluido_repulse,
    asistio,

    -- Observaciones
    observaciones_vendedor
)
SELECT
    -- Teléfono (priorizar celular)
    COALESCE(s.celular, s.telefono_principal) AS telefono,

    -- Nombre completo
    COALESCE(
        NULLIF(TRIM(COALESCE(s.nombres, '') || ' ' || COALESCE(s.apellidos, '')), ''),
        s.denominacion
    ) AS nombre,

    -- Email
    s.email,

    -- Rubro (desde ocupación)
    s.ocupacion AS rubro,

    -- Estado del lead (mapeo desde nivel_interes_proyecto)
    CASE s.nivel_interes_proyecto
        WHEN 'por contactar' THEN 'lead_nuevo'
        WHEN 'interesado' THEN 'lead_calificado'
        WHEN 'muy interesado' THEN 'lead_caliente'
        WHEN 'no interesado' THEN 'descartado'
        ELSE 'lead_nuevo'
    END AS estado,

    -- Horario visita
    s.en_que_horario_comunicar AS horario_visita,

    -- Proyecto ID (directo)
    s.proyecto_id,

    -- Vendedor asignado (lookup por username)
    (
        SELECT v.id
        FROM vendedores v
        WHERE v.username = s.usuario_asignado
        LIMIT 1
    ) AS vendedor_asignado_id,

    -- UTM consolidado
    CASE
        WHEN s.utm_source IS NOT NULL OR s.utm_medium IS NOT NULL THEN
            JSON_BUILD_OBJECT(
                'source', s.utm_source,
                'medium', s.utm_medium,
                'campaign', s.utm_campaign,
                'term', s.utm_term,
                'content', s.utm_content
            )::text
        ELSE NULL
    END AS utm,

    -- Fecha captura (convertir desde formato Excel)
    CASE
        WHEN s.fecha_creacion ~ '^[0-9]+\.?[0-9]*$' THEN
            TO_TIMESTAMP(CAST(s.fecha_creacion AS NUMERIC) * 24 * 60 * 60) +
            '1899-12-30 00:00:00'::timestamp
        ELSE NOW()
    END AS fecha_captura,

    -- Timestamps actuales
    NOW() AS created_at,
    NOW() AS updated_at,

    -- Flags default
    0 AS intentos_bot,
    false AS notificacion_enviada,
    false AS excluido_repulse,
    false AS asistio,

    -- Observaciones
    s.observaciones AS observaciones_vendedor

FROM sperant_migrations_leads s
WHERE
    -- Filtrar solo registros con teléfono válido
    COALESCE(s.celular, s.telefono_principal) IS NOT NULL

    -- Opcional: Filtrar por proyecto específico si se migra incrementalmente
    -- AND s.proyecto_id = 'UUID_DEL_PROYECTO'
;

-- Paso 3: Reportar resultados
DO $$
DECLARE
    migrated_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM leads WHERE created_at >= NOW() - INTERVAL '1 minute';
    SELECT COUNT(*) INTO total_count FROM sperant_migrations_leads;

    RAISE NOTICE '====================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Registros en Sperant: %', total_count;
    RAISE NOTICE 'Registros migrados: %', migrated_count;
    RAISE NOTICE 'Diferencia: %', (total_count - migrated_count);
    RAISE NOTICE '====================================';
END $$;

COMMIT;
```

---

## Validaciones Post-Migración

### 1. Conteo de Registros
```sql
-- Verificar cantidad migrada
SELECT COUNT(*) as total_migrados
FROM leads
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Comparar con origen
SELECT COUNT(*) as total_origen
FROM sperant_migrations_leads;
```

### 2. Validar Teléfonos Únicos
```sql
-- Detectar duplicados
SELECT telefono, COUNT(*) as duplicados
FROM leads
GROUP BY telefono
HAVING COUNT(*) > 1;
```

### 3. Validar Proyectos Válidos
```sql
-- Verificar que todos los proyecto_id existen
SELECT COUNT(*) as leads_sin_proyecto_valido
FROM leads l
LEFT JOIN proyectos p ON l.proyecto_id = p.id
WHERE l.proyecto_id IS NOT NULL AND p.id IS NULL;
```

### 4. Validar Vendedores Asignados
```sql
-- Verificar vendedores no encontrados
SELECT COUNT(*) as leads_con_vendedor_invalido
FROM leads l
LEFT JOIN vendedores v ON l.vendedor_asignado_id = v.id
WHERE l.vendedor_asignado_id IS NOT NULL AND v.id IS NULL;
```

### 5. Validar Estados
```sql
-- Ver distribución de estados
SELECT estado, COUNT(*) as cantidad
FROM leads
GROUP BY estado
ORDER BY cantidad DESC;
```

---

## Estrategia de Rollback

En caso de error o resultados incorrectos:

```sql
-- ROLLBACK INMEDIATO (si la transacción está abierta)
ROLLBACK;

-- ROLLBACK MANUAL (si ya se hizo COMMIT)
DELETE FROM leads
WHERE created_at >= '2026-01-27 [HORA_INICIO_MIGRACION]'
AND created_at <= '2026-01-27 [HORA_FIN_MIGRACION]';
```

**Recomendación:** Ejecutar primero en entorno de pruebas/staging.

---

## Consideraciones de Performance

### 1. Índices Recomendados Antes de Migración
```sql
-- Si no existen ya
CREATE INDEX IF NOT EXISTS idx_vendedores_username ON vendedores(username);
CREATE INDEX IF NOT EXISTS idx_proyectos_id ON proyectos(id);
```

### 2. Análisis de Tabla Post-Migración
```sql
ANALYZE leads;
```

### 3. Tamaño Estimado
- Registros en Sperant: ~[ESTIMAR]
- Tamaño por registro en `leads`: ~1-2 KB
- Tiempo estimado: [CALCULAR según volumen]

---

## Notas Técnicas

### Conversión de Fecha Excel
```sql
-- El formato numérico de Excel cuenta días desde 1900-01-01
-- Ejemplo: 46034.71805555555 = fecha en días decimales
TO_TIMESTAMP(CAST(fecha_creacion AS NUMERIC) * 24 * 60 * 60) + '1899-12-30'::timestamp
```

### Manejo de Valores NULL
- `COALESCE()` para fallbacks múltiples
- `NULLIF(TRIM(...), '')` para strings vacíos
- Validación estricta en campos críticos (teléfono)

### Transaccionalidad
- Todo el proceso en una sola transacción `BEGIN...COMMIT`
- Validaciones previas con `DO $$ ... END $$;`
- Reportes post-proceso para verificación

---

## Próximos Pasos

1. **Revisar mapeo con stakeholders** - Validar lógica de negocio
2. **Ejecutar en ambiente de pruebas** - Verificar resultados
3. **Ajustar transformaciones** - Si es necesario
4. **Planificar ventana de mantenimiento** - Para producción
5. **Preparar scripts de validación** - Queries de verificación
6. **Documentar hallazgos** - Registrar problemas encontrados

---

## Contacto

**Arquitecto de Base de Datos:** DataDev
**Fecha Documento:** 27 Enero 2026
**Versión:** 1.0
