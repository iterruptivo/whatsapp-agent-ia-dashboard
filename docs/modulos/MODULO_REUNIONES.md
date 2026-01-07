# MODULO: Reuniones y Transcripciones

## RESUMEN

Módulo completo para subir, transcribir y analizar reuniones mediante IA. Genera automáticamente:
- Transcripción completa (OpenAI Whisper)
- Resumen ejecutivo
- Puntos clave
- Decisiones tomadas
- Preguntas abiertas
- Action items con asignación y seguimiento

## ARQUITECTURA

### Backend (YA IMPLEMENTADO)

#### Tablas Supabase
- **reuniones**: Metadata y contenido procesado de reuniones
- **reunion_action_items**: Tareas extraídas de reuniones

#### Storage
- **Bucket**: `reuniones-media` (archivos de audio/video)
- **Formatos soportados**: mp3, mp4, wav, m4a, webm
- **Límite**: 2GB por archivo

#### Server Actions
- **lib/actions-reuniones.ts**:
  - `getReuniones()` - Lista con filtros
  - `getReunionDetalle()` - Detalle + action items
  - `updateReunionEstado()` - Cambiar estado
  - `deleteReunion()` - Eliminar (admin)

- **lib/actions-action-items.ts**:
  - `getUserActionItems()` - Items del usuario
  - `markActionItemCompleted()` - Marcar completado
  - `linkActionItemToUser()` - Vincular a usuario
  - `updateActionItem()` - Editar item

#### API Routes
- **POST /api/reuniones/upload**: Upload de archivo multimedia
- **POST /api/reuniones/[id]/process**: Trigger procesamiento IA en background
- **GET /api/reuniones/[id]/cleanup**: Cron para eliminar archivos antiguos (90 días)

### Frontend (IMPLEMENTADO EN ESTA SESIÓN)

#### Páginas

##### /reuniones
- **Acceso**: admin, gerencia, jefe_ventas
- **Componentes**:
  - `ReunionesTable` - Tabla con filtros
  - `NuevaReunionModal` - Upload con validación
  - `ReunionEstadoBadge` - Badge de estado

##### /reuniones/[id]
- **Acceso**: admin, gerencia, jefe_ventas
- **Tabs**:
  - Resumen (puntos clave, decisiones, preguntas)
  - Action Items (con checkboxes)
  - Transcripción (con botón copiar)
- **Componentes**:
  - `ReunionDetalleHeader` - Metadata
  - `ReunionResumenTab` - Contenido IA
  - `ReunionActionItemsTab` - Lista con filtros
  - `ReunionTranscripcionTab` - Texto completo
  - `ActionItemCard` - Card individual
  - `ActionItemCheckbox` - Toggle completado

##### /mis-pendientes
- **Acceso**: TODOS los roles
- **Componentes**:
  - `MisPendientesTable` - Lista con stats
  - `PendienteCard` - Card con link a reunión
- **Features**:
  - Separación por prioridad (alta/media/baja)
  - Alertas de vencidos
  - Completados recientes (últimos 7 días)

#### Hooks

##### useReunionUpload
```typescript
const { status, progress, error, reunionId, upload, cancel, reset } = useReunionUpload();
```
- **Estados**: idle, uploading, processing, done, error
- **Features**:
  - XMLHttpRequest para tracking de progreso
  - Cancelación de upload
  - Trigger automático de procesamiento

#### Sidebar
Links agregados en todos los roles:
- **"Reuniones"**: admin, gerencia, jefe_ventas (bottom items)
- **"Mis Pendientes"**: TODOS los roles (direct items)

## FLUJO DE USO

### 1. Subir Reunión
1. Usuario (admin/gerencia/jefe_ventas) va a `/reuniones`
2. Click en "Nueva Reunión"
3. Completa:
   - Título (requerido)
   - Fecha de reunión (opcional)
   - Archivo multimedia (mp3, mp4, wav, m4a, webm, máx 2GB)
4. Click "Subir Reunión"
5. Progreso de upload en tiempo real
6. Mensaje "Procesando en segundo plano"

### 2. Procesamiento Automático
1. Archivo sube a Supabase Storage
2. API route `/api/reuniones/[id]/process` se triggerea automáticamente
3. Backend:
   - Whisper transcribe audio → `transcripcion_completa`
   - GPT-4 analiza transcripción → `resumen`, `puntos_clave`, `decisiones`, `preguntas_abiertas`
   - GPT-4 extrae action items → tabla `reunion_action_items`
4. Estado cambia de 'procesando' a 'completado'

### 3. Ver Reunión
1. Usuario va a `/reuniones/[id]`
2. Ve 3 tabs:
   - **Resumen**: Insights generados por IA
   - **Action Items**: Lista de tareas (puede marcar como completado)
   - **Transcripción**: Texto completo (puede copiar)

### 4. Gestionar Pendientes
1. CUALQUIER usuario va a `/mis-pendientes`
2. Ve sus action items asignados
3. Puede marcar como completado con checkbox
4. Puede hacer click para ir a la reunión origen

## VALIDACIÓN DE ARCHIVOS

### Cliente (antes de upload)
```typescript
- Tamaño: máx 2GB
- Formatos: .mp3, .mp4, .wav, .m4a, .webm
- Validación por tipo MIME y extensión
```

### Servidor
- Verifica tamaño en upload
- Valida formato antes de procesamiento
- Timeout de 10 minutos para Whisper

## ESTADOS DE REUNIÓN

| Estado | Descripción | Badge |
|--------|-------------|-------|
| `subiendo` | Upload en progreso | Azul con spinner |
| `procesando` | IA analizando | Amarillo con spinner |
| `completado` | Listo para ver | Verde con check |
| `error` | Falló procesamiento | Rojo con X |

## PERMISOS POR ROL

| Funcionalidad | admin | gerencia | jefe_ventas | otros |
|--------------|-------|----------|-------------|-------|
| Ver reuniones | ✅ | ✅ | ✅ | ❌ |
| Subir reunión | ✅ | ✅ | ✅ | ❌ |
| Ver action items de reunión | ✅ | ✅ | ✅ | ❌ |
| Ver mis pendientes | ✅ | ✅ | ✅ | ✅ |
| Marcar completado | ✅ | ✅ | ✅ | ✅ |
| Eliminar reunión | ✅ | ❌ | ❌ | ❌ |

## COMPONENTES CREADOS

### Páginas (3)
- `app/reuniones/page.tsx`
- `app/reuniones/[id]/page.tsx`
- `app/mis-pendientes/page.tsx`

### Componentes Reuniones (9)
- `components/reuniones/ReunionesTable.tsx`
- `components/reuniones/NuevaReunionModal.tsx`
- `components/reuniones/UploadProgress.tsx`
- `components/reuniones/ReunionEstadoBadge.tsx`
- `components/reuniones/ReunionDetalleHeader.tsx`
- `components/reuniones/ReunionResumenTab.tsx`
- `components/reuniones/ReunionActionItemsTab.tsx`
- `components/reuniones/ActionItemCard.tsx`
- `components/reuniones/ActionItemCheckbox.tsx`
- `components/reuniones/ReunionTranscripcionTab.tsx`

### Componentes Mis Pendientes (2)
- `components/mis-pendientes/MisPendientesTable.tsx`
- `components/mis-pendientes/PendienteCard.tsx`

### Hooks (1)
- `hooks/useReunionUpload.ts`

### Modificados (1)
- `components/shared/Sidebar.tsx` - Agregados links "Reuniones" y "Mis Pendientes"

## PRÓXIMOS PASOS (OPCIONAL)

### Mejoras Futuras
- [ ] **Notificaciones**: Alertar cuando se completa el procesamiento
- [ ] **Realtime**: Supabase Realtime para actualizar estado en vivo
- [ ] **Badge contador**: Mostrar # de pendientes en sidebar
- [ ] **Asignación manual**: Poder asignar action items a usuarios específicos
- [ ] **Edición**: Editar action items manualmente
- [ ] **Filtros avanzados**: Por participante, fecha, proyecto
- [ ] **Export**: Descargar resumen o transcripción como PDF
- [ ] **Compartir**: Enviar resumen por email o WhatsApp
- [ ] **Análisis**: Dashboard con métricas de reuniones

### Integraciones
- [ ] **Calendar**: Vincular con Google Calendar / Outlook
- [ ] **n8n**: Workflow automático al completar procesamiento
- [ ] **WhatsApp**: Enviar resumen a participantes

## TESTING

### Manual
1. Subir reunión de prueba (usar archivo de `docs/test-assets/` si hay disponible)
2. Verificar progreso de upload
3. Esperar procesamiento (puede tomar 2-5 min)
4. Verificar:
   - Resumen se generó correctamente
   - Action items se extrajeron
   - Transcripción está completa
5. Marcar action item como completado
6. Verificar en "Mis Pendientes"

### Casos Edge
- [ ] Archivo muy grande (>1.5GB)
- [ ] Formato no soportado
- [ ] Audio sin voz (silencio)
- [ ] Reunión en otro idioma
- [ ] Cancelar upload a mitad
- [ ] Multiples usuarios viendo misma reunión

## DEPENDENCIAS

### Backend
- OpenAI API (Whisper + GPT-4)
- Supabase Storage
- Server Actions con cookies

### Frontend
- lucide-react (iconos)
- Tailwind CSS
- TypeScript
- Next.js App Router

## NOTAS IMPORTANTES

1. **OPENAI_API_KEY requerida**: Sin esta variable de entorno, el procesamiento fallará
2. **Cleanup automático**: Los archivos multimedia se eliminan después de 90 días (cron)
3. **RLS policies**: Las reuniones están filtradas por proyecto_id
4. **Transcripción**: Puede tener errores menores (depende de calidad de audio)
5. **Timeout**: Archivos muy largos (>1 hora) pueden fallar por timeout

## COSTOS APROXIMADOS (OpenAI)

| Operación | Costo Estimado |
|-----------|----------------|
| Whisper (1 hora audio) | ~$0.36 USD |
| GPT-4 (análisis transcripción) | ~$0.10 USD |
| **Total por reunión** | **~$0.46 USD** |

Para 100 reuniones/mes: ~$46 USD

---

**Fecha de Implementación**: 6 Enero 2026
**Sesión**: 82
**Estado**: COMPLETADO ✅
