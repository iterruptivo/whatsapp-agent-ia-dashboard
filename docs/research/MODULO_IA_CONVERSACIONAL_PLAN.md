# Módulo IA Conversacional - Plan de Implementación

**Fecha:** 9 Enero 2026
**Estado:** Planificación
**Prioridad:** Media

---

## Resumen Ejecutivo

Módulo de chat donde el usuario puede preguntar en lenguaje natural sobre los datos de la BD y recibir respuestas inteligentes + reportes.

### Ejemplos de Uso
- "¿Cómo van los leads de Trujillo?"
- "¿Cuántos están en conversación?"
- "¿Cuál es el sentimiento general?"
- "Dame un Excel con los leads sin asignar"

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                         │
│  └─ Componente ChatIA (streaming responses)                 │
├─────────────────────────────────────────────────────────────┤
│  BACKEND (Next.js API Routes)                               │
│  ├─ /api/ia/chat → Procesa pregunta                         │
│  ├─ /api/ia/export → Genera Excel/Word/PPTX                 │
│  └─ Custom SQL Agent (sin LangChain)                        │
├─────────────────────────────────────────────────────────────┤
│  IA                                                         │
│  ├─ GPT-4o (genera SQL + respuestas)                        │
│  ├─ GPT-4o-mini (formatea respuestas)                       │
│  └─ Schema inyectado en prompt                              │
├─────────────────────────────────────────────────────────────┤
│  BASE DE DATOS (Supabase)                                   │
│  ├─ PostgreSQL (leads, vendedores, etc.)                    │
│  └─ Usuario READ-ONLY para seguridad                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Procesamiento

```
USUARIO: "¿Cómo van los leads de Trujillo?"
        ↓
PASO 1: Enviar a GPT-4o con schema de la BD
        ↓
PASO 2: GPT-4o genera SQL
        SELECT COUNT(*), estado, sentimiento
        FROM leads l JOIN proyectos p ON l.proyecto_id = p.id
        WHERE p.nombre ILIKE '%Trujillo%'
        GROUP BY estado, sentimiento
        ↓
PASO 3: Validar SQL (solo SELECT, sin tablas sensibles)
        ↓
PASO 4: Ejecutar en Supabase (read-only)
        ↓
PASO 5: GPT-4o-mini formatea respuesta bonita
        ↓
RESPUESTA: "📊 Proyecto Trujillo tiene 571 leads:
            • 245 nuevos (43%)
            • 180 en conversación (31%) - 65% positivos
            💡 El engagement es bueno: 47% activos"
```

---

## Costos Estimados

| Componente | Costo | Notas |
|------------|-------|-------|
| LangChain | $0 | NO lo usamos, desarrollo custom |
| OpenAI GPT-4o | ~$15-30/mes | ~500 consultas/mes |
| Supabase | Ya pagado | Base de datos existente |
| Vercel | Ya pagado | Hosting existente |
| **TOTAL** | **~$15-30/mes** | Solo OpenAI API |

### Costo por Consulta
- GPT-4o (genera SQL): ~$0.01
- GPT-4o-mini (formatea): ~$0.005
- **Total por consulta: ~$0.015**

---

## Código de Referencia

### System Prompt con Schema

```typescript
const SYSTEM_PROMPT = `
Eres un asistente de análisis de datos para EcoPlaza (inmobiliaria).

## BASE DE DATOS (PostgreSQL)

### Tabla: leads
- id (uuid, PK)
- nombre (text) - Nombre del cliente
- telefono (text) - Ej: 51987654321
- email (text, nullable)
- proyecto_id (uuid, FK → proyectos)
- estado (text) - Valores: 'nuevo', 'en_conversacion', 'interesado', 'descartado'
- sentimiento (text) - Valores: 'positivo', 'neutral', 'negativo'
- utm (text) - Fuente: 'facebook', 'instagram', 'web_whatsapp'
- created_at (timestamp)
- vendedor_asignado_id (uuid, FK → vendedores)

### Tabla: proyectos
- id (uuid, PK)
- nombre (text) - Ej: 'Proyecto Trujillo', 'Proyecto Callao'

### Tabla: vendedores
- id (uuid, PK)
- nombre (text)
- telefono (text)
- activo (boolean)

### Tabla: locales_leads (ventas)
- id (uuid, PK)
- lead_id (uuid, FK → leads)
- local_id (uuid, FK → locales)
- estado_venta (text) - 'separado', 'contrato', 'pagado'

## REGLAS
1. SOLO genera queries SELECT (nunca INSERT, UPDATE, DELETE)
2. Siempre filtra por proyecto_id cuando el usuario mencione un proyecto
3. Responde en JSON: { "sql": "SELECT...", "explicacion": "..." }
`;
```

### Validación de Seguridad

```typescript
function validarSQL(sql: string): boolean {
  const sqlLower = sql.toLowerCase().trim();

  // SOLO permitir SELECT
  if (!sqlLower.startsWith('select')) return false;

  // Bloquear palabras peligrosas
  const forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'grant'];
  for (const word of forbidden) {
    if (sqlLower.includes(word)) return false;
  }

  // Bloquear tablas sensibles
  const forbiddenTables = ['usuarios', 'auth.users', 'passwords'];
  for (const table of forbiddenTables) {
    if (sqlLower.includes(table)) return false;
  }

  return true;
}
```

### Generación Automática del Schema

```typescript
async function getSchemaForPrompt() {
  const { data: tables } = await supabase
    .from('information_schema.columns')
    .select('table_name, column_name, data_type, is_nullable')
    .in('table_name', ['leads', 'proyectos', 'vendedores', 'locales', 'locales_leads'])
    .order('table_name');

  let schema = '## SCHEMA DE LA BASE DE DATOS\n\n';

  let currentTable = '';
  for (const col of tables) {
    if (col.table_name !== currentTable) {
      currentTable = col.table_name;
      schema += `\n### Tabla: ${currentTable}\n`;
    }
    schema += `- ${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ''})\n`;
  }

  return schema;
}
```

---

## Plan de Implementación

### FASE 1: MVP Chat (1-2 semanas)

| Tarea | Subagente | Archivos |
|-------|-----------|----------|
| Crear API /api/ia/chat | backend-dev | app/api/ia/chat/route.ts |
| Prompt con schema | backend-dev | lib/prompts-ia.ts |
| Validación SQL | backend-dev | lib/utils/sql-validator.ts |
| Usuario read-only Supabase | database-architect | migrations/ |
| Componente ChatIA | frontend-dev | components/ia/ChatIA.tsx |
| Página /ia | frontend-dev | app/ia/page.tsx |

### FASE 2: Reportes (1 semana)

| Tarea | Subagente | Archivos |
|-------|-----------|----------|
| Generación Excel | docs-specialist | lib/utils/excel-generator.ts |
| Generación Word | docs-specialist | lib/utils/word-generator.ts |
| API /api/ia/export | backend-dev | app/api/ia/export/route.ts |
| Botones de export en chat | frontend-dev | components/ia/ChatIA.tsx |

### FASE 3: Mejoras (1 semana)

| Tarea | Subagente | Archivos |
|-------|-----------|----------|
| Historial de conversación | backend-dev | tabla conversaciones_ia |
| Sugerencias de preguntas | frontend-dev | componente |
| Auto-charts | frontend-dev | Recharts integration |

---

## Seguridad (3 Capas)

1. **Validación Pre-ejecución**
   - Solo queries SELECT
   - Whitelist de tablas permitidas
   - Blacklist de palabras peligrosas

2. **Usuario Read-Only**
   - Crear usuario PostgreSQL con solo permisos SELECT
   - Sin acceso a tablas de autenticación

3. **Rate Limiting**
   - Máximo 10 consultas por minuto por usuario
   - Logging de todas las queries

---

## Decisiones Pendientes

- [ ] Nombre del módulo: "Victoria IA" / "IA BEBÉ" / "Pregúntale a la IA"
- [ ] Roles con acceso: Solo gerencia o todos
- [ ] Límite de consultas por día

---

## Fuentes de Investigación

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Text-to-SQL Best Practices](https://www.tigerdata.com/learn/text-to-sql)
- [SQL Injection Prevention (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Supabase Read-Only Users](https://supabase.com/docs/guides/database/postgres-roles)

---

**Última actualización:** 9 Enero 2026
