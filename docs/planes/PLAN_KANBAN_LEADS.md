# Plan: Kanban Pipeline de Calificación de Leads

**Fecha:** 23 Diciembre 2025
**Estado:** APROBADO - En Implementación
**Sesión:** 75+

---

## Resumen Ejecutivo

Implementar un tablero Kanban para visualizar y gestionar leads por etapa de calificación, con mapeo configurable desde base de datos.

---

## Arquitectura Aprobada

### 5 Columnas de Calificación

| # | Columna | Código | Color | Descripción |
|---|---------|--------|-------|-------------|
| 1 | **Nuevo** | `nuevo` | 🔵 #3B82F6 | Lead recién llegado, sin tipificar |
| 2 | **Contactando** | `contactando` | 🟡 #F59E0B | Intentando contactar (sin respuesta) |
| 3 | **En Conversación** | `en_conversacion` | 🟠 #F97316 | Lead respondió, evaluando interés |
| 4 | **Calificado** | `calificado` | 🟢 #10B981 | Listo para pasar a Locales |
| 5 | **Descartado** | `descartado` | ⚫ #6B7280 | Sin interés o no califica |

### Nurturing (Opción B)
- Sub-estado dentro de "Descartado"
- Badge/etiqueta: "Recontactar en X meses"
- Se maneja con campañas de WhatsApp desde n8n
- NO es una columna adicional

---

## Mapeo Tipificación → Columna Kanban

### Reglas de Asignación

```typescript
function getColumnaKanban(lead: Lead): string {
  const { tipificacion_nivel_1, tipificacion_nivel_2 } = lead;

  // 1. Sin tipificar = NUEVO
  if (!tipificacion_nivel_1) return 'nuevo';

  // 2. No contactado = CONTACTANDO
  if (tipificacion_nivel_1 === 'no_contactado') return 'contactando';

  // 3. Descartado (no_interesado)
  if (tipificacion_nivel_2 === 'no_interesado') return 'descartado';

  // 4. Calificado (cliente_*)
  if (['cliente_evaluacion', 'cliente_negociacion', 'cliente_cierre']
      .includes(tipificacion_nivel_2 || '')) return 'calificado';

  // 5. Todo lo demás = EN CONVERSACIÓN
  return 'en_conversacion';
}
```

### Mapeo Completo por Tipificación

#### NUEVO (nivel_1 = null)
- Sin tipificar

#### CONTACTANDO (nivel_1 = 'no_contactado')
- no_contactado.no_contesta
- no_contactado.buzon_mensaje
- no_contactado.telefono_apagado
- no_contactado.telefono_fuera_servicio
- no_contactado.numero_incorrecto

#### EN CONVERSACIÓN
- contactado.interesado (+ todos los nivel_3)
- seguimiento.pendiente_visita
- seguimiento.pendiente_decision
- otros.contacto_otra_area

#### CALIFICADO
- contactado.cliente_evaluacion (+ nivel_3: evaluacion_crediticia, aprobado_banco, etc.)
- contactado.cliente_negociacion (+ nivel_3: negociacion_precio, revision_contrato, etc.)
- contactado.cliente_cierre (+ nivel_3: separacion_pagada, firma_contrato, etc.)

#### DESCARTADO
- contactado.no_interesado (+ nivel_3: no_califica, no_desea_comprar, precio_fuera_presupuesto, etc.)

---

## Base de Datos

### Nueva Tabla: `kanban_config`

```sql
CREATE TABLE kanban_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  columna_codigo VARCHAR(50) NOT NULL,
  columna_nombre VARCHAR(100) NOT NULL,
  columna_color VARCHAR(20) NOT NULL,
  columna_orden INTEGER NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Nueva Tabla: `kanban_tipificacion_mapping`

```sql
CREATE TABLE kanban_tipificacion_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipificacion_nivel_1 VARCHAR(50),
  tipificacion_nivel_2 VARCHAR(50),
  columna_codigo VARCHAR(50) NOT NULL REFERENCES kanban_config(columna_codigo),
  prioridad INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tipificacion_nivel_1, tipificacion_nivel_2)
);
```

### Datos Iniciales

```sql
-- Columnas
INSERT INTO kanban_config (columna_codigo, columna_nombre, columna_color, columna_orden) VALUES
('nuevo', 'Nuevo', '#3B82F6', 1),
('contactando', 'Contactando', '#F59E0B', 2),
('en_conversacion', 'En Conversación', '#F97316', 3),
('calificado', 'Calificado', '#10B981', 4),
('descartado', 'Descartado', '#6B7280', 5);

-- Mapeo
INSERT INTO kanban_tipificacion_mapping (tipificacion_nivel_1, tipificacion_nivel_2, columna_codigo) VALUES
-- NUEVO
(NULL, NULL, 'nuevo'),

-- CONTACTANDO
('no_contactado', 'no_contesta', 'contactando'),
('no_contactado', 'buzon_mensaje', 'contactando'),
('no_contactado', 'telefono_apagado', 'contactando'),
('no_contactado', 'telefono_fuera_servicio', 'contactando'),
('no_contactado', 'numero_incorrecto', 'contactando'),

-- EN CONVERSACIÓN
('contactado', 'interesado', 'en_conversacion'),
('seguimiento', 'pendiente_visita', 'en_conversacion'),
('seguimiento', 'pendiente_decision', 'en_conversacion'),
('otros', 'contacto_otra_area', 'en_conversacion'),

-- CALIFICADO
('contactado', 'cliente_evaluacion', 'calificado'),
('contactado', 'cliente_negociacion', 'calificado'),
('contactado', 'cliente_cierre', 'calificado'),

-- DESCARTADO
('contactado', 'no_interesado', 'descartado');
```

---

## Componentes a Crear

### Nuevos Archivos

```
components/operativo/kanban/
├── KanbanBoard.tsx        # Contenedor principal con DndContext
├── KanbanColumn.tsx       # Columna individual con droppable
├── KanbanCard.tsx         # Tarjeta de lead draggable
├── KanbanViewToggle.tsx   # Toggle tabla/kanban
└── types.ts               # Tipos TypeScript

lib/
├── kanban-config.ts       # Funciones para leer config de BD
└── actions-kanban.ts      # Server actions para drag & drop

app/configuracion/kanban/
└── page.tsx               # Página de configuración del mapeo
```

### Archivos a Modificar

```
components/operativo/OperativoClient.tsx  # Agregar toggle y vista kanban
lib/db.ts                                  # Agregar interfaces
```

---

## Fases de Implementación

### Fase 1: Base de Datos
1. Crear migración con tablas `kanban_config` y `kanban_tipificacion_mapping`
2. Insertar datos iniciales (columnas + mapeo)
3. Crear función SQL para obtener columna de un lead

### Fase 2: Backend
1. Crear `lib/kanban-config.ts` - Funciones para leer config
2. Crear `lib/actions-kanban.ts` - Server action para mover leads
3. Crear tipos TypeScript

### Fase 3: Componentes UI
1. Crear KanbanCard.tsx
2. Crear KanbanColumn.tsx
3. Crear KanbanBoard.tsx
4. Crear KanbanViewToggle.tsx

### Fase 4: Integración
1. Modificar OperativoClient.tsx para toggle
2. Conectar datos de leads al board
3. Implementar drag & drop con @dnd-kit

### Fase 5: Configuración
1. Crear página /configuracion/kanban
2. UI para editar mapeo
3. Validaciones

---

## Diseño Visual

### Tarjeta (KanbanCard)

```
┌─────────────────────────────────────┐
│ 🔵 Callao              ⏱️ 2 días   │
├─────────────────────────────────────┤
│ Juan Carlos Pérez                   │
│ 📱 987 654 321  [WhatsApp]          │
│                                     │
│ 👤 Alonso M.    🏪 Restaurante      │
└─────────────────────────────────────┘
```

### Columna (KanbanColumn)

```
┌─────────────────────────────────────┐
│ 🟢 Calificado (12)                  │
├─────────────────────────────────────┤
│ [Card]                              │
│ [Card]                              │
│ [Card]                              │
│ ...scroll...                        │
└─────────────────────────────────────┘
```

---

## Dependencias

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Acciones al Mover (Drag & Drop)

| De → A | Tipificación Actualizada |
|--------|-------------------------|
| Nuevo → Contactando | nivel_1='no_contactado', nivel_2='no_contesta' |
| Contactando → En Conversación | nivel_1='contactado', nivel_2='interesado' |
| En Conversación → Calificado | nivel_1='contactado', nivel_2='cliente_evaluacion' |
| Cualquiera → Descartado | nivel_1='contactado', nivel_2='no_interesado' |
| Descartado → En Conversación | nivel_1='contactado', nivel_2='interesado' |

---

## Configuración en Menú

**Ubicación sugerida:** Configuración > Kanban de Leads

**Funcionalidades:**
- Ver columnas actuales
- Editar nombres y colores
- Ver/editar mapeo de tipificaciones
- Reordenar columnas
- Activar/desactivar columnas

---

## Notas Técnicas

### Por qué @dnd-kit
- Mejor soporte para React 18/19
- Más ligero que react-beautiful-dnd
- Accesibilidad incluida
- Mantenido activamente (2025)

### Sin cambios a tipificación existente
- El sistema de 3 niveles se mantiene igual
- Solo agregamos la capa de visualización Kanban
- El mapeo es configurable desde BD

### Performance
- Virtualización si hay muchos leads en una columna
- Optimistic UI updates para drag & drop
- Supabase Realtime para sincronización

---

## Criterios de Éxito

- [ ] Kanban muestra leads agrupados por columna
- [ ] Drag & drop funciona y actualiza tipificación
- [ ] Toggle tabla/kanban funciona
- [ ] Configuración de mapeo accesible desde menú
- [ ] No rompe funcionalidad existente

---

**Aprobado por:** Usuario (PM)
**Fecha aprobación:** 23 Diciembre 2025
