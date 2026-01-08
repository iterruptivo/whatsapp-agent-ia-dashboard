# Componentes de Reuniones - UI

Componentes React TypeScript para el módulo de reuniones del dashboard EcoPlaza.

## Componentes Creados

### 1. ReunionFiltros.tsx

Componente de filtros para la lista de reuniones.

**Características:**
- Filtro por rango de fechas (desde/hasta)
- Filtro por estado (todos, subiendo, procesando, completado, error)
- Botón para limpiar filtros
- Indicadores visuales de filtros activos
- Diseño responsive (apilado en móvil, horizontal en desktop)
- Colores corporativos EcoPlaza

**Props:**
```typescript
interface ReunionFiltrosProps {
  fechaDesde: string;
  fechaHasta: string;
  estado: ReunionEstado | 'todos';
  onFechaDesdeChange: (fecha: string) => void;
  onFechaHastaChange: (fecha: string) => void;
  onEstadoChange: (estado: ReunionEstado | 'todos') => void;
  onLimpiar: () => void;
  loading?: boolean;
}
```

**Uso:**
```tsx
<ReunionFiltros
  fechaDesde={fechaDesde}
  fechaHasta={fechaHasta}
  estado={estado}
  onFechaDesdeChange={setFechaDesde}
  onFechaHastaChange={setFechaHasta}
  onEstadoChange={setEstado}
  onLimpiar={() => {
    setFechaDesde('');
    setFechaHasta('');
    setEstado('todos');
  }}
  loading={loading}
/>
```

---

### 2. ReunionPagination.tsx

Componente de paginación para navegar entre páginas de reuniones.

**Características:**
- Botones Anterior/Siguiente con estados disabled
- Información de página actual y total
- Contador de reuniones totales
- Navegación rápida con botones numéricos (para muchas páginas)
- Loading state
- Diseño responsive
- Accesibilidad (aria-labels)

**Props:**
```typescript
interface ReunionPaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (page: number) => void;
  loading?: boolean;
}
```

**Uso:**
```tsx
<ReunionPagination
  pagination={{
    page: 1,
    limit: 10,
    total: 45,
    totalPages: 5,
    hasNext: true,
    hasPrev: false
  }}
  onPageChange={(page) => setPage(page)}
  loading={loading}
/>
```

---

### 3. EditarReunionModal.tsx

Modal para editar información de una reunión existente.

**Características:**
- Formulario con validación
- Input título (requerido, 3-200 caracteres)
- Input fecha/hora de reunión (opcional, type="datetime-local")
- Manejo de errores con alertas
- Loading state durante guardado
- Llamada a API PATCH /api/reuniones/[id]
- Conversión de fechas ISO a formato datetime-local
- Cierre con tecla ESC (nativo del modal)

**Props:**
```typescript
interface EditarReunionModalProps {
  reunion: { id: string; titulo: string; fecha_reunion: string | null };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reunion: Reunion) => void;
}
```

**Uso:**
```tsx
const [modalOpen, setModalOpen] = useState(false);
const [reunionSeleccionada, setReunionSeleccionada] = useState(null);

// Abrir modal
<button onClick={() => {
  setReunionSeleccionada(reunion);
  setModalOpen(true);
}}>
  Editar
</button>

// Componente
<EditarReunionModal
  reunion={reunionSeleccionada}
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onSuccess={(reunionActualizada) => {
    // Actualizar lista
    fetchReuniones();
    // Mostrar toast de éxito (opcional)
  }}
/>
```

---

## Dependencias

Todos los componentes usan:
- **React**: Hooks (useState, useEffect)
- **TypeScript**: Tipado estricto
- **Tailwind CSS**: Estilos con colores corporativos
- **Lucide React**: Iconos
- **@supabase/auth-helpers-nextjs**: Autenticación (solo EditarReunionModal)
- **@/types/reuniones**: Tipos compartidos

---

## Colores Corporativos

```css
Verde primario: #1b967a
Verde hover:    #156b5a
Azul navy:      #192c4d
Amarillo:       #fbde17
```

---

## Patrones de Diseño Aplicados

### Cards
```tsx
className="bg-white rounded-lg shadow-md p-4 md:p-6"
```

### Buttons (Primario)
```tsx
className="bg-[#1b967a] text-white px-4 py-2 rounded-md hover:bg-[#156b5a] transition-colors"
```

### Buttons (Secundario)
```tsx
className="border border-gray-300 text-[#192c4d] hover:bg-gray-50"
```

### Inputs
```tsx
className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
```

### Headers
```tsx
className="text-[#192c4d] text-xl font-bold"
```

---

## Responsive Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm-lg)
- **Desktop**: > 1024px (lg+)

Todos los componentes son mobile-first.

---

## Testing

Para probar estos componentes, usa credenciales de testing del proyecto PRUEBAS:

```
Admin: gerencia@ecoplaza.com / q0#CsgL8my3$
```

---

## Archivos Relacionados

- `/types/reuniones.ts` - Tipos TypeScript
- `/app/api/reuniones/[id]/route.ts` - API PATCH para editar
- `/app/(protected)/reuniones/page.tsx` - Página que consume los componentes

---

Última actualización: 2026-01-08
