# Instrucciones de Migración - Leads Sperant a EcoPlaza Dashboard

**Última actualización:** 28 Enero 2026
**Propósito:** Importar leads de archivos Excel de Sperant a la tabla `leads` del sistema EcoPlaza

---

## 1. Resumen del Proceso

### ¿Qué hace?
Importa leads desde archivos Excel de Sperant en dos etapas:
1. **Staging:** Carga el Excel completo a tabla temporal `sperant_migrations_leads`
2. **Migración:** Transforma y mueve los datos a la tabla `leads` principal

### Pasos en Orden
1. Limpiar tabla staging
2. Importar Excel a staging
3. Verificar importación
4. Asignar `proyecto_id` según mapeo
5. Verificar que NO haya proyectos sin mapear
6. Verificar que TODOS los `proyecto_id` existen en tabla `proyectos`
7. Simular inserción (contar leads nuevos)
8. Ejecutar INSERT (solo con aprobación del usuario)
9. Verificar resultado final

---

## 2. Pre-requisitos

### Archivo Excel
- **Ubicación:** `E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\sperant\`
- **Nombre recomendado:** `sperant-leads-YYYY-MM-DD.xlsx`
- **Columnas requeridas:** celular, nombres, apellidos, email, proyecto, canal_entrada_proyecto, fecha_creacion

### Scripts Necesarios
| Script | Función |
|--------|---------|
| `scripts/import-sperant-leads.js` | Importa Excel a tabla staging |
| `scripts/create-sperant-table.sql` | Crea tabla staging (ya ejecutado) |
| `scripts/run-migration-generic.js` | Ejecuta queries SQL (ya disponible) |

### Variables de Entorno
Archivo `.env.local` debe tener:
```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 3. Mapeo de Proyectos DEFINITIVO

**⚠️ CRÍTICO: Este mapeo tiene los UUIDs CORRECTOS verificados con LEFT JOIN**

| Proyecto Sperant | proyecto_id (UUID CORRECTO) |
|------------------|----------------------------|
| ALAMEDA SANTO DOMINGO | 9a079169-b774-4589-be10-ec24b152c3c9 |
| CENTRO COMERCIAL CHORRILLOS | 854c2209-03e6-4c5d-94fb-2b2597371042 |
| CENTRO COMERCIAL WILSON | faa22187-8a7d-4d52-ba6e-95f15bbc8bb2 |
| Eco Plaza Boulevard | ed32412c-fd75-45df-bbb8-836653b8e05c |
| Eco Plaza Chincha | 1fc7d032-3d77-4163-b0fc-3131c3d37a7f |
| Eco Plaza Faucett | 89558b6b-ebcd-417a-8842-6fbe2e6f2525 |
| Eco Plaza Trujillo | 1f7c7b2d-c160-4e66-9d19-cc0e34a77e82 |
| EL MIRADOR DE SANTA CLARA | 1642fbc4-0aec-4246-a8d9-07b988bdee5c |
| Lord campo Verde | a4d2e072-27b9-4c38-9a89-4ec82b0d6609 |
| Lord Oasis Ica | eca0f6bc-f9f7-43d2-8a18-ab85a18211f6 |
| Lord Paraiso Santa Clara | 34c399f1-9ad5-4738-b7dc-894be6e8b150 |
| Mercado Huancayo | 6de287ed-7724-439e-a393-f7b3cdddea04 |
| Mercado San Gabriel | c8b033a0-72e9-48d9-8fbb-2d22f06bc231 |
| Mercado Santa Clara | 367c4857-3a1a-42b2-aa0d-cb4b00a5d79f |
| Mercado Trapiche | 0661ce3d-4a99-4f7d-82bf-242ecfa58f28 |
| Urbanización La Estación | 18d9105e-d7ef-4506-aea1-61428962f4fd |
| Urbanización San Gabriel | ab0452c0-cbc2-46f6-8360-6f1ec7ae8aa5 |

**Nota:** "Eco Plaza Faucett" y "Eco Plaza Callao" son el MISMO proyecto.

---

## 4. Mapeo de Campos

### Transformaciones de Datos

| Campo Sperant | → | Campo Leads | Transformación |
|---------------|---|-------------|----------------|
| celular | → | telefono | Quitar `+`, espacios, guiones. Formato: `51999888777` (max 15 caracteres) |
| nombres + apellidos | → | nombre | Concatenar con espacio: `TRIM(nombres || ' ' || apellidos)` |
| email | → | email | Tal cual |
| proyecto_id | → | proyecto_id | UUID del mapeo de arriba |
| canal_entrada_proyecto | → | utm | Tal cual |
| fecha_creacion | → | created_at | Convertir de serial Excel a timestamp |
| fecha_creacion | → | fecha_captura | Mismo valor que created_at |

### Fórmula Fecha Excel → Timestamp PostgreSQL
```sql
TO_TIMESTAMP((fecha_creacion::numeric - 25569) * 86400)
```

---

## 5. Pasos de Ejecución (en orden)

### **Paso 1: Limpiar tabla staging**

```sql
TRUNCATE TABLE sperant_migrations_leads;
```

Ejecutar con:
```bash
node scripts/run-migration-generic.js --sql "TRUNCATE TABLE sperant_migrations_leads;"
```

---

### **Paso 2: Importar Excel**

1. Editar `scripts/import-sperant-leads.js` y verificar el nombre del archivo:
```javascript
const filePath = path.join(__dirname, '..', 'docs', 'sperant', 'sperant-leads-2026-01-28.xlsx');
```

2. Ejecutar importación:
```bash
node scripts/import-sperant-leads.js
```

Debe mostrar:
```
Archivo Excel leído: X filas
Iniciando importación a Supabase...
Importación completada: X filas insertadas
```

---

### **Paso 3: Verificar importación**

```sql
SELECT COUNT(*) FROM sperant_migrations_leads;
```

Debe coincidir con el número de filas del Excel.

---

### **Paso 4: Asignar proyecto_id**

Ejecutar TODOS estos UPDATEs en orden:

```sql
-- ALAMEDA SANTO DOMINGO
UPDATE sperant_migrations_leads
SET proyecto_id = '9a079169-b774-4589-be10-ec24b152c3c9'
WHERE proyecto = 'ALAMEDA SANTO DOMINGO';

-- CENTRO COMERCIAL CHORRILLOS
UPDATE sperant_migrations_leads
SET proyecto_id = '854c2209-03e6-4c5d-94fb-2b2597371042'
WHERE proyecto = 'CENTRO COMERCIAL CHORRILLOS';

-- CENTRO COMERCIAL WILSON
UPDATE sperant_migrations_leads
SET proyecto_id = 'faa22187-8a7d-4d52-ba6e-95f15bbc8bb2'
WHERE proyecto = 'CENTRO COMERCIAL WILSON';

-- Eco Plaza Boulevard
UPDATE sperant_migrations_leads
SET proyecto_id = 'ed32412c-fd75-45df-bbb8-836653b8e05c'
WHERE proyecto = 'Eco Plaza Boulevard';

-- Eco Plaza Chincha
UPDATE sperant_migrations_leads
SET proyecto_id = '1fc7d032-3d77-4163-b0fc-3131c3d37a7f'
WHERE proyecto = 'Eco Plaza Chincha';

-- Eco Plaza Faucett (incluye Callao)
UPDATE sperant_migrations_leads
SET proyecto_id = '89558b6b-ebcd-417a-8842-6fbe2e6f2525'
WHERE proyecto IN ('Eco Plaza Faucett', 'Eco Plaza Callao');

-- Eco Plaza Trujillo
UPDATE sperant_migrations_leads
SET proyecto_id = '1f7c7b2d-c160-4e66-9d19-cc0e34a77e82'
WHERE proyecto = 'Eco Plaza Trujillo';

-- EL MIRADOR DE SANTA CLARA
UPDATE sperant_migrations_leads
SET proyecto_id = '1642fbc4-0aec-4246-a8d9-07b988bdee5c'
WHERE proyecto = 'EL MIRADOR DE SANTA CLARA';

-- Lord campo Verde
UPDATE sperant_migrations_leads
SET proyecto_id = 'a4d2e072-27b9-4c38-9a89-4ec82b0d6609'
WHERE proyecto = 'Lord campo Verde';

-- Lord Oasis Ica
UPDATE sperant_migrations_leads
SET proyecto_id = 'eca0f6bc-f9f7-43d2-8a18-ab85a18211f6'
WHERE proyecto = 'Lord Oasis Ica';

-- Lord Paraiso Santa Clara
UPDATE sperant_migrations_leads
SET proyecto_id = '34c399f1-9ad5-4738-b7dc-894be6e8b150'
WHERE proyecto = 'Lord Paraiso Santa Clara';

-- Mercado Huancayo
UPDATE sperant_migrations_leads
SET proyecto_id = '6de287ed-7724-439e-a393-f7b3cdddea04'
WHERE proyecto = 'Mercado Huancayo';

-- Mercado San Gabriel
UPDATE sperant_migrations_leads
SET proyecto_id = 'c8b033a0-72e9-48d9-8fbb-2d22f06bc231'
WHERE proyecto = 'Mercado San Gabriel';

-- Mercado Santa Clara
UPDATE sperant_migrations_leads
SET proyecto_id = '367c4857-3a1a-42b2-aa0d-cb4b00a5d79f'
WHERE proyecto = 'Mercado Santa Clara';

-- Mercado Trapiche
UPDATE sperant_migrations_leads
SET proyecto_id = '0661ce3d-4a99-4f7d-82bf-242ecfa58f28'
WHERE proyecto = 'Mercado Trapiche';

-- Urbanización La Estación
UPDATE sperant_migrations_leads
SET proyecto_id = '18d9105e-d7ef-4506-aea1-61428962f4fd'
WHERE proyecto = 'Urbanización La Estación';

-- Urbanización San Gabriel
UPDATE sperant_migrations_leads
SET proyecto_id = 'ab0452c0-cbc2-46f6-8360-6f1ec7ae8aa5'
WHERE proyecto = 'Urbanización San Gabriel';
```

---

### **Paso 5: Verificar proyectos sin mapear**

```sql
SELECT DISTINCT proyecto, COUNT(*)
FROM sperant_migrations_leads
WHERE proyecto_id IS NULL
GROUP BY proyecto;
```

**Resultado esperado:** 0 filas

**Si aparecen proyectos nuevos:**
1. Buscar su UUID en tabla `proyectos`:
   ```sql
   SELECT id, nombre FROM proyectos WHERE nombre ILIKE '%nombre_proyecto%';
   ```
2. Si no existe, crear el proyecto primero
3. Agregar UPDATE para ese proyecto

---

### **Paso 6: Verificar que TODOS los proyecto_id existen en tabla proyectos**

**⚠️ CRÍTICO: Esta query es OBLIGATORIA antes de insertar**

```sql
SELECT DISTINCT s.proyecto_id, s.proyecto, COUNT(*)
FROM sperant_migrations_leads s
LEFT JOIN proyectos p ON s.proyecto_id = p.id
WHERE s.proyecto_id IS NOT NULL
  AND p.id IS NULL
GROUP BY s.proyecto_id, s.proyecto;
```

**Resultado esperado:** 0 filas

**Si aparecen filas:** Los UUIDs están MAL. Revisar el mapeo de proyectos.

---

### **Paso 7: Simular inserción (SIN insertar)**

```sql
SELECT COUNT(*) as leads_nuevos
FROM sperant_migrations_leads s
WHERE celular IS NOT NULL
  AND proyecto_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM proyectos p WHERE p.id = s.proyecto_id)
  AND NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE REPLACE(REPLACE(REPLACE(l.telefono, '+', ''), ' ', ''), '-', '')
        = REPLACE(REPLACE(REPLACE(s.celular, '+', ''), ' ', ''), '-', '')
  );
```

**Acción:** Informar al usuario cuántos leads se insertarían. **ESPERAR aprobación explícita.**

---

### **Paso 8: Ejecutar INSERT (solo con aprobación)**

**⚠️ SOLO ejecutar si el usuario aprueba**

```sql
INSERT INTO leads (telefono, nombre, email, proyecto_id, utm, created_at, fecha_captura)
SELECT
  LEFT(REPLACE(REPLACE(REPLACE(celular, '+', ''), ' ', ''), '-', ''), 15),
  TRIM(COALESCE(nombres, '') || ' ' || COALESCE(apellidos, '')),
  email,
  proyecto_id,
  canal_entrada_proyecto,
  TO_TIMESTAMP((fecha_creacion::numeric - 25569) * 86400),
  TO_TIMESTAMP((fecha_creacion::numeric - 25569) * 86400)
FROM sperant_migrations_leads s
WHERE celular IS NOT NULL
  AND proyecto_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM proyectos p WHERE p.id = s.proyecto_id)
  AND NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE REPLACE(REPLACE(REPLACE(l.telefono, '+', ''), ' ', ''), '-', '')
        = REPLACE(REPLACE(REPLACE(s.celular, '+', ''), ' ', ''), '-', '')
  );
```

---

### **Paso 9: Verificar resultado**

```sql
SELECT COUNT(*) FROM leads;
```

Comparar con el count anterior. La diferencia debe ser igual a `leads_nuevos` del Paso 7.

---

## 6. Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `INSERT viola foreign key constraint "leads_proyecto_id_fkey"` | UUID de proyecto NO existe en tabla proyectos | Ejecutar query del Paso 6. Revisar UUIDs del mapeo |
| Algunos leads no se importan | Teléfono duplicado | Normal, es la validación anti-duplicados |
| Fechas incorrectas (año 1900) | Fórmula Excel mal aplicada | Usar `(fecha_creacion::numeric - 25569) * 86400` |
| Teléfonos cortados | Muy largos | Se usa `LEFT(..., 15)` para truncar |
| Proyecto nuevo aparece en Paso 5 | Excel tiene proyecto no mapeado | Crear proyecto primero o buscar su UUID real |

---

## 7. Lecciones Aprendidas

### Validación de UUIDs es CRÍTICA
Los UUIDs de proyectos pueden tener el mismo inicio pero diferente final. **SIEMPRE** verificar con LEFT JOIN (Paso 6) antes de insertar.

**Ejemplo de error común:**
```
9a079169-b774-4589-be10-ec24b152c3c9  ← CORRECTO
9a079169-b774-4589-be10-XXXXXXXXXXXX  ← INCORRECTO (mismo inicio)
```

### Nunca Saltar la Simulación
Siempre ejecutar el Paso 7 (contar leads nuevos) y **esperar aprobación** antes de insertar.

### No Eliminar Staging Sin Autorización
La tabla `sperant_migrations_leads` debe mantenerse hasta que el usuario confirme que todo está OK.

### Proyectos Nuevos
Si aparece un proyecto en el Excel que no existe en el sistema:
1. Crear el proyecto en la tabla `proyectos` primero
2. Obtener su UUID real
3. Agregarlo al mapeo de proyectos
4. Ejecutar UPDATE para asignar ese UUID

---

## 8. Checklist Final

Antes de dar por terminado el proceso, verificar:

- [ ] Paso 1: Staging limpio
- [ ] Paso 2: Excel importado correctamente
- [ ] Paso 3: Count de staging coincide con Excel
- [ ] Paso 4: Todos los UPDATEs ejecutados
- [ ] Paso 5: **0 proyectos sin mapear**
- [ ] Paso 6: **0 UUIDs inexistentes** (LEFT JOIN)
- [ ] Paso 7: Simulación ejecutada, usuario aprobó
- [ ] Paso 8: INSERT ejecutado sin errores
- [ ] Paso 9: Count final de leads correcto
- [ ] Usuario confirmó que datos son correctos
- [ ] Staging `sperant_migrations_leads` mantenido hasta confirmación final

---

## 9. Comandos Rápidos

### Limpiar staging
```bash
node scripts/run-migration-generic.js --sql "TRUNCATE TABLE sperant_migrations_leads;"
```

### Importar Excel
```bash
node scripts/import-sperant-leads.js
```

### Ver proyectos sin mapear
```bash
node scripts/run-migration-generic.js --sql "SELECT DISTINCT proyecto, COUNT(*) FROM sperant_migrations_leads WHERE proyecto_id IS NULL GROUP BY proyecto;"
```

### Validar UUIDs (CRÍTICO)
```bash
node scripts/run-migration-generic.js --sql "SELECT DISTINCT s.proyecto_id, s.proyecto, COUNT(*) FROM sperant_migrations_leads s LEFT JOIN proyectos p ON s.proyecto_id = p.id WHERE s.proyecto_id IS NOT NULL AND p.id IS NULL GROUP BY s.proyecto_id, s.proyecto;"
```

### Simular inserción
```bash
node scripts/run-migration-generic.js --sql "SELECT COUNT(*) as leads_nuevos FROM sperant_migrations_leads s WHERE celular IS NOT NULL AND proyecto_id IS NOT NULL AND EXISTS (SELECT 1 FROM proyectos p WHERE p.id = s.proyecto_id) AND NOT EXISTS (SELECT 1 FROM leads l WHERE REPLACE(REPLACE(REPLACE(l.telefono, '+', ''), ' ', ''), '-', '') = REPLACE(REPLACE(REPLACE(s.celular, '+', ''), ' ', ''), '-', ''));"
```

---

**Fin del documento**

