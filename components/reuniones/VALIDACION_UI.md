# Validación UI - Componentes de Reuniones

## Componentes Creados

### 1. ReunionFiltros.tsx
- **Ubicación:** `components/reuniones/ReunionFiltros.tsx`
- **Funcionalidad:** Filtros de fecha y estado para reuniones
- **Estado:** Creado y listo para integrar

**Características visuales:**
- Card blanco con shadow-md
- Header con icono Filter (lucide-react)
- Grid responsive (1 col mobile, 2 cols tablet, 4 cols desktop)
- Inputs date con estilos corporativos
- Select estado con 5 opciones
- Botón "Limpiar filtros" con icono X
- Tags de filtros activos (verde claro #1b967a/10)
- Focus ring verde (#1b967a)

**Responsive:**
- Mobile: Apilado verticalmente
- Tablet (sm): 2 columnas
- Desktop (lg): 4 columnas

---

### 2. ReunionPagination.tsx
- **Ubicación:** `components/reuniones/ReunionPagination.tsx`
- **Funcionalidad:** Navegación entre páginas
- **Estado:** Creado y listo para integrar

**Características visuales:**
- Card blanco con shadow-md
- Botones Anterior/Siguiente con iconos ChevronLeft/Right
- Info central: "Página X de Y (N reuniones)"
- Navegación rápida numérica (si hay más de 3 páginas)
- Página actual con fondo verde (#1b967a)
- Loading spinner verde cuando está cargando
- Estados disabled con opacity-50

**Responsive:**
- Mobile: Botones full-width apilados
- Tablet+: Botones inline con info central

---

### 3. EditarReunionModal.tsx
- **Ubicación:** `components/reuniones/EditarReunionModal.tsx`
- **Funcionalidad:** Modal para editar reunión
- **Estado:** Creado y listo para integrar

**Características visuales:**
- Overlay oscuro con backdrop-blur
- Modal centrado, max-width 448px
- Header con título y botón X
- Formulario con validación
- Input título (contador de caracteres)
- Input datetime-local para fecha
- Alert roja para errores
- Botones Cancelar (gris) y Guardar (verde)
- Loading state con spinner en botón

**Validaciones:**
- Título: min 3, max 200 caracteres
- Fecha: opcional, formato datetime-local
- Botón deshabilitado si título < 3 chars

---

## Colores Aplicados

Todos los componentes usan la paleta corporativa:

| Color | Hex | Uso |
|-------|-----|-----|
| Verde primario | #1b967a | Botones, focus rings, badges |
| Verde hover | #156b5a | Hover states de botones |
| Azul navy | #192c4d | Títulos, textos importantes |
| Amarillo | #fbde17 | (No usado en estos componentes) |
| Gris claro | #f3f4f6 | Backgrounds hover |
| Gris medio | #6b7280 | Textos secundarios |

---

## Patrones de Tailwind

### Cards
```tsx
bg-white rounded-lg shadow-md p-4 md:p-6
```

### Buttons Primario
```tsx
bg-[#1b967a] text-white px-4 py-2 rounded-md hover:bg-[#156b5a] transition-colors
```

### Buttons Secundario
```tsx
border border-gray-300 text-[#192c4d] hover:bg-gray-50
```

### Inputs
```tsx
px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a]
```

---

## Iconos Usados (lucide-react)

| Componente | Iconos |
|------------|--------|
| ReunionFiltros | Filter, X |
| ReunionPagination | ChevronLeft, ChevronRight |
| EditarReunionModal | X, Save, Loader2 |

---

## Estados de Loading

Todos los componentes manejan estado `loading`:

1. **ReunionFiltros:**
   - Inputs deshabilitados
   - Cursor not-allowed

2. **ReunionPagination:**
   - Botones deshabilitados
   - Spinner verde con mensaje

3. **EditarReunionModal:**
   - Formulario deshabilitado
   - Spinner en botón "Guardar"
   - Botón "Cancelar" deshabilitado

---

## Accesibilidad

- Labels con `htmlFor` correcto
- Aria-labels en botones de navegación
- Estados disabled claros
- Mensajes de error descriptivos
- Focus rings visibles (verde)

---

## Integración

Ver archivo `EJEMPLO_INTEGRACION.tsx` para implementación completa.

**Pasos:**
1. Importar los 3 componentes
2. Crear state para filtros, paginación, modal
3. Fetch reuniones en `useEffect`
4. Conectar handlers de eventos
5. Renderizar en orden: Filtros → Lista → Paginación → Modal

---

## Testing Manual (Checklist)

### ReunionFiltros
- [ ] Cambiar fecha_desde actualiza filtro
- [ ] Cambiar fecha_hasta actualiza filtro (min = fecha_desde)
- [ ] Select estado muestra todas las opciones
- [ ] Botón "Limpiar" resetea todos los filtros
- [ ] Tags de filtros activos se muestran correctamente
- [ ] Responsive: mobile (apilado) y desktop (horizontal)

### ReunionPagination
- [ ] Botón "Anterior" disabled en página 1
- [ ] Botón "Siguiente" disabled en última página
- [ ] Info muestra página correcta
- [ ] Contador de reuniones correcto
- [ ] Navegación rápida funciona (si hay >3 páginas)
- [ ] Página actual con fondo verde
- [ ] Responsive funciona

### EditarReunionModal
- [ ] Modal se abre/cierra correctamente
- [ ] Campos se pre-llenan con datos de reunión
- [ ] Validación de título (min 3, max 200)
- [ ] Contador de caracteres funciona
- [ ] Fecha se convierte correctamente a datetime-local
- [ ] Error se muestra si API falla
- [ ] Loading state durante guardado
- [ ] onSuccess se llama con reunión actualizada
- [ ] Modal se cierra solo si no está loading

---

## Próximos Pasos

1. Integrar componentes en página `/app/(protected)/reuniones/page.tsx`
2. Conectar con API `/api/reuniones`
3. Testing funcional con Playwright MCP
4. Validación visual en diferentes resoluciones

---

**Creado:** 2026-01-08
**Estado:** Componentes listos para integración
**Siguiente:** Crear página de reuniones que los use
