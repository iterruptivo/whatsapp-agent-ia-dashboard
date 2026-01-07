# Arquitectura: Módulo de Reuniones/Transcripciones

**Fecha:** 6 Enero 2026
**Versión:** 1.0
**Estado:** Diseño Completo - Listo para Implementación
**Documento Base:** `docs/plan-modulo-reuniones.md`

---

## Resumen Ejecutivo

Módulo para subir, transcribir y analizar reuniones usando OpenAI Whisper y GPT-4. Permite a admin, gerencia y jefes de ventas extraer automáticamente resúmenes, action items y transcripciones completas de audios/videos de reuniones.

**Características clave:**
- Upload de archivos hasta 2GB con barra de progreso
- Procesamiento background con notificaciones
- Transcripción automática (Whisper)
- Resumen inteligente con action items (GPT-4)
- Retención de archivos multimedia 30 días (auto-limpieza)
- Sistema de tareas para todos los roles

---

## Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO COMPLETO                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Usuario selecciona archivo                                     │
│         │                                                        │
│         ▼                                                        │
│  [FASE 1: UPLOAD - BLOQUEANTE]                                  │
│         │                                                        │
│         │  1. Validar archivo (tipo, tamaño)                    │
│         │  2. Upload a Supabase Storage                         │
│         │  3. Crear registro en DB (estado: 'procesando')       │
│         │  4. Barra de progreso visible                         │
│         │                                                        │
│         ▼                                                        │
│  Upload completado (usuario puede navegar)                      │
│         │                                                        │
│         ▼                                                        │
│  [FASE 2: PROCESAMIENTO - BACKGROUND]                           │
│         │                                                        │
│         │  5. API Route descarga archivo de Storage             │
│         │  6. Envía a Whisper API (chunked si >25MB)            │
│         │  7. Whisper retorna transcripción completa            │
│         │  8. GPT-4 genera resumen estructurado                 │
│         │  9. GPT-4 extrae action items                         │
│         │ 10. Guardar en DB (estado: 'completado')             │
│         │ 11. Notificar usuario (toast/badge)                   │
│         │                                                        │
│         ▼                                                        │
│  Usuario ve resumen, transcripción y action items               │
│                                                                  │
│  [CRON JOB DIARIO]                                              │
│         │                                                        │
│         │ - Buscar archivos >30 días                            │
│         │ - Eliminar de Storage                                 │
│         │ - Actualizar DB (media_deleted_at)                    │
│         │                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estructura de Archivos Detallada

### 1. Base de Datos (Supabase)

**Ejecutar primero:** Migration SQL

```
migrations/
└── 20260106_create_reuniones_tables.sql
```

### 2. API Routes

```
app/api/reuniones/
├── upload/
│   └── route.ts                    # POST - Upload archivo a Supabase Storage
├── [id]/
│   ├── process/
│   │   └── route.ts                # POST - Procesar transcripción (background)
│   └── route.ts                    # GET - Obtener detalle de reunión
├── route.ts                        # GET - Lista de reuniones (con filtros)
└── cron-cleanup/
    └── route.ts                    # GET - Cron job para limpiar archivos >30d
```

### 3. Server Actions

```
lib/
├── actions-reuniones.ts            # CRUD reuniones y filtros
├── actions-reuniones-process.ts    # Lógica de procesamiento (Whisper + GPT-4)
└── actions-action-items.ts         # CRUD action items
```

### 4. Types

```
types/
└── reuniones.ts                    # Tipos TypeScript
```

### 5. Pages (App Router)

```
app/(routes)/reuniones/
├── page.tsx                        # Lista de reuniones
├── [id]/
│   └── page.tsx                    # Detalle de reunión
└── layout.tsx                      # Layout específico (opcional)

app/(routes)/mis-pendientes/
└── page.tsx                        # Action items del usuario
```

### 6. Components

```
components/reuniones/
├── ReunionesTable.tsx              # Tabla con lista de reuniones
├── NuevaReunionModal.tsx           # Modal para subir nueva reunión
├── UploadProgress.tsx              # Barra de progreso de upload
├── ReunionEstadoBadge.tsx          # Badge de estado (procesando/completado/error)
├── ReunionDetalleHeader.tsx        # Header del detalle
├── ReunionResumenTab.tsx           # Tab de resumen
├── ReunionActionItemsTab.tsx       # Tab de action items
├── ReunionTranscripcionTab.tsx     # Tab de transcripción completa
├── ActionItemCard.tsx              # Card individual de action item
└── ActionItemCheckbox.tsx          # Checkbox para marcar completado

components/mis-pendientes/
├── MisPendientesTable.tsx          # Lista de action items del usuario
└── PendienteCard.tsx               # Card de pendiente
```

### 7. Hooks Personalizados

```
hooks/
├── useReuniones.ts                 # Hook para manejar reuniones
├── useReunionUpload.ts             # Hook para upload con progreso
├── useActionItems.ts               # Hook para action items
└── useReunionNotifications.ts      # Hook para notificaciones
```

### 8. Utilities

```
lib/utils/
├── whisper-chunker.ts              # Chunking de archivos >25MB para Whisper
├── reunion-file-validator.ts       # Validación de archivos
└── prompts-reuniones.ts            # Prompts de GPT-4
```

---

## Decisiones Técnicas

| Decision | Opción Elegida | Razón | Alternativa Descartada |
|----------|----------------|-------|------------------------|
| **Upload de archivos** | API Route + Supabase Storage | Manejo de archivos grandes, progreso trackeable | Server Action (no soporta streaming de progreso) |
| **Procesamiento** | API Route background | Timeout de 60s en Vercel suficiente para iniciar proceso async | Queue system (sobreingeniería para MVP) |
| **Transcripción** | OpenAI Whisper API | Mejor costo/precisión en español ($0.36/hora) | AssemblyAI ($0.15 pero extras costosos) |
| **Resumen IA** | GPT-4 Turbo | Mejor calidad de resumen y extracción | GPT-3.5 (menos preciso en action items) |
| **Storage** | Supabase Storage | Ya integrado, RLS nativo, simplicidad | Cloudflare R2 (requiere nueva integración) |
| **Notificaciones** | Toast + Badge en sidebar | UX simple, sin dependencias | Pusher/Socket.io (overkill para MVP) |
| **Chunking >25MB** | Dividir audio en segmentos de 20MB | Límite de Whisper API es 25MB | Usar AssemblyAI (más caro) |
| **Cleanup archivos** | Vercel Cron diario | Integrado con plataforma | pg_cron (requiere permisos DB extras) |
| **Action Items View** | Página separada `/mis-pendientes` | Accesible para todos los roles | Solo en detalle de reunión |
| **RBAC Reuniones** | Solo admin/gerencia/jefe_ventas | Información sensible estratégica | Abierto a todos |
| **RBAC Action Items** | Todos los roles pueden ver | Tareas asignadas a cualquier persona | Solo roles superiores |

---

## Flujo de Datos Paso a Paso

### Fase 1: Upload (BLOQUEANTE)

```
1. Usuario abre NuevaReunionModal
   ├─ Llena formulario (título, proyecto, fecha, archivo)
   └─ Click en "Procesar Reunión"

2. Frontend valida archivo
   ├─ Tipo: mp3, mp4, wav, m4a, webm, mpeg
   ├─ Tamaño: max 2GB
   └─ Si falla → Mostrar error

3. Frontend llama POST /api/reuniones/upload
   ├─ Body: FormData con archivo + metadata
   └─ Muestra UploadProgress component

4. API Route /api/reuniones/upload
   ├─ Valida sesión (middleware)
   ├─ Valida rol (admin/gerencia/jefe_ventas)
   ├─ Valida archivo nuevamente
   ├─ Genera path único: `reuniones/{proyecto_id}/{timestamp}_{filename}`
   ├─ Upload a Supabase Storage bucket 'reuniones-media'
   │  └─ Usa método de streaming para archivos grandes
   ├─ Crea registro en tabla `reuniones`:
   │  └─ estado: 'subiendo' → 'procesando'
   │  └─ media_storage_path, titulo, proyecto_id, created_by, etc.
   └─ Retorna: { success: true, reunionId: uuid }

5. Frontend muestra éxito
   ├─ Toast: "Archivo subido correctamente"
   ├─ Modal cambia a mensaje: "Procesando en segundo plano..."
   └─ Usuario puede cerrar modal y navegar
```

### Fase 2: Procesamiento (BACKGROUND)

```
6. Frontend automáticamente llama POST /api/reuniones/[id]/process
   ├─ Llamada async (no bloquea UI)
   └─ Usuario puede navegar libremente

7. API Route /api/reuniones/[id]/process
   ├─ Cambia estado DB a 'procesando'
   ├─ Descarga archivo de Supabase Storage
   ├─ Detecta tamaño del archivo
   │
   ├─ SI archivo <=25MB:
   │  └─ Envía directamente a Whisper API
   │
   └─ SI archivo >25MB:
      └─ Usa whisper-chunker.ts para dividir en segmentos
         ├─ Cada segmento max 20MB
         ├─ Envía cada segmento a Whisper
         ├─ Concatena transcripciones
         └─ Retorna transcripción completa

8. Whisper API retorna transcripción
   ├─ Texto plano con timestamps (opcional)
   └─ Detecta idioma automáticamente

9. GPT-4 Turbo - Resumen
   ├─ Prompt: prompts-reuniones.ts → generateSummary()
   ├─ Input: transcripción completa
   └─ Output JSON:
      {
        "resumen": "...",
        "puntos_clave": ["...", "..."],
        "decisiones": ["..."],
        "preguntas_abiertas": ["..."],
        "participantes": ["..."]
      }

10. GPT-4 Turbo - Action Items
    ├─ Prompt: prompts-reuniones.ts → extractActionItems()
    ├─ Input: transcripción completa
    └─ Output JSON:
       {
         "action_items": [
           {
             "descripcion": "...",
             "asignado_nombre": "...",
             "deadline": "2026-01-10",
             "prioridad": "alta",
             "contexto_quote": "..."
           }
         ]
       }

11. Guardar en Base de Datos
    ├─ UPDATE reuniones:
    │  ├─ transcripcion_completa
    │  ├─ resumen
    │  ├─ puntos_clave (JSONB)
    │  ├─ decisiones (JSONB)
    │  ├─ preguntas_abiertas (JSONB)
    │  ├─ participantes (TEXT[])
    │  ├─ estado: 'completado'
    │  ├─ processed_at: NOW()
    │  └─ duracion_segundos (extraído de metadata)
    │
    └─ INSERT reunion_action_items (bulk):
       └─ Un registro por cada action item

12. Notificar Usuario
    ├─ SI usuario está en el dashboard:
    │  └─ useReunionNotifications hook detecta cambio
    │      └─ Muestra toast: "Reunión '[titulo]' procesada"
    │
    └─ SIEMPRE:
       └─ Badge en sidebar "Reuniones (1 nueva)"
```

### Fase 3: Visualización

```
13. Usuario navega a /reuniones/[id]
    ├─ Carga detalle desde actions-reuniones.ts
    ├─ Muestra tabs: Resumen | Action Items | Transcripción
    └─ Si estado === 'procesando':
       └─ Muestra spinner con mensaje "Procesando..."

14. Usuario interactúa con Action Items
    ├─ Marcar como completado → Server Action
    ├─ Vincular a usuario del sistema → Server Action
    └─ Cambios se reflejan en tiempo real
```

### Fase 4: Cleanup (CRON)

```
15. Vercel Cron ejecuta GET /api/reuniones/cron-cleanup (diario 3AM)
    ├─ Busca reuniones con:
    │  ├─ media_storage_path IS NOT NULL
    │  └─ created_at < NOW() - 30 days
    │
    ├─ Para cada reunión:
    │  ├─ DELETE FROM storage.objects WHERE path = media_storage_path
    │  └─ UPDATE reuniones SET:
    │      ├─ media_storage_path = NULL
    │      └─ media_deleted_at = NOW()
    │
    └─ Retorna: { cleaned: N, errors: [...] }
```

---

## Integraciones Externas

### 1. OpenAI Whisper API

**Endpoint:** `https://api.openai.com/v1/audio/transcriptions`

**Configuración:**
```typescript
// lib/actions-reuniones-process.ts

import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function transcribeAudio(filePath: string): Promise<string> {
  // Si archivo >25MB, usar whisper-chunker primero
  const fileSize = fs.statSync(filePath).size;
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB

  if (fileSize > MAX_SIZE) {
    return await transcribeChunked(filePath);
  }

  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    language: 'es', // Optimizar para español
    response_format: 'text',
    temperature: 0 // Mayor precisión, menos creatividad
  });

  return transcription;
}
```

**Manejo de archivos >25MB:**
```typescript
// lib/utils/whisper-chunker.ts

import ffmpeg from 'fluent-ffmpeg';

async function transcribeChunked(filePath: string): Promise<string> {
  const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB por seguridad
  const chunks = await splitAudioFile(filePath, CHUNK_SIZE);

  const transcriptions: string[] = [];

  for (const chunk of chunks) {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(chunk.path),
      model: 'whisper-1',
      language: 'es'
    });
    transcriptions.push(transcription);

    // Limpiar chunk temporal
    fs.unlinkSync(chunk.path);
  }

  return transcriptions.join(' ');
}

// Usa ffmpeg para dividir audio sin re-encodear
async function splitAudioFile(filePath: string, maxSize: number) {
  // Implementación con ffmpeg
  // Retorna array de paths a chunks
}
```

**Dependencia requerida:**
```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "fluent-ffmpeg": "^2.1.2"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24"
  }
}
```

### 2. OpenAI GPT-4 Turbo

**Prompts exactos:**

```typescript
// lib/utils/prompts-reuniones.ts

export function generateSummaryPrompt(transcripcion: string): string {
  return `Eres un asistente experto en resumir reuniones de trabajo.

Dada la siguiente transcripción de una reunión, genera:

1. RESUMEN: 2-3 oraciones que capturen la esencia de la reunión
2. PUNTOS_CLAVE: Lista de 3-5 puntos importantes discutidos
3. DECISIONES: Lista de decisiones tomadas (si las hay)
4. PREGUNTAS_ABIERTAS: Preguntas que quedaron sin responder (si las hay)
5. PARTICIPANTES: Nombres de personas mencionadas en la reunión

Responde SOLO en formato JSON válido:
{
  "resumen": "...",
  "puntos_clave": ["...", "..."],
  "decisiones": ["...", "..."],
  "preguntas_abiertas": ["...", "..."],
  "participantes": ["...", "..."]
}

TRANSCRIPCIÓN:
${transcripcion}`;
}

export function extractActionItemsPrompt(transcripcion: string): string {
  return `Eres un asistente experto en identificar tareas y compromisos en reuniones.

Dada la siguiente transcripción, identifica TODOS los action items (tareas, compromisos, pendientes).

Para cada action item extrae:
- descripcion: Qué se debe hacer (máximo 200 caracteres)
- asignado_nombre: A quién se asignó (nombre mencionado, o "No especificado")
- deadline: Fecha límite si se mencionó (formato YYYY-MM-DD, o null)
- prioridad: "alta" si es urgente, "media" si es normal, "baja" si no es urgente
- contexto_quote: Cita textual de donde se mencionó (máximo 300 caracteres)

Responde SOLO en formato JSON válido:
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
- "voy a", "me encargo", "yo hago", "yo me ocupo"
- "tienes que", "necesitas", "deberías", "hay que"
- "para el [fecha]", "antes del [fecha]", "hasta el [fecha]"
- "pendiente", "tarea", "compromiso", "acción"
- "queda en", "se compromete a"

Si NO hay action items, retorna array vacío: {"action_items": []}

TRANSCRIPCIÓN:
${transcripcion}`;
}
```

**Uso en código:**
```typescript
// lib/actions-reuniones-process.ts

async function generateSummary(transcripcion: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'Eres un asistente que solo responde en JSON válido.'
      },
      {
        role: 'user',
        content: generateSummaryPrompt(transcripcion)
      }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(completion.choices[0].message.content);
  return result;
}
```

### 3. Supabase Storage

**Configuración del Bucket:**

```sql
-- migrations/20260106_create_reuniones_storage.sql

-- Crear bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reuniones-media',
  'reuniones-media',
  false, -- Privado
  2147483648, -- 2GB en bytes
  ARRAY[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
);

-- Policy: Solo usuarios autenticados pueden subir
CREATE POLICY "Usuarios autenticados pueden subir"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reuniones-media'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

-- Policy: Solo roles permitidos pueden leer
CREATE POLICY "Roles permitidos pueden leer"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reuniones-media'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

-- Policy: Solo creador puede eliminar (dentro de 24 horas)
CREATE POLICY "Creador puede eliminar en 24h"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reuniones-media'
  AND (
    -- Usuario que subió el archivo
    owner = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours'
  )
  OR (
    -- Admin siempre puede eliminar
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  )
);
```

**Upload desde API Route:**
```typescript
// app/api/reuniones/upload/route.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role para bypass RLS
);

async function uploadToStorage(
  file: File,
  proyectoId: string,
  fileName: string
) {
  const timestamp = Date.now();
  const path = `reuniones/${proyectoId}/${timestamp}_${fileName}`;

  const { data, error } = await supabase.storage
    .from('reuniones-media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  return { path: data.path, fullPath: data.fullPath };
}
```

### 4. Vercel Cron

**Configuración en vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/reuniones/cron-cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**API Route protegida:**
```typescript
// app/api/reuniones/cron-cleanup/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verificar que la request viene de Vercel Cron
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ejecutar limpieza
  const result = await cleanupOldMediaFiles();

  return NextResponse.json(result);
}
```

**Variable de entorno necesaria:**
```bash
# .env.local
CRON_SECRET=your-random-secret-here
```

---

## Modelo de Datos (SQL Completo)

```sql
-- ============================================================================
-- MIGRATION: Módulo de Reuniones
-- ============================================================================
-- Fecha: 6 Enero 2026
-- Descripción: Tablas para transcripciones y action items
-- ============================================================================

-- TABLA: reuniones
CREATE TABLE reuniones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Metadata
  titulo VARCHAR(255) NOT NULL,
  fecha_reunion TIMESTAMPTZ,
  duracion_segundos INTEGER,
  participantes TEXT[], -- Array de nombres mencionados

  -- Archivo multimedia (retenido 30 días)
  media_storage_path TEXT,
  media_tipo VARCHAR(20), -- 'audio' o 'video'
  media_size_bytes BIGINT,
  media_deleted_at TIMESTAMPTZ, -- Cuando se eliminó (después de 30 días)

  -- Contenido procesado
  transcripcion_completa TEXT,
  resumen TEXT,
  puntos_clave JSONB, -- ["punto 1", "punto 2"]
  decisiones JSONB, -- ["decision 1", "decision 2"]
  preguntas_abiertas JSONB, -- ["pregunta 1"]

  -- Estado de procesamiento
  estado VARCHAR(20) DEFAULT 'procesando' CHECK (estado IN ('procesando', 'completado', 'error')),
  error_mensaje TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- TABLA: reunion_action_items
CREATE TABLE reunion_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id UUID REFERENCES reuniones(id) ON DELETE CASCADE NOT NULL,

  -- Contenido
  descripcion TEXT NOT NULL,
  asignado_nombre VARCHAR(255), -- Nombre inferido de la transcripción
  asignado_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- Vínculo opcional a usuario real
  deadline DATE,
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  contexto_quote TEXT, -- Cita textual de donde salió

  -- Estado
  completado BOOLEAN DEFAULT FALSE,
  completado_at TIMESTAMPTZ,
  completado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES para performance
CREATE INDEX idx_reuniones_proyecto ON reuniones(proyecto_id);
CREATE INDEX idx_reuniones_created_by ON reuniones(created_by);
CREATE INDEX idx_reuniones_estado ON reuniones(estado);
CREATE INDEX idx_reuniones_fecha ON reuniones(fecha_reunion DESC NULLS LAST);
CREATE INDEX idx_reuniones_created_at ON reuniones(created_at DESC);

CREATE INDEX idx_action_items_reunion ON reunion_action_items(reunion_id);
CREATE INDEX idx_action_items_asignado ON reunion_action_items(asignado_usuario_id);
CREATE INDEX idx_action_items_completado ON reunion_action_items(completado) WHERE completado = FALSE;
CREATE INDEX idx_action_items_deadline ON reunion_action_items(deadline) WHERE deadline IS NOT NULL;

-- FUNCIÓN: Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reuniones_updated_at
  BEFORE UPDATE ON reuniones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS POLICIES
ALTER TABLE reuniones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_action_items ENABLE ROW LEVEL SECURITY;

-- Reuniones: Solo roles permitidos pueden ver/crear
CREATE POLICY "Reuniones - Select"
ON reuniones FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol IN ('admin', 'gerencia', 'jefe_ventas')
    AND (
      -- Admin y gerencia ven todas
      u.rol IN ('admin', 'gerencia')
      -- Jefe ventas solo de sus proyectos
      OR reuniones.proyecto_id = ANY(u.proyectos_asignados)
    )
  )
);

CREATE POLICY "Reuniones - Insert"
ON reuniones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

CREATE POLICY "Reuniones - Update"
ON reuniones FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia')
  )
  OR created_by = auth.uid()
);

-- Action Items: TODOS pueden ver
CREATE POLICY "Action Items - Select"
ON reunion_action_items FOR SELECT
TO authenticated
USING (true);

-- Action Items: Solo asignado o admin puede actualizar
CREATE POLICY "Action Items - Update"
ON reunion_action_items FOR UPDATE
TO authenticated
USING (
  asignado_usuario_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia')
  )
);

-- FUNCIÓN: Cleanup archivos antiguos
CREATE OR REPLACE FUNCTION cleanup_old_media_files()
RETURNS TABLE(cleaned_count INTEGER, error_count INTEGER) AS $$
DECLARE
  file_record RECORD;
  cleaned INTEGER := 0;
  errors INTEGER := 0;
BEGIN
  -- Buscar reuniones con archivo y >30 días
  FOR file_record IN
    SELECT id, media_storage_path
    FROM reuniones
    WHERE media_storage_path IS NOT NULL
    AND media_deleted_at IS NULL
    AND created_at < NOW() - INTERVAL '30 days'
  LOOP
    BEGIN
      -- Nota: La eliminación del storage se hace desde la API Route
      -- Aquí solo marcamos como eliminado
      UPDATE reuniones
      SET media_storage_path = NULL,
          media_deleted_at = NOW()
      WHERE id = file_record.id;

      cleaned := cleaned + 1;
    EXCEPTION
      WHEN OTHERS THEN
        errors := errors + 1;
        RAISE WARNING 'Error cleaning file for reunion %: %', file_record.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT cleaned, errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Consideraciones de Escalabilidad

### 1. Timeouts de Vercel

| Plan | Timeout Máximo | Estrategia |
|------|----------------|------------|
| Hobby | 10 segundos | NO usar. Migrar a Pro inmediatamente |
| Pro | 60 segundos | OK para iniciar proceso y retornar. Proceso continúa en background |
| Enterprise | 900 segundos | No necesario para este proyecto |

**Solución implementada:**
- API Route `/upload` retorna en <10s (solo upload a Storage + crear registro)
- API Route `/process` inicia procesamiento y retorna inmediatamente
- Procesamiento real ocurre en la misma request pero de forma asíncrona
- Si el procesamiento toma >60s, guardamos estado intermedio y reintentamos

### 2. Archivos muy grandes (>1GB)

**Problema:** Upload de 2GB puede tomar varios minutos y timeout.

**Solución:**
```typescript
// Usar multipart upload de Supabase Storage
async function uploadLargeFile(file: File, path: string) {
  const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks

  if (file.size < CHUNK_SIZE) {
    // Upload directo
    return await supabase.storage.from('reuniones-media').upload(path, file);
  }

  // Multipart upload
  const chunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await supabase.storage
      .from('reuniones-media')
      .upload(path, chunk, {
        upsert: i > 0 // Sobrescribir partes anteriores
      });
  }
}
```

### 3. Reuniones muy largas (>2 horas)

**Problema:**
- Audio de 2 horas = ~120MB
- Whisper API toma ~6 minutos en procesar
- GPT-4 con transcripción de 50,000 palabras = tokens costosos

**Solución:**
```typescript
// Dividir transcripción en segmentos para GPT-4
async function processLongTranscription(transcripcion: string) {
  const MAX_CHARS = 30000; // ~7500 tokens

  if (transcripcion.length < MAX_CHARS) {
    return await generateSummary(transcripcion);
  }

  // Dividir en segmentos de 30k caracteres
  const segments = chunkText(transcripcion, MAX_CHARS);

  // Procesar cada segmento
  const summaries = await Promise.all(
    segments.map(seg => generateSummary(seg))
  );

  // Combinar resúmenes
  const combinedSummary = await generateSummary(
    summaries.map(s => s.resumen).join('\n\n')
  );

  return combinedSummary;
}
```

### 4. Volumen de Reuniones

**Estimación:** 50 reuniones/mes x 12 meses = 600 reuniones/año

**Tabla `reuniones`:**
- 600 filas/año
- Cada fila ~50KB (transcripción promedio)
- Total: 30MB/año en DB → Despreciable

**Tabla `reunion_action_items`:**
- 5 action items promedio por reunión
- 3000 filas/año
- Total: ~3MB/año → Despreciable

**Storage:**
- 50 reuniones/mes activas (últimos 30 días)
- Promedio 500MB por archivo
- Total: 25GB storage → $0.50/mes en Supabase

**Conclusión:** Escalabilidad NO es problema. DB y Storage manejan fácilmente.

### 5. Queue System (Futuro)

**Si volumen crece a >200 reuniones/mes:**

Considerar implementar queue con BullMQ + Redis:
```typescript
// lib/queues/reunion-processor.ts

import { Queue, Worker } from 'bullmq';

const reunionQueue = new Queue('reunion-processing', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// Agregar job
await reunionQueue.add('process', {
  reunionId: 'uuid'
});

// Worker
const worker = new Worker('reunion-processing', async (job) => {
  await processReunion(job.data.reunionId);
});
```

**NO implementar en MVP** - Agregar complejidad innecesaria.

---

## Manejo de Errores

### 1. Errores de Upload

| Error | Causa | Solución |
|-------|-------|----------|
| `File too large` | Archivo >2GB | Validar en frontend antes de upload |
| `Invalid file type` | Tipo no soportado | Validar extensión y MIME type |
| `Storage quota exceeded` | Límite de Storage | Mostrar error, contactar admin |
| `Network timeout` | Conexión lenta | Retry automático con exponential backoff |

```typescript
// app/api/reuniones/upload/route.ts

try {
  await uploadToStorage(file, path);
} catch (error) {
  if (error.message.includes('quota')) {
    return NextResponse.json({
      success: false,
      error: 'Límite de almacenamiento alcanzado. Contacte al administrador.'
    }, { status: 507 });
  }

  if (error.message.includes('timeout')) {
    // Retry una vez
    await uploadToStorage(file, path);
  }

  throw error;
}
```

### 2. Errores de Whisper API

| Error | Causa | Solución |
|-------|-------|----------|
| `Rate limit exceeded` | Muchas requests simultáneas | Implementar retry con delay |
| `Audio quality too low` | Audio inaudible | Guardar estado 'error', permitir re-upload |
| `Unsupported format` | Formato corrupto | Validar con ffprobe antes de enviar |
| `File too large` | >25MB sin chunking | Usar whisper-chunker automáticamente |

```typescript
// lib/actions-reuniones-process.ts

async function transcribeWithRetry(filePath: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await transcribeAudio(filePath);
    } catch (error) {
      if (error.code === 'rate_limit_exceeded') {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await sleep(delay);
        continue;
      }

      if (i === retries - 1) {
        // Último intento falló
        await updateReunionError(
          reunionId,
          `Error de transcripción: ${error.message}`
        );
        throw error;
      }
    }
  }
}
```

### 3. Errores de GPT-4

| Error | Causa | Solución |
|-------|-------|----------|
| `Invalid JSON response` | GPT no retornó JSON válido | Usar `response_format: json_object` |
| `Context length exceeded` | Transcripción muy larga | Dividir en segmentos |
| `Rate limit` | Muchas requests | Implementar queue |

```typescript
// lib/actions-reuniones-process.ts

async function generateSummaryWithFallback(transcripcion: string) {
  try {
    const result = await generateSummary(transcripcion);

    // Validar que el JSON tenga las keys esperadas
    if (!result.resumen || !result.puntos_clave) {
      throw new Error('Respuesta GPT-4 inválida');
    }

    return result;
  } catch (error) {
    // Fallback: Guardar transcripción pero sin resumen
    return {
      resumen: 'Error al generar resumen. Revise la transcripción completa.',
      puntos_clave: [],
      decisiones: [],
      preguntas_abiertas: [],
      participantes: []
    };
  }
}
```

---

## Sistema de Notificaciones

### 1. Hook de Notificaciones

```typescript
// hooks/useReunionNotifications.ts

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useReunionNotifications(userId: string) {
  const [newReuniones, setNewReuniones] = useState(0);

  useEffect(() => {
    // Suscribirse a cambios en tabla reuniones
    const channel = supabase
      .channel('reuniones-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reuniones',
          filter: `created_by=eq.${userId}`
        },
        (payload) => {
          const oldRow = payload.old as any;
          const newRow = payload.new as any;

          // Si cambió de 'procesando' a 'completado'
          if (oldRow.estado === 'procesando' && newRow.estado === 'completado') {
            toast.success(`Reunión "${newRow.titulo}" procesada correctamente`, {
              action: {
                label: 'Ver',
                onClick: () => window.location.href = `/reuniones/${newRow.id}`
              }
            });

            setNewReuniones(prev => prev + 1);
          }

          // Si cambió a 'error'
          if (newRow.estado === 'error') {
            toast.error(`Error al procesar "${newRow.titulo}"`, {
              description: newRow.error_mensaje
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { newReuniones };
}
```

### 2. Badge en Sidebar

```typescript
// components/layout/Sidebar.tsx

import { useReunionNotifications } from '@/hooks/useReunionNotifications';

export function Sidebar({ user }: { user: User }) {
  const { newReuniones } = useReunionNotifications(user.id);

  return (
    <nav>
      {/* ... otros items ... */}

      <Link href="/reuniones">
        <VideoIcon />
        Reuniones
        {newReuniones > 0 && (
          <span className="ml-auto bg-green-500 text-white text-xs rounded-full px-2 py-1">
            {newReuniones}
          </span>
        )}
      </Link>
    </nav>
  );
}
```

---

## Testing Strategy

### 1. Unit Tests

```typescript
// __tests__/whisper-chunker.test.ts

import { splitAudioFile } from '@/lib/utils/whisper-chunker';

describe('whisper-chunker', () => {
  it('should split file >25MB into chunks', async () => {
    const chunks = await splitAudioFile('test-file-30mb.mp3', 25 * 1024 * 1024);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should not split file <25MB', async () => {
    const chunks = await splitAudioFile('test-file-10mb.mp3', 25 * 1024 * 1024);
    expect(chunks.length).toBe(1);
  });
});
```

### 2. Integration Tests

```typescript
// __tests__/api/reuniones/upload.test.ts

import { POST } from '@/app/api/reuniones/upload/route';

describe('POST /api/reuniones/upload', () => {
  it('should upload file and create DB record', async () => {
    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('titulo', 'Test Reunion');
    formData.append('proyecto_id', 'uuid');

    const response = await POST(formData);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.reunionId).toBeDefined();
  });

  it('should reject file >2GB', async () => {
    const largeFile = new File([new ArrayBuffer(3 * 1024 * 1024 * 1024)], 'large.mp4');
    const formData = new FormData();
    formData.append('file', largeFile);

    const response = await POST(formData);
    expect(response.status).toBe(400);
  });
});
```

### 3. E2E Tests (Playwright)

```typescript
// __tests__/e2e/reuniones.spec.ts

import { test, expect } from '@playwright/test';

test('Upload y procesar reunión completo', async ({ page }) => {
  await page.goto('/reuniones');

  // Abrir modal
  await page.click('button:has-text("Nueva Reunión")');

  // Llenar formulario
  await page.fill('input[name="titulo"]', 'Test E2E Reunión');
  await page.selectOption('select[name="proyecto_id"]', 'Chincha');

  // Upload archivo
  await page.setInputFiles('input[type="file"]', 'docs/test-assets/audio-test.mp3');

  // Procesar
  await page.click('button:has-text("Procesar Reunión")');

  // Verificar upload
  await expect(page.locator('text=Archivo subido correctamente')).toBeVisible();

  // Esperar procesamiento (máx 2 min)
  await expect(page.locator('text=procesada correctamente')).toBeVisible({ timeout: 120000 });

  // Navegar a detalle
  await page.click('text=Test E2E Reunión');

  // Verificar tabs
  await expect(page.locator('text=Resumen')).toBeVisible();
  await expect(page.locator('text=Action Items')).toBeVisible();
  await expect(page.locator('text=Transcripción')).toBeVisible();
});
```

---

## Dependencias NPM

```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "fluent-ffmpeg": "^2.1.2",
    "@supabase/supabase-js": "^2.38.0",
    "sonner": "^1.3.1"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24",
    "playwright": "^1.40.0"
  }
}
```

**Nota sobre ffmpeg:**
- Requiere binario `ffmpeg` instalado en el servidor
- En Vercel: Incluir en `package.json` como dependency o usar layer

```json
{
  "dependencies": {
    "@ffmpeg-installer/ffmpeg": "^1.1.0"
  }
}
```

```typescript
// lib/utils/whisper-chunker.ts
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
```

---

## Variables de Entorno

```bash
# .env.local

# OpenAI
OPENAI_API_KEY=sk-...

# Supabase (ya existentes)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh... # Para bypass RLS en cron

# Vercel Cron
CRON_SECRET=tu-secreto-aleatorio-aqui

# Opcional: Redis (si se implementa queue en futuro)
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

---

## Roadmap de Implementación

### Fase 1: MVP Base (Semana 1-2)

**database-architect:**
- [ ] Crear migration `20260106_create_reuniones_tables.sql`
- [ ] Crear bucket `reuniones-media` en Supabase Dashboard
- [ ] Configurar RLS policies
- [ ] Testing de policies con credenciales de test

**backend-dev:**
- [ ] `POST /api/reuniones/upload` - Upload con validación
- [ ] `POST /api/reuniones/[id]/process` - Procesamiento background
- [ ] `GET /api/reuniones` - Lista con filtros
- [ ] `GET /api/reuniones/[id]` - Detalle
- [ ] `lib/actions-reuniones.ts` - CRUD básico
- [ ] `lib/actions-reuniones-process.ts` - Whisper + GPT-4
- [ ] `lib/utils/whisper-chunker.ts` - Chunking >25MB
- [ ] `lib/utils/prompts-reuniones.ts` - Prompts GPT-4

**frontend-dev:**
- [ ] `app/(routes)/reuniones/page.tsx` - Lista de reuniones
- [ ] `app/(routes)/reuniones/[id]/page.tsx` - Detalle
- [ ] `components/reuniones/NuevaReunionModal.tsx` - Modal upload
- [ ] `components/reuniones/UploadProgress.tsx` - Barra de progreso
- [ ] `components/reuniones/ReunionesTable.tsx` - Tabla
- [ ] `components/reuniones/ReunionDetalleHeader.tsx` - Header
- [ ] `components/reuniones/ReunionResumenTab.tsx` - Tab resumen
- [ ] `components/reuniones/ReunionTranscripcionTab.tsx` - Tab transcripción
- [ ] `hooks/useReunionUpload.ts` - Upload hook

**Entregables:**
- Usuario puede subir reunión
- Ver lista de reuniones
- Ver detalle con resumen y transcripción

### Fase 2: Action Items (Semana 3)

**backend-dev:**
- [ ] `lib/actions-action-items.ts` - CRUD action items
- [ ] Server Action: `markActionItemCompleted()`
- [ ] Server Action: `linkActionItemToUser()`

**frontend-dev:**
- [ ] `components/reuniones/ReunionActionItemsTab.tsx` - Tab action items
- [ ] `components/reuniones/ActionItemCard.tsx` - Card individual
- [ ] `app/(routes)/mis-pendientes/page.tsx` - Vista de pendientes
- [ ] `components/mis-pendientes/MisPendientesTable.tsx` - Tabla
- [ ] Badge en sidebar para notificaciones
- [ ] `hooks/useActionItems.ts` - Hook

**Entregables:**
- Action items extraídos automáticamente
- Usuarios pueden marcar como completado
- Vista "Mis Pendientes" para todos los roles

### Fase 3: Polish (Semana 4)

**backend-dev:**
- [ ] `GET /api/reuniones/cron-cleanup` - Limpieza automática
- [ ] Configurar `vercel.json` con cron
- [ ] Full-text search en transcripciones

**frontend-dev:**
- [ ] Filtros avanzados (proyecto, fecha, creador)
- [ ] Búsqueda en transcripciones
- [ ] Reproductor de audio/video (mientras exista)
- [ ] Indicador "Disponible hasta [fecha]"
- [ ] Export resumen a PDF
- [ ] `hooks/useReunionNotifications.ts` - Notificaciones real-time

**qa-specialist:**
- [ ] E2E tests con Playwright
- [ ] Testing de edge cases (archivos grandes, errores API)
- [ ] Testing de permisos (cada rol)

**Entregables:**
- Sistema completamente pulido
- Limpieza automática funcionando
- Tests completos

### Fase 4: Backlog (Futuro)

- [ ] Speaker diarization (identificar quién habló)
- [ ] Chat con transcripción usando RAG
- [ ] Analytics (duración promedio, keywords)
- [ ] Integración con Google Calendar
- [ ] Queue system con BullMQ (si volumen crece)

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Whisper falla con audio de mala calidad** | Media | Medio | 1. Validar calidad con ffprobe antes de enviar<br>2. Mostrar warning si bitrate <64kbps<br>3. Permitir re-upload |
| **Archivo >25MB sin chunking** | Alta | Bajo | 1. Detectar tamaño automáticamente<br>2. Usar whisper-chunker.ts<br>3. Testing exhaustivo |
| **GPT-4 no extrae action items correctamente** | Media | Medio | 1. Iterar prompts con ejemplos reales<br>2. Permitir edición manual<br>3. Feedback loop de usuarios |
| **Costos se disparan** | Baja | Alto | 1. Monitorear uso mensual en OpenAI dashboard<br>2. Implementar límite: máx 100 reuniones/mes<br>3. Alert si costo >$50/mes |
| **Timeout en Vercel** | Media | Alto | 1. Asegurar que upload retorna en <10s<br>2. Process retorna inmediatamente y continúa<br>3. Migrar a Pro plan (60s timeout) |
| **Storage lleno** | Baja | Medio | 1. Cron cleanup funcionando<br>2. Monitorear uso mensual<br>3. Alert si >80% capacidad |
| **Transcripción incorrecta (idioma mal detectado)** | Baja | Bajo | 1. Forzar `language: 'es'` en Whisper<br>2. Permitir re-procesar |
| **Usuario cierra ventana durante upload** | Alta | Bajo | 1. Mensaje claro: "No cierres esta ventana"<br>2. Considerar upload en background (Fase 4) |

---

## Métricas de Éxito

### KPIs Cuantitativos

| Métrica | Objetivo Mes 1 | Objetivo Mes 3 |
|---------|----------------|----------------|
| **Reuniones procesadas** | 10 | 30 |
| **Tasa de éxito procesamiento** | >90% | >95% |
| **Action items identificados** | 50 | 150 |
| **Action items completados** | 30 (60%) | 105 (70%) |
| **Tiempo promedio de procesamiento** | <10 min | <5 min |
| **Usuarios activos** | 5 | 10 |

### KPIs Cualitativos

- [ ] >80% de usuarios reportan que los resúmenes son precisos
- [ ] >70% de action items identificados son relevantes
- [ ] Ningún archivo perdido por error de cleanup
- [ ] 0 quejas de timeout o errores de upload

---

## Apéndice A: Ejemplo de Flujo Completo

### Request Flow Example

**1. Usuario sube reunión:**
```
POST /api/reuniones/upload
Content-Type: multipart/form-data

{
  titulo: "Reunión Semanal Chincha",
  proyecto_id: "uuid-chincha",
  fecha_reunion: "2026-01-06T10:00:00Z",
  file: [binary data]
}

Response:
{
  success: true,
  reunionId: "uuid-123"
}
```

**2. Frontend llama a procesar:**
```
POST /api/reuniones/uuid-123/process

Response:
{
  success: true,
  message: "Procesamiento iniciado"
}
```

**3. Procesamiento (backend):**
```
1. Download from Storage → /tmp/reunion-uuid-123.mp4
2. Whisper API → transcripcion.txt
3. GPT-4 → summary.json
4. GPT-4 → action_items.json
5. Save to DB
6. Notify user via Supabase Realtime
```

**4. Usuario ve resultado:**
```
GET /api/reuniones/uuid-123

Response:
{
  id: "uuid-123",
  titulo: "Reunión Semanal Chincha",
  estado: "completado",
  resumen: "Se revisó el avance...",
  puntos_clave: ["15 separaciones nuevas", "Meta Q1: 50 ventas"],
  decisiones: ["Implementar nuevo script"],
  action_items: [
    {
      descripcion: "Enviar script a equipo",
      asignado_nombre: "María López",
      deadline: "2026-01-08",
      prioridad: "alta",
      completado: false
    }
  ]
}
```

---

## Apéndice B: Ejemplo de Prompts GPT-4

### Transcripción de Ejemplo

```
Alonso: Buenos días a todos. Gracias por conectarse.
Heyse: Hola Alonso. Listo para arrancar.
Alonso: Perfecto. Entonces, el objetivo de hoy es revisar el avance de ventas en Chincha. María, ¿nos puedes dar un resumen?
María: Claro. Esta semana cerramos 15 separaciones nuevas. Estamos muy contentos con los resultados.
Heyse: Excelente. ¿Cuál es la meta para el siguiente trimestre?
María: Queremos llegar a 50 ventas cerradas en Q1.
Alonso: Me parece bien. María, ¿puedes enviarnos el nuevo script de ventas que mencionaste?
María: Sí, lo envío hoy antes de las 6pm a todo el equipo.
Heyse: Perfecto. También necesitamos contratar 2 vendedores más. Juan, ¿te puedes encargar?
Juan: Claro, coordino con RRHH esta semana.
Alonso: Hay algo más que debamos discutir?
María: Sí, ¿cuándo llega el material de marketing?
Heyse: Buena pregunta. Lo verifico y les confirmo.
Alonso: Ok, entonces quedamos así. Gracias a todos.
```

### Output GPT-4 (Resumen)

```json
{
  "resumen": "Se revisó el avance de ventas del proyecto Chincha. El equipo reportó 15 separaciones nuevas esta semana y definió la meta de 50 ventas cerradas para Q1. Se aprobó el nuevo script de ventas y se decidió contratar 2 vendedores adicionales.",
  "puntos_clave": [
    "15 separaciones nuevas en Chincha esta semana",
    "Meta Q1: 50 ventas cerradas",
    "Nuevo script de ventas aprobado",
    "Se contratarán 2 vendedores adicionales"
  ],
  "decisiones": [
    "Implementar nuevo script de ventas desde hoy",
    "Contratar 2 vendedores adicionales"
  ],
  "preguntas_abiertas": [
    "¿Cuándo llega el material de marketing?"
  ],
  "participantes": [
    "Alonso",
    "Heyse",
    "María",
    "Juan"
  ]
}
```

### Output GPT-4 (Action Items)

```json
{
  "action_items": [
    {
      "descripcion": "Enviar nuevo script de ventas a todo el equipo",
      "asignado_nombre": "María",
      "deadline": "2026-01-06",
      "prioridad": "alta",
      "contexto_quote": "María: Sí, lo envío hoy antes de las 6pm a todo el equipo."
    },
    {
      "descripcion": "Coordinar contratación de 2 vendedores con RRHH",
      "asignado_nombre": "Juan",
      "deadline": "2026-01-10",
      "prioridad": "media",
      "contexto_quote": "Juan: Claro, coordino con RRHH esta semana."
    },
    {
      "descripcion": "Verificar fecha de llegada de material de marketing",
      "asignado_nombre": "Heyse",
      "deadline": null,
      "prioridad": "media",
      "contexto_quote": "Heyse: Buena pregunta. Lo verifico y les confirmo."
    }
  ]
}
```

---

## Conclusión

Esta arquitectura está lista para implementación inmediata. Los desarrolladores tienen:

- Estructura de archivos exacta
- Decisiones técnicas justificadas
- Flujos de datos detallados paso a paso
- SQL completo para DB
- Ejemplos de código para integraciones
- Estrategia de testing
- Plan de implementación por fases

**Siguiente paso:** Asignar tareas a `database-architect`, `backend-dev` y `frontend-dev` para iniciar Fase 1.

---

**Última Actualización:** 6 Enero 2026
**Diseñado por:** architect
**Revisión:** Pendiente
**Estado:** Listo para Desarrollo
