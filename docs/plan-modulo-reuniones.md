# Plan: Modulo de Transcripciones - Command Center

**Fecha:** 6 Enero 2026
**Version:** 1.0
**Estado:** Aprobacion pendiente

---

## Resumen Ejecutivo

Modulo para transcribir reuniones (audio/video) y extraer automaticamente resumenes y action items usando OpenAI.

- **Costo procesamiento:** ~$0.38 USD por reunion de 1 hora
- **Costo storage (50 reuniones/mes):** ~$0.40 USD/mes
- **Stack:** Whisper (transcripcion) + GPT-4 (resumen)
- **Storage:** Supabase Storage (30 dias) + Supabase DB (permanente)
- **Retencion:** Audio/video disponible 30 dias, luego se elimina automaticamente
- **Timeline:** 4 semanas (MVP + Action Items + Polish)

---

## Investigacion de Mercado

### Plataformas Analizadas

| Plataforma | Precio/usuario/mes | Diferenciador |
|------------|-------------------|---------------|
| **Otter.ai** | $17-30 | Lider del mercado, chat con transcripcion |
| **Fireflies.ai** | $10-39 | Mejor integracion CRM, analytics |
| **Read.ai** | $20 | Metricas de calidad de reunion |
| **Fathom** | Gratis | UX minimalista, usa Claude |
| **tl;dv** | $18-59 | Video-first, clips con timestamps |
| **Grain** | $19-39 | Revenue intelligence para ventas |

### Tecnologias de Transcripcion

| Servicio | Costo/hora | Precision Espanol | Speaker Diarization |
|----------|------------|-------------------|---------------------|
| **OpenAI Whisper** | $0.36 | 92-95% | No (requiere adicional) |
| **AssemblyAI** | $0.15 + extras | ~90% | Si incluido |
| **Deepgram** | $0.75 | ~88% | Si incluido |

**Recomendacion:** OpenAI Whisper por costo y precision en espanol.

---

## Arquitectura Tecnica

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMAND CENTER                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    ┌──────────────┐    ┌───────────────┐    │
│   │  SUBIR   │───▶│  SUPABASE    │───▶│   WHISPER     │    │
│   │  AUDIO   │    │  STORAGE     │    │   (OpenAI)    │    │
│   │  /VIDEO  │    │  (30 dias)   │    │               │    │
│   └──────────┘    └──────────────┘    └───────────────┘    │
│                          │                    │              │
│                          │                    ▼              │
│                          │            ┌───────────────┐     │
│                          ▼            │   GPT-4       │     │
│                   ┌──────────────┐    │   (Resumen +  │     │
│                   │  CRON JOB    │    │   Actions)    │     │
│                   │  (limpieza   │    └───────────────┘     │
│                   │   >30 dias)  │            │              │
│                   └──────────────┘            ▼              │
│                                        ┌───────────────┐     │
│                                        │   SUPABASE    │     │
│                                        │   DATABASE    │     │
│                                        │   (permanente)│     │
│                                        └───────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pipeline de Procesamiento

1. **Usuario sube archivo** (audio/video hasta 2GB)
2. **Supabase Storage** almacena en bucket `reuniones-media`
3. **API Route** descarga el archivo y lo envia a Whisper
4. **Whisper API** transcribe (chunked si >25MB)
5. **GPT-4 Turbo** genera resumen estructurado + action items
6. **Guardar en Supabase** tablas `reuniones` y `reunion_action_items`
7. **Notificar** al usuario que esta listo
8. **Cron job (diario)** elimina archivos con >30 dias de antiguedad

### Procesamiento Background y UX

El proceso se divide en dos fases con diferente experiencia de usuario:

#### Fase 1: Subida del Archivo (BLOQUEANTE)

```
┌─────────────────────────────────────────────────────────────┐
│  Subiendo archivo...                                        │
│                                                              │
│  reunion-semanal.mp4                                        │
│  ████████████████░░░░░░░░░░░░░░ 45%                        │
│  450 MB de 1.2 GB • 2 min restantes                        │
│                                                              │
│  ⚠️ No cierres esta ventana hasta que termine la subida    │
│                                                              │
│                                          [Cancelar]         │
└─────────────────────────────────────────────────────────────┘
```

- Usuario DEBE permanecer en la pantalla
- Barra de progreso con porcentaje y tiempo estimado
- Si cierra, se cancela la subida
- Al completar subida → pasa a Fase 2 automaticamente

#### Fase 2: Transcripcion (BACKGROUND)

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Archivo subido correctamente                            │
│                                                              │
│  Tu reunion se esta procesando en segundo plano.            │
│  Te notificaremos cuando este lista.                        │
│                                                              │
│  Tiempo estimado: 5-10 minutos                              │
│                                                              │
│  [Ver mis reuniones]              [Seguir trabajando]       │
└─────────────────────────────────────────────────────────────┘
```

- Usuario puede navegar libremente por el dashboard
- Proceso corre en API Route o Edge Function
- Estado guardado en DB: `procesando` → `completado` / `error`
- Notificacion cuando termina (toast o badge en sidebar)

#### Sistema de Notificaciones

Cuando la transcripcion esta lista:

1. **Toast notification** si el usuario esta en el dashboard
2. **Badge en sidebar** "Reuniones (1 nueva)"
3. **Opcional futuro:** Email o push notification

#### Estados de la Reunion

| Estado | Descripcion | Icono |
|--------|-------------|-------|
| `subiendo` | Archivo subiendo a Storage | ⏳ Spinner |
| `procesando` | Whisper + GPT trabajando | 🔄 Progress |
| `completado` | Listo para ver | ✅ Check |
| `error` | Fallo en el proceso | ❌ Error |

### Por que Supabase Storage (no Cloudflare R2)

| Aspecto | Supabase Storage | Cloudflare R2 |
|---------|------------------|---------------|
| Integracion | Ya integrado | Requiere config |
| Auth | Usa mismo auth | Separado |
| RLS | Soportado | No aplica |
| Costo | 1GB gratis, luego $0.021/GB | 10GB gratis |
| Complejidad | Baja | Media |

**Decision:** Usar Supabase Storage por simplicidad y ya estar integrado.

---

## Modelo de Datos

### Tabla: reuniones

```sql
CREATE TABLE reuniones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id) NOT NULL,
  created_by UUID REFERENCES usuarios(id) NOT NULL,

  -- Metadata
  titulo VARCHAR(255) NOT NULL,
  fecha_reunion TIMESTAMPTZ,
  duracion_segundos INTEGER,
  participantes TEXT[], -- Array de nombres mencionados

  -- Archivo multimedia (retenido 30 dias)
  media_storage_path TEXT,      -- Path en Supabase Storage
  media_tipo VARCHAR(20),       -- 'audio' o 'video'
  media_size_bytes BIGINT,      -- Tamano del archivo
  media_deleted_at TIMESTAMPTZ, -- Cuando se elimino (despues de 30 dias)

  -- Contenido procesado
  transcripcion_completa TEXT,
  resumen TEXT,
  puntos_clave JSONB,      -- ["punto 1", "punto 2"]
  decisiones JSONB,        -- ["decision 1", "decision 2"]
  preguntas_abiertas JSONB, -- ["pregunta 1"]

  -- Estado de procesamiento
  estado VARCHAR(20) DEFAULT 'procesando', -- procesando, completado, error
  error_mensaje TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indices
CREATE INDEX idx_reuniones_proyecto ON reuniones(proyecto_id);
CREATE INDEX idx_reuniones_created_by ON reuniones(created_by);
CREATE INDEX idx_reuniones_estado ON reuniones(estado);
CREATE INDEX idx_reuniones_fecha ON reuniones(fecha_reunion DESC);
```

### Tabla: reunion_action_items

```sql
CREATE TABLE reunion_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id UUID REFERENCES reuniones(id) ON DELETE CASCADE NOT NULL,

  -- Contenido
  descripcion TEXT NOT NULL,
  asignado_nombre VARCHAR(255),        -- Nombre inferido de la transcripcion
  asignado_usuario_id UUID REFERENCES usuarios(id), -- Vinculo opcional a usuario real
  deadline DATE,
  prioridad VARCHAR(20) DEFAULT 'media', -- alta, media, baja
  contexto_quote TEXT,                  -- Cita textual de donde salio

  -- Estado
  completado BOOLEAN DEFAULT FALSE,
  completado_at TIMESTAMPTZ,
  completado_por UUID REFERENCES usuarios(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_action_items_reunion ON reunion_action_items(reunion_id);
CREATE INDEX idx_action_items_asignado ON reunion_action_items(asignado_usuario_id);
CREATE INDEX idx_action_items_completado ON reunion_action_items(completado);
```

### Bucket: reuniones-media

```sql
-- Crear bucket en Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('reuniones-media', 'reuniones-media', false);

-- Policy: Solo usuarios autenticados pueden subir
CREATE POLICY "Users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reuniones-media');

-- Policy: Usuarios con rol permitido pueden leer
CREATE POLICY "Users can read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'reuniones-media'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);
```

### Cron Job: Limpieza de Archivos >30 dias

```sql
-- Funcion para limpiar archivos antiguos
CREATE OR REPLACE FUNCTION cleanup_old_media_files()
RETURNS void AS $$
DECLARE
  file_record RECORD;
BEGIN
  -- Buscar reuniones con archivo y >30 dias
  FOR file_record IN
    SELECT id, media_storage_path
    FROM reuniones
    WHERE media_storage_path IS NOT NULL
    AND created_at < NOW() - INTERVAL '30 days'
  LOOP
    -- Eliminar archivo de storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'reuniones-media'
    AND name = file_record.media_storage_path;

    -- Limpiar referencia en la tabla
    UPDATE reuniones
    SET media_storage_path = NULL,
        media_deleted_at = NOW()
    WHERE id = file_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Programar con pg_cron (o llamar desde Vercel Cron)
-- SELECT cron.schedule('cleanup-media', '0 3 * * *', 'SELECT cleanup_old_media_files()');
```

---

## Roles y Permisos

### Matriz de Permisos

| Rol | Ver Reuniones | Subir Reuniones | Ver Transcripcion | Ver Action Items |
|-----|---------------|-----------------|-------------------|------------------|
| **admin** | Todas | Si | Si | Todos |
| **gerencia** | Todas | Si | Si | Todos |
| **jefe_ventas** | De su proyecto | Si | Si | Todos |
| **vendedor** | No | No | No | Todos |
| **caseta** | No | No | No | Todos |
| **finanzas** | No | No | No | Todos |

### Logica de Acceso

**Reuniones (lista y detalle):**
- `admin`, `gerencia`: Ven todas las reuniones de todos los proyectos
- `jefe_ventas`: Ve reuniones de los proyectos donde tiene acceso
- Otros roles: No ven el modulo de reuniones

**Action Items:**
- TODOS los roles pueden ver los action items
- Se muestran en una seccion separada "Mis Pendientes" o similar
- Cada usuario ve los action items donde su nombre coincide o esta asignado

### RLS Policies

```sql
-- Reuniones: Solo roles permitidos
CREATE POLICY "reuniones_select" ON reuniones
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol IN ('admin', 'gerencia', 'jefe_ventas')
    AND (
      u.rol IN ('admin', 'gerencia')
      OR reuniones.proyecto_id = ANY(u.proyectos_asignados)
    )
  )
);

-- Action Items: Todos pueden ver
CREATE POLICY "action_items_select" ON reunion_action_items
FOR SELECT TO authenticated
USING (true);

-- Action Items: Solo asignado puede marcar completado
CREATE POLICY "action_items_update" ON reunion_action_items
FOR UPDATE TO authenticated
USING (
  asignado_usuario_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'gerencia')
  )
);
```

---

## Flujo de Usuario (UX)

### Navegacion

```
Sidebar:
├── Dashboard
├── Operativo
├── Locales
├── ...
├── Reuniones        ← NUEVO (solo admin/gerencia/jefe_ventas)
└── Mis Pendientes   ← NUEVO (todos los roles)
```

### Pantalla: Lista de Reuniones

```
┌─────────────────────────────────────────────────────────────┐
│  Reuniones                                 [+ Nueva Reunion] │
├─────────────────────────────────────────────────────────────┤
│  Buscar...                         Proyecto: [Todos ▼]       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Reunion Semanal Ventas                      6 Ene 2026 │ │
│  │ Proyecto Chincha • 45 min • 5 action items             │ │
│  │ 2 completados • 3 pendientes                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Kickoff Q1 2026                             5 Ene 2026 │ │
│  │ General • 1h 20min • 8 action items                    │ │
│  │ 5 completados • 3 pendientes                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Procesando...] Revision Contratos          Hace 2 min │ │
│  │ ████████░░░░░░░░░░░░ 45%                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Modal: Nueva Reunion

```
┌─────────────────────────────────────────────────────────────┐
│  Nueva Reunion                                         [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Titulo *                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Reunion semanal de ventas                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Proyecto *                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Proyecto Chincha                                    ▼  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Fecha de la reunion                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 06/01/2026                                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Archivo de audio o video *                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │         Arrastra tu archivo aqui                       │ │
│  │         o haz clic para seleccionar                    │ │
│  │                                                         │ │
│  │         MP3, MP4, WAV, M4A, WEBM                       │ │
│  │         Maximo 2 GB                                    │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ⚠️ El archivo se procesara y eliminara automaticamente.    │
│     Solo se guardara la transcripcion.                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Procesar Reunion                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pantalla: Detalle de Reunion

```
┌─────────────────────────────────────────────────────────────┐
│  ← Reuniones                                                │
│                                                              │
│  Reunion Semanal Ventas                                     │
│  6 Ene 2026 • 45 min • Chincha • Creado por: Alonso        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Resumen]  [Action Items (5)]  [Transcripcion]             │
│  ════════                                                   │
│                                                              │
│  RESUMEN                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Se reviso el avance de ventas del proyecto Chincha.    │ │
│  │ El equipo reporto 15 separaciones nuevas esta semana.  │ │
│  │ Se definieron metas para el siguiente trimestre.       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  PUNTOS CLAVE                                               │
│  • 15 separaciones nuevas en Chincha                        │
│  • Meta Q1: 50 ventas cerradas                              │
│  • Nuevo script de ventas aprobado                          │
│                                                              │
│  DECISIONES                                                 │
│  • Implementar nuevo script desde el lunes                  │
│  • Contratar 2 vendedores adicionales                       │
│                                                              │
│  PREGUNTAS ABIERTAS                                         │
│  • Cuando llega el material de marketing?                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Tab: Action Items

```
┌─────────────────────────────────────────────────────────────┐
│  [Resumen]  [Action Items (5)]  [Transcripcion]             │
│              ══════════════════                             │
│                                                              │
│  ACTION ITEMS                                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ☐ Enviar nuevo script a todo el equipo                 │ │
│  │   Asignado: Maria Lopez • Deadline: 8 Ene • Alta       │ │
│  │   "Maria va a enviar el script actualizado antes..."   │ │
│  │   [Vincular Usuario ▼]            [Marcar Completado]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ☐ Coordinar entrevistas con RRHH                       │ │
│  │   Asignado: Juan Perez • Deadline: 10 Ene • Media      │ │
│  │   "Juan se encarga de coordinar las entrevistas..."    │ │
│  │   [Vincular Usuario ▼]            [Marcar Completado]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ☑ Actualizar precios en el sistema                     │ │
│  │   Completado por: Alonso • 6 Ene 2026                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pantalla: Mis Pendientes (todos los roles)

```
┌─────────────────────────────────────────────────────────────┐
│  Mis Pendientes                                             │
├─────────────────────────────────────────────────────────────┤
│  Tienes 3 action items pendientes                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ☐ Enviar nuevo script a todo el equipo                 │ │
│  │   De: Reunion Semanal Ventas • 8 Ene • Alta            │ │
│  │                                   [Marcar Completado]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ☐ Preparar reporte mensual                             │ │
│  │   De: Kickoff Q1 2026 • 15 Ene • Media                 │ │
│  │                                   [Marcar Completado]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ── Completados recientemente ──                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ☑ Actualizar precios en el sistema                     │ │
│  │   Completado: 6 Ene 2026                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Prompts de IA

### Prompt: Generar Resumen

```
Eres un asistente experto en resumir reuniones de trabajo.

Dada la siguiente transcripcion de una reunion, genera:

1. RESUMEN: 2-3 oraciones que capturen la esencia de la reunion
2. PUNTOS_CLAVE: Lista de 3-5 puntos importantes discutidos
3. DECISIONES: Lista de decisiones tomadas (si las hay)
4. PREGUNTAS_ABIERTAS: Preguntas que quedaron sin responder (si las hay)

Responde SOLO en formato JSON:
{
  "resumen": "...",
  "puntos_clave": ["...", "..."],
  "decisiones": ["...", "..."],
  "preguntas_abiertas": ["...", "..."]
}

TRANSCRIPCION:
{transcripcion}
```

### Prompt: Extraer Action Items

```
Eres un asistente experto en identificar tareas y compromisos en reuniones.

Dada la siguiente transcripcion, identifica TODOS los action items (tareas, compromisos, pendientes).

Para cada action item extrae:
- descripcion: Que se debe hacer
- asignado_nombre: A quien se asigno (nombre mencionado)
- deadline: Fecha limite si se menciono (formato YYYY-MM-DD)
- prioridad: "alta" si es urgente, "media" si es normal, "baja" si no es urgente
- contexto_quote: Cita textual de donde se menciono

Responde SOLO en formato JSON:
{
  "action_items": [
    {
      "descripcion": "...",
      "asignado_nombre": "...",
      "deadline": "YYYY-MM-DD o null",
      "prioridad": "alta|media|baja",
      "contexto_quote": "..."
    }
  ]
}

Keywords para detectar action items:
- "voy a", "me encargo", "yo hago"
- "tienes que", "necesitas", "deberias"
- "para el [fecha]", "antes del [fecha]"
- "pendiente", "tarea", "compromiso"

TRANSCRIPCION:
{transcripcion}
```

---

## Costos Estimados

### Por Reunion (1 hora de audio)

| Concepto | Costo USD |
|----------|-----------|
| Whisper API (60 min x $0.006) | $0.36 |
| GPT-4 Turbo (resumen, ~2000 tokens) | $0.02 |
| **Total procesamiento** | **~$0.38** |

### Retencion de Archivos (30 dias)

**Opcion:** Mantener el audio/video por 30 dias antes de eliminarlo automaticamente.
Esto permite reproducir el audio original si se necesita revisar algo.

**Pricing Supabase Storage:** $0.021/GB/mes (1GB gratis incluido)

| Tipo archivo | Tamano promedio | 20 reuniones/mes | 50 reuniones/mes |
|--------------|-----------------|------------------|------------------|
| Solo audio (MP3) | ~100 MB | 2 GB = $0.02 | 5 GB = $0.08 |
| Video corto (MP4) | ~500 MB | 10 GB = $0.19 | 25 GB = $0.50 |
| Video largo (MP4) | ~1.5 GB | 30 GB = $0.61 | 75 GB = $1.55 |

**Conclusion:** El costo de almacenamiento sigue siendo bajo (~$1.55/mes en caso extremo de 50 videos largos).
**Recomendacion:** Retener archivos 30 dias, luego eliminar con cron job.

### Proyeccion Mensual Total

| Escenario | Reuniones | Procesamiento | Storage 30d | **Total** |
|-----------|-----------|---------------|-------------|-----------|
| Bajo (audio) | 20 | $8 | $0.02 | **$8.02** |
| Medio (audio) | 50 | $19 | $0.08 | **$19.08** |
| Medio (video corto) | 50 | $19 | $0.50 | **$19.50** |
| Alto (video largo) | 50 | $19 | $1.55 | **$20.55** |

---

## Flujo de Agentes para Implementacion

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE AGENTES                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   strategic-researcher     ✅ COMPLETADO                     │
│   (Investigacion)          - Plataformas analizadas          │
│         │                  - Tecnologias evaluadas           │
│         ▼                  - Plan inicial definido           │
│                                                              │
│   architect                ⏳ SIGUIENTE                      │
│   (Arquitectura)           - Diseño detallado del modulo     │
│         │                  - Estructura de archivos          │
│         │                  - Decisiones tecnicas             │
│         ▼                                                    │
│                                                              │
│   database-architect       ⏳ PENDIENTE                      │
│   (Base de datos)          - Crear tablas                    │
│         │                  - Configurar Storage              │
│         │                  - RLS policies                    │
│         ▼                                                    │
│                                                              │
│   backend-dev              ⏳ PENDIENTE                      │
│   (APIs y logica)          - API Routes                      │
│         │                  - Integracion Whisper/GPT         │
│         │                  - Procesamiento background        │
│         ▼                                                    │
│                                                              │
│   frontend-dev             ⏳ PENDIENTE                      │
│   (UI/UX)                  - Paginas y componentes           │
│         │                  - Upload con progreso             │
│         │                  - Notificaciones                  │
│         ▼                                                    │
│                                                              │
│   qa-specialist            ⏳ PENDIENTE                      │
│   (Testing)                - Pruebas E2E                     │
│                            - Validacion de flujos            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Fases de Implementacion

### Fase 1: MVP (2 semanas)

**database-architect:**
- [ ] Crear tabla `reuniones` en Supabase
- [ ] Crear tabla `reunion_action_items`
- [ ] Crear bucket `reuniones-media` en Supabase Storage
- [ ] Configurar RLS policies para reuniones
- [ ] Funcion SQL para cleanup de archivos >30 dias

**backend-dev:**
- [ ] API Route: POST /api/reuniones/upload (subida con progreso)
- [ ] API Route: POST /api/reuniones/[id]/process (transcripcion background)
- [ ] API Route: GET /api/reuniones (lista)
- [ ] API Route: GET /api/reuniones/[id] (detalle)
- [ ] Integracion con OpenAI Whisper (chunked para >25MB)
- [ ] Integracion con GPT-4 para resumen
- [ ] Vercel Cron para cleanup diario

**frontend-dev:**
- [ ] Pagina /reuniones (lista con estados)
- [ ] Modal nueva reunion con drag-drop y progreso de subida
- [ ] Pagina /reuniones/[id] (detalle)
- [ ] Tabs: Resumen, Action Items, Transcripcion
- [ ] Componente de estado procesando/completado/error
- [ ] Sistema de notificaciones (toast cuando termina)

### Fase 2: Action Items (1 semana)

**backend-dev:**
- [ ] Prompt GPT-4 optimizado para extraer action items
- [ ] Server Action: marcar action item completado
- [ ] Server Action: vincular action item a usuario

**frontend-dev:**
- [ ] Tab Action Items con checkboxes
- [ ] Selector para vincular a usuario del sistema
- [ ] Pagina /mis-pendientes (todos los roles)
- [ ] Badge en sidebar para pendientes

**database-architect:**
- [ ] RLS policies para action items (todos pueden ver)

### Fase 3: Polish (1 semana)

- [ ] Busqueda full-text en transcripciones
- [ ] Filtros: proyecto, fecha, creador
- [ ] Reproducir audio/video desde el detalle (mientras exista)
- [ ] Indicador "Audio disponible hasta [fecha]"
- [ ] Exportar resumen a PDF
- [ ] Manejo de errores robusto

### Fase 4: Futuro (backlog)

- [ ] Speaker diarization (identificar quien hablo)
- [ ] Chat con transcripcion (RAG)
- [ ] Analytics: duracion promedio, keywords frecuentes
- [ ] Integracion con calendario (auto-importar reuniones)

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Whisper falla con audio malo | Media | Medio | Validar calidad de audio, mostrar warning |
| Archivo muy grande (>25MB) | Alta | Bajo | Implementar chunking automatico |
| GPT-4 no extrae bien action items | Media | Medio | Iterar prompts, permitir edicion manual |
| Costos se disparan | Baja | Alto | Monitorear uso, implementar limites |

---

## Metricas de Exito

1. **Adopcion:** >50% de reuniones importantes se suben al sistema
2. **Precision:** >90% de action items correctamente identificados
3. **Completitud:** >70% de action items marcados como completados
4. **Tiempo:** Procesamiento <5 minutos para reunion de 1 hora

---

## Apendice: Comparativa con Competencia

### Funcionalidades

| Feature | Otter | Fireflies | Read.ai | Command Center |
|---------|-------|-----------|---------|----------------|
| Transcripcion | Si | Si | Si | Si |
| Resumen auto | Si | Si | Si | Si |
| Action items | Si | Si | Si | Si |
| Integracion CRM | Salesforce | 40+ apps | Limitado | Nativo (leads) |
| Precio/usuario | $17-30 | $10-39 | $20 | $0 (por uso) |
| Espanol | Si | Si | Si | Optimizado Peru |
| On-premise | No | No | No | Si (Supabase) |

### Ventajas Command Center

1. **Sin costo por usuario** - Pago solo por uso de APIs
2. **Integracion nativa** - Vincula reuniones a leads y proyectos
3. **Control de datos** - Todo en tu Supabase, sin terceros
4. **Personalizable** - Prompts ajustados a jerga peruana/inmobiliaria
5. **Action items reales** - Se vinculan a usuarios del sistema
