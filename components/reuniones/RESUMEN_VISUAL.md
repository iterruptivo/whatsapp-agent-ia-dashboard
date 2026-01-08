# Resumen Visual - Componentes UI de Reuniones

## 1. ReunionFiltros.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Filtros                                        🗑️ Limpiar    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Fecha Desde         Fecha Hasta        Estado      [Aplicar]   │
│  [__/__/____]       [__/__/____]     [Todos ▼]     (Móvil)     │
│                                                                  │
│  🏷️ Desde: 2026-01-01  🏷️ Estado: completado                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Colores:**
- Header: Verde #1b967a
- Card: Blanco #ffffff
- Shadow: shadow-md
- Tags: Verde claro #1b967a/10
- Focus: Ring verde #1b967a

**Responsive:**
```
Mobile (< 640px):         Tablet (640px-1024px):      Desktop (> 1024px):
┌─────────────────┐      ┌─────────────────────┐     ┌─────────────────────────┐
│ Fecha Desde     │      │ Desde    │ Hasta    │     │ Desde│Hasta│Estado│Btn │
│ [___________]   │      │ [____]   │ [____]   │     │ [__] │[__] │[_▼] │[OK]│
│                 │      │ Estado            Ok│     └─────────────────────────┘
│ Fecha Hasta     │      │ [____▼]   │ [OK]   │
│ [___________]   │      └─────────────────────┘
│                 │
│ Estado          │
│ [Todos ▼]       │
│                 │
│ [Aplicar]       │
└─────────────────┘
```

---

## 2. ReunionPagination.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [◄ Anterior]        Página 2 de 5           [Siguiente ►]      │
│                      45 reuniones en total                       │
│                                                                  │
│           1  ...  [1]  [2]  [3]  ...  5                         │
│                        ▲ actual                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Estados:**
- Página actual: Fondo verde #1b967a, texto blanco
- Página inactiva: Borde gris, texto azul navy #192c4d
- Disabled: Opacidad 50%, cursor not-allowed
- Loading: Spinner verde + mensaje

**Responsive:**
```
Mobile (< 640px):              Desktop (> 640px):
┌───────────────────┐          ┌────────────────────────────────┐
│ [◄ Anterior]      │          │ [◄ Anterior]  Página 2 de 5    │
│                   │          │               45 reuniones      │
│   Página 2 de 5   │          │                    [Siguiente ►]│
│   45 reuniones    │          └────────────────────────────────┘
│                   │
│ [Siguiente ►]     │
└───────────────────┘
```

---

## 3. EditarReunionModal.tsx

```
        ┌──────────────────────────────────────────┐
        │ Editar Reunión                    [X]    │
        ├──────────────────────────────────────────┤
        │                                           │
        │  ⚠️ Error: El título debe tener al menos │
        │     3 caracteres                          │
        │                                           │
        │  Título *                                 │
        │  [Reunión de planificación Q1 2026___]   │
        │  45/200 caracteres                        │
        │                                           │
        │  Fecha de Reunión                         │
        │  [08/01/2026  14:30]                     │
        │  Opcional. Puedes dejar vacío...          │
        │                                           │
        │  [Cancelar]         [💾 Guardar Cambios] │
        │                                           │
        └──────────────────────────────────────────┘
```

**Estados:**
- Normal: Modal centrado, overlay oscuro
- Loading: Spinner en botón "Guardando..."
- Error: Alert roja arriba del formulario
- Success: Se cierra y llama onSuccess()

**Validaciones:**
```
Título:
✅ Min 3 caracteres
✅ Max 200 caracteres
✅ Required (botón disabled si vacío)

Fecha:
✅ Opcional
✅ Formato datetime-local
✅ Se convierte de ISO a input value
```

---

## Flujo de Interacción Completo

```
┌─────────────────────────────────────────────────────────────┐
│ PÁGINA: /reuniones                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [ReunionFiltros]                                            │
│   └─> onChange → setState → useEffect → fetchReuniones()   │
│                                                              │
│ [Lista de Reuniones]                                        │
│   ├─> Reunión 1  [Editar] ──> Abre EditarReunionModal     │
│   ├─> Reunión 2  [Editar]                                  │
│   └─> Reunión 3  [Editar]                                  │
│                                                              │
│ [ReunionPagination]                                         │
│   └─> onPageChange → setPage → useEffect → fetchReuniones()│
│                                                              │
│ [EditarReunionModal] (si isOpen)                           │
│   └─> onSubmit → PATCH /api → onSuccess → fetchReuniones() │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Colores por Componente

| Componente | Primario | Secundario | Acento |
|------------|----------|------------|--------|
| ReunionFiltros | #1b967a (verde) | #192c4d (azul) | #f3f4f6 (gris claro) |
| ReunionPagination | #1b967a (verde) | #192c4d (azul) | - |
| EditarReunionModal | #1b967a (verde) | #192c4d (azul) | #ef4444 (rojo error) |

---

## Iconos por Componente

| Componente | Iconos | Librería |
|------------|--------|----------|
| ReunionFiltros | Filter, X | lucide-react |
| ReunionPagination | ChevronLeft, ChevronRight | lucide-react |
| EditarReunionModal | X, Save, Loader2 | lucide-react |

---

## Tamaños de Texto

```css
/* Headers */
h1: text-2xl font-bold text-[#192c4d]
h2: text-lg font-semibold text-[#192c4d]

/* Labels */
label: text-sm font-medium text-[#192c4d]

/* Textos secundarios */
p: text-sm text-gray-600
span: text-xs text-gray-500

/* Botones */
button: text-sm font-medium
```

---

## Espaciado

```css
/* Card padding */
p-4 md:p-6  (16px / 24px)

/* Gap entre elementos */
gap-2       (8px)
gap-4       (16px)
gap-6       (24px)

/* Margin bottom */
mb-1        (4px)
mb-4        (16px)
mb-6        (24px)
```

---

## Sombras

```css
/* Card principal */
shadow-md   (medium shadow)

/* Modal */
shadow-xl   (extra large shadow)

/* Focus ring */
ring-2      (2px ring)
```

---

## Animaciones

```css
/* Transiciones */
transition-colors    (color transition)

/* Spinner */
animate-spin         (loading spinner)

/* Hover */
hover:bg-[#156b5a]  (hover state)
```

---

## Ejemplo de Integración Visual

```tsx
<div className="p-4 md:p-6 space-y-6">
  {/* Header */}
  <div className="bg-white rounded-lg shadow-md p-6">
    <h1 className="text-2xl font-bold text-[#192c4d]">
      Mis Reuniones
    </h1>
  </div>

  {/* Filtros */}
  <ReunionFiltros {...filtrosProps} />

  {/* Lista */}
  <div className="bg-white rounded-lg shadow-md">
    {/* Reuniones aquí */}
  </div>

  {/* Paginación */}
  <ReunionPagination {...paginationProps} />

  {/* Modal (condicional) */}
  {modalOpen && <EditarReunionModal {...modalProps} />}
</div>
```

---

## Compatibilidad de Navegadores

✅ Chrome/Edge (Chromium)
✅ Firefox
✅ Safari
✅ Mobile Safari (iOS)
✅ Chrome Mobile (Android)

**Notas:**
- `datetime-local` input soportado en todos los navegadores modernos
- Tailwind CSS autoprefixer se encarga de compatibilidad
- Lucide React renderiza SVGs estándar

---

**Creado:** 2026-01-08
**Componentes:** 3 de 3 completados
**Estado:** Listo para integración
