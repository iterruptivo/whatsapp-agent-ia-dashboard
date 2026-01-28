# Migración de Leads desde Sperant CRM

> Documentación completa de la importación de 9,370 leads desde Sperant Excel a Supabase

---

## Resumen Ejecutivo

**Fecha:** 27 Enero 2026
**Objetivo:** Importar base histórica de leads desde sistema Sperant para análisis de migración
**Resultado:** ✅ 9,370 registros importados exitosamente (100%)
**Tiempo:** 18.6 segundos (504 registros/segundo)

---

## Archivo Fuente

**Ruta:** `docs/sperant/sperant-09-01--27-01.xlsx`

| Característica | Valor |
|----------------|-------|
| Total filas | 9,371 (incluye header) |
| Total registros | 9,370 leads |
| Total columnas | 54 |
| Formato | Excel (.xlsx) |
| Rango de fechas | 09 Enero 2026 - 27 Enero 2026 |

---

## Estructura de Datos

### Columnas del Excel (54 columnas)

```
1.  N°
2.  Fecha Creación
3.  Usuario Creador
4.  Tipo Persona
5.  Denominación
6.  Apellidos
7.  Nombres
8.  Tipo Documento
9.  Nº Documento
10. Email
11. Celular
12. Teléfono Principal
13. Proyecto
14. Agrupación Medios De Captación
15. Medio De Captación (proyecto)
16. Agrupación Canal de Entrada
17. Canal De Entrada (proyecto)
18. Nivel De Interés (proyecto)
19. Segmento
20. Usuario asignado
21. Fecha de asignación
22. Fecha de primera interacción manual (Proyecto)
23. Última Interacción (Proyecto)
24. Fecha de última interacción (Proyecto)
25. Número de interacciones (Proyecto)
26. Fecha de próximo evento (Proyecto)
27. Utm_Source
28. Utm_Medium
29. Utm_Campaign
30. Utm_Term
31. Utm_Content
32. Estado Civil
33. Genero
34. Ocupación
35. Edad
36. Fecha Nacimiento
37. Nacionalidad
38. País
39. Departamento
40. Provincia
41. Distrito
42. Domicilio
43. Observaciones
44. Proceso De Captación
45. Autorización uso datos
46. Apto
47. Autorización Publicidad
48. Alto Riesgo
49. Cónyuge
50. Cónyuge principal
51. Prioridad
52. Observación de la interacción (Proyecto)
53. que_me_gustaria_preguntar
54. estas_buscando_financiamiento_para_adquirir_tu_local_comercial
55. en_que_horario_nos_podemos_comunicar_con_usted
```

---

## Tabla en Supabase

### Nombre: `sperant_migrations_leads`

**Total columnas:** 56 (54 datos + id + created_at)

### Schema

```sql
CREATE TABLE sperant_migrations_leads (
    -- Campos de control
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Datos del Excel (54 columnas)
    numero TEXT,
    fecha_creacion TEXT,
    usuario_creador TEXT,
    tipo_persona TEXT,
    denominacion TEXT,
    apellidos TEXT,
    nombres TEXT,
    tipo_documento TEXT,
    nro_documento TEXT,
    email TEXT,
    celular TEXT,
    telefono_principal TEXT,
    proyecto TEXT,
    agrupacion_medios_captacion TEXT,
    medio_captacion_proyecto TEXT,
    agrupacion_canal_entrada TEXT,
    canal_entrada_proyecto TEXT,
    nivel_interes_proyecto TEXT,
    segmento TEXT,
    usuario_asignado TEXT,
    fecha_asignacion TEXT,
    fecha_primera_interaccion_manual_proyecto TEXT,
    ultima_interaccion_proyecto TEXT,
    fecha_ultima_interaccion_proyecto TEXT,
    numero_interacciones_proyecto TEXT,
    fecha_proximo_evento_proyecto TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    estado_civil TEXT,
    genero TEXT,
    ocupacion TEXT,
    edad TEXT,
    fecha_nacimiento TEXT,
    nacionalidad TEXT,
    pais TEXT,
    departamento TEXT,
    provincia TEXT,
    distrito TEXT,
    domicilio TEXT,
    observaciones TEXT,
    proceso_captacion TEXT,
    autorizacion_uso_datos TEXT,
    apto TEXT,
    autorizacion_publicidad TEXT,
    alto_riesgo TEXT,
    conyuge TEXT,
    conyuge_principal TEXT,
    prioridad TEXT,
    observacion_interaccion_proyecto TEXT,
    que_me_gustaria_preguntar TEXT,
    estas_buscando_financiamiento TEXT,
    en_que_horario_comunicar TEXT
);
```

### Índices Creados

```sql
CREATE INDEX idx_sperant_nro_documento ON sperant_migrations_leads(nro_documento);
CREATE INDEX idx_sperant_email ON sperant_migrations_leads(email);
CREATE INDEX idx_sperant_celular ON sperant_migrations_leads(celular);
CREATE INDEX idx_sperant_proyecto ON sperant_migrations_leads(proyecto);
```

---

## Estadísticas de Importación

### Resumen General

| Métrica | Valor |
|---------|-------|
| **Total registros** | 9,370 |
| **Registros insertados** | 9,370 (100%) |
| **Tiempo total** | 18.6 segundos |
| **Velocidad** | 504 registros/segundo |
| **Batches procesados** | 19 (500 por batch) |
| **Errores** | 0 |

### Análisis de Duplicados

| Campo | Valores Únicos | % Únicos | Duplicados |
|-------|----------------|----------|------------|
| **Documentos** | 8,942 | 95.4% | 428 |
| **Emails** | 8,151 | 87.0% | 1,219 |
| **Celulares** | 8,940 | 95.4% | 430 |

**Nota:** Los duplicados fueron preservados intencionalmente para análisis posterior.

---

## Muestra de Datos

### Registros de Ejemplo

```
ID: 1
Nombre: Cinthia Katherine
Celular: +51928380194
Email: cinthia.cathe@gmail.com
Proyecto: EL MIRADOR DE SANTA CLARA
Medio: facebook

ID: 2
Nombre: Luis Fernando Ichpas Chávez
Celular: +51933334085
Email: ferichpas@gmail.com
Proyecto: EL MIRADOR DE SANTA CLARA
Medio: facebook

ID: 3
Nombre: Rosario Giraldez
Celular: +51963892934
Email: shary7_7@hotmail.com
Proyecto: CENTRO COMERCIAL WILSON
Medio: facebook
```

---

## Scripts de Importación

### 1. Crear Tabla

**Archivo:** `scripts/create-sperant-table.sql`

```bash
# Ejecutar migración
node scripts/run-migration-generic.js scripts/create-sperant-table.sql
```

### 2. Importar Datos

**Archivo:** `scripts/import-sperant-leads.js`

```bash
# Ejecutar importación
node scripts/import-sperant-leads.js
```

**Características del script:**
- ✅ Lee Excel con librería `xlsx`
- ✅ Transforma columnas a snake_case
- ✅ Inserta en batches de 500 para performance
- ✅ Usa service role key de Supabase (bypass RLS)
- ✅ Muestra progreso en consola
- ✅ Verifica COUNT final
- ✅ Resumen con estadísticas completas

### 3. Verificar Importación

```bash
# Verificar total de registros
node scripts/run-migration-generic.js --sql "SELECT COUNT(*) FROM sperant_migrations_leads"

# Verificar estadísticas de duplicados
node scripts/run-migration-generic.js --sql "
  SELECT
    COUNT(*) as total,
    COUNT(DISTINCT nro_documento) as documentos_unicos,
    COUNT(DISTINCT email) as emails_unicos,
    COUNT(DISTINCT celular) as celulares_unicos
  FROM sperant_migrations_leads
"

# Ver muestra de datos
node scripts/run-migration-generic.js --sql "
  SELECT id, numero, nombres, apellidos, nro_documento, celular, email, proyecto
  FROM sperant_migrations_leads
  ORDER BY id
  LIMIT 10
"
```

---

## Mapeo de Columnas

### Excel → Base de Datos (snake_case)

| Excel | Base de Datos |
|-------|---------------|
| N° | numero |
| Fecha Creación | fecha_creacion |
| Nº Documento | nro_documento |
| Medio De Captación (proyecto) | medio_captacion_proyecto |
| Fecha de asignación | fecha_asignacion |
| Utm_Source | utm_source |
| estas_buscando_financiamiento_para_adquirir_tu_local_comercial | estas_buscando_financiamiento |
| en_que_horario_nos_podemos_comunicar_con_usted | en_que_horario_comunicar |

**Reglas de transformación:**
- Espacios → underscore (`_`)
- Ñ → n
- Caracteres especiales → eliminados
- Mayúsculas → minúsculas
- Nombres largos → abreviados manteniendo semántica

---

## Queries de Análisis

### Análisis por Proyecto

```sql
SELECT
  proyecto,
  COUNT(*) as total_leads,
  COUNT(DISTINCT nro_documento) as documentos_unicos,
  COUNT(DISTINCT celular) as celulares_unicos
FROM sperant_migrations_leads
GROUP BY proyecto
ORDER BY total_leads DESC;
```

### Análisis por Medio de Captación

```sql
SELECT
  medio_captacion_proyecto,
  COUNT(*) as total_leads
FROM sperant_migrations_leads
WHERE medio_captacion_proyecto IS NOT NULL
GROUP BY medio_captacion_proyecto
ORDER BY total_leads DESC;
```

### Análisis UTM

```sql
SELECT
  utm_source,
  utm_medium,
  utm_campaign,
  COUNT(*) as total_leads
FROM sperant_migrations_leads
WHERE utm_source IS NOT NULL
GROUP BY utm_source, utm_medium, utm_campaign
ORDER BY total_leads DESC
LIMIT 20;
```

### Análisis Geográfico

```sql
SELECT
  departamento,
  provincia,
  distrito,
  COUNT(*) as total_leads
FROM sperant_migrations_leads
WHERE departamento IS NOT NULL
GROUP BY departamento, provincia, distrito
ORDER BY total_leads DESC
LIMIT 20;
```

### Duplicados por Documento

```sql
SELECT
  nro_documento,
  COUNT(*) as cantidad,
  STRING_AGG(DISTINCT nombres || ' ' || apellidos, ' | ') as nombres
FROM sperant_migrations_leads
WHERE nro_documento IS NOT NULL
GROUP BY nro_documento
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;
```

---

## Próximos Pasos

### Análisis Pendientes

1. **Cruce con tabla `leads` actual:**
   - Identificar leads ya existentes en el dashboard
   - Detectar leads no migrados de Sperant
   - Comparar datos para validar integridad

2. **Mapeo de Proyectos:**
   - Vincular proyectos Sperant con `proyectos` en EcoPlaza
   - Resolver diferencias de nombres

3. **Análisis de Medios de Captación:**
   - Normalizar nombres de medios
   - Mapear a estructura actual del dashboard

4. **Migración Selectiva (opcional):**
   - Si se requiere, migrar leads específicos a tabla `leads`
   - Preservar historial de interacciones

5. **Data Quality:**
   - Validar formatos de email
   - Normalizar números de teléfono
   - Limpiar documentos duplicados

---

## Notas Técnicas

### Decisiones de Diseño

**Todos los campos como TEXT:**
- Preserva datos originales sin pérdida
- Evita errores de conversión de tipos
- Permite análisis posterior con casting seguro

**Sin eliminación de duplicados:**
- Datos históricos preservados intactos
- Análisis de duplicados se hace post-importación
- Permite trazabilidad completa

**Batches de 500 registros:**
- Balance óptimo entre velocidad y memoria
- Permite reintentos granulares en caso de error
- No sobrecarga la conexión de Supabase

### Performance

**Velocidad alcanzada: 504 registros/segundo**
- Excelente para operaciones de bulk insert
- No requirió optimizaciones adicionales
- Tiempo total aceptable (18.6s)

**Índices creados anticipadamente:**
- Aceleran queries de análisis posteriores
- No impactan significativamente la velocidad de insert
- Optimizados para campos de búsqueda común

---

## Troubleshooting

### Error: "Cannot read file"
```bash
# Verificar ruta del archivo
ls docs/sperant/sperant-09-01--27-01.xlsx
```

### Error: "Connection timeout"
```bash
# Verificar credenciales en .env.local
cat .env.local | grep SUPABASE
```

### Error: "Duplicate key"
```bash
# La tabla ya existe, eliminar primero
node scripts/run-migration-generic.js --sql "DROP TABLE IF EXISTS sperant_migrations_leads CASCADE"
```

### Reimportar datos
```bash
# 1. Limpiar tabla
node scripts/run-migration-generic.js --sql "TRUNCATE TABLE sperant_migrations_leads RESTART IDENTITY"

# 2. Reimportar
node scripts/import-sperant-leads.js
```

---

## Archivos del Proyecto

```
docs/sperant/
├── README.md                          # Este archivo
├── sperant-09-01--27-01.xlsx          # Archivo fuente Excel (NO VERSIONAR)
└── .gitignore                         # Excluir Excel de git

scripts/
├── create-sperant-table.sql           # SQL de creación de tabla
├── import-sperant-leads.js            # Script de importación
└── run-migration-generic.js           # Ejecutor de migraciones

context/
├── CURRENT_STATE.md                   # Sesión 110 documentada
└── INDEX.md                           # Actualizado con métricas
```

---

## Contacto y Soporte

**Responsable:** Database Architect (DataDev)
**Sesión:** 110
**Fecha:** 27 Enero 2026
**Proyecto:** EcoPlaza Dashboard

Para consultas sobre esta migración, revisar `context/CURRENT_STATE.md` (Sesión 110).

---

**Última actualización:** 27 Enero 2026
