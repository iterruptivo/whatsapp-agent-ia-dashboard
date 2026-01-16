# Filtro Usuarios con Searchable Combobox

## Resumen

Mejora del filtro "Ver reuniones de" en el módulo Reuniones, transformando el select simple en un searchable dropdown con autocompletado usando la librería `cmdk`.

## Implementación

### Ubicación
`components/reuniones/ReunionFiltros.tsx`

### Componente Principal: ComboboxUsuarios

**Características implementadas:**

1. **Input de búsqueda integrado**
   - Placeholder: "Buscar usuario..."
   - Filtra por nombre y email
   - Icono de búsqueda (Search icon)

2. **Opciones fijas siempre visibles**
   - ★ Mis reuniones
   - ★ Todas
   - Marcadas con estrella amarilla para destacar

3. **Lista de usuarios filtrada**
   - Máximo 7 usuarios visibles
   - Muestra nombre + email
   - Scroll automático si hay más
   - Mensaje "No se encontraron usuarios" si búsqueda vacía

4. **UX Features**
   - Click fuera cierra dropdown
   - Check verde (#1b967a) para opción seleccionada
   - Hover effect en opciones
   - Disabled state cuando está cargando
   - Keyboard navigation (cmdk built-in)

5. **Estructura visual**
   ```
   ┌─────────────────────────────┐
   │ 🔍 Buscar usuario...       │  ← Input búsqueda
   ├─────────────────────────────┤
   │ ★ Mis reuniones         ✓ │  ← Opciones fijas
   │ ★ Todas                   │
   ├─────────────────────────────┤
   │ USUARIOS                    │  ← Separador + label
   │ María López               │  ← Usuarios filtrados
   │   maria@ecoplaza.com      │
   │ Juan Pérez                │
   │   juan@ecoplaza.com       │
   └─────────────────────────────┘
   ```

### Tecnologías Utilizadas

- **cmdk**: Command palette component (ya estaba en package.json)
- **Lucide React**: Iconos (Search, Check, ChevronsUpDown)
- **Tailwind CSS**: Estilos corporativos
- **React Hooks**: useState, useEffect, useRef

### Props del Combobox

```typescript
interface ComboboxUsuariosProps {
  usuarios: Usuario[];           // Lista de usuarios
  value: string;                 // 'mine' | 'all' | userId
  onChange: (value: string) => void;
  disabled?: boolean;            // Deshabilitar interacción
  loading?: boolean;             // Estado de carga
}
```

## Mejoras Pendientes (TODO)

### 1. Contadores del Backend

Actualmente hay un TODO en línea 68:

```typescript
// TODO: Implementar contadores desde el backend
// const contadores = { mine: 3, all: 47, [userId]: 12 }
```

**Propuesta de implementación:**

Crear endpoint: `GET /api/reuniones/stats/contadores`

**Respuesta:**
```json
{
  "success": true,
  "contadores": {
    "mine": 3,
    "all": 47,
    "usuarios": {
      "uuid-user-1": 12,
      "uuid-user-2": 8,
      ...
    }
  }
}
```

**Integración en componente:**
```typescript
const [contadores, setContadores] = useState({});

useEffect(() => {
  // Fetch contadores
  fetch('/api/reuniones/stats/contadores')
    .then(res => res.json())
    .then(data => setContadores(data.contadores));
}, []);

// En el JSX:
<span>Mis reuniones ({contadores.mine || 0})</span>
```

### 2. Optimizaciones Opcionales

- **Virtual scrolling**: Si hay 100+ usuarios, usar react-window
- **Debounce en búsqueda**: Si la API es lenta
- **Cache de usuarios**: LocalStorage para evitar fetch repetidos
- **Highlight de búsqueda**: Resaltar texto coincidente

## Validación Manual

### Pasos de prueba:

1. **Login como superadmin**
   - Email: `gerente.ti@ecoplaza.com.pe`
   - Password: `H#TJf8M%xjpTK@Vn`

2. **Navegar a /reuniones**

3. **Probar filtro "Ver reuniones de":**
   - Hacer click en el botón → debe abrir dropdown
   - Escribir en búsqueda → debe filtrar usuarios
   - Seleccionar "Mis reuniones" → debe filtrar
   - Seleccionar "Todas" → debe mostrar todas
   - Seleccionar un usuario → debe filtrar por ese usuario
   - Click fuera → debe cerrar dropdown

4. **Verificar responsive:**
   - Desktop: dropdown full width
   - Mobile: debe funcionar correctamente
   - Tablet: verificar que no rompa layout

5. **Verificar teclado:**
   - Tab para navegar
   - ↑↓ para moverse en opciones
   - Enter para seleccionar
   - Esc para cerrar

## Colores Corporativos Usados

- Verde primario (#1b967a): Check icon, focus ring
- Azul navy (#192c4d): Label text
- Amarillo (#fbde17): Estrellas (usando text-yellow-500 equivalente)

## Archivos Modificados

- `components/reuniones/ReunionFiltros.tsx`

## Compatibilidad

- Next.js 15.5+
- React 19+
- cmdk 1.1.1
- Compatible con todos los navegadores modernos

## Screenshot Esperado

```
[Ver reuniones de]  ← Label
┌─────────────────────────────────────────┐
│ Mis reuniones                     ⌄    │  ← Botón cerrado
└─────────────────────────────────────────┘

Al hacer click:
┌─────────────────────────────────────────┐
│ Mis reuniones                     ⌄    │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🔍 Buscar usuario...                   │
├─────────────────────────────────────────┤
│ ★ Mis reuniones                    ✓  │
│ ★ Todas                               │
├─────────────────────────────────────────┤
│ USUARIOS                                │
│ María López                            │
│   maria@ecoplaza.com                   │
│ Juan Pérez                             │
│   juan@ecoplaza.com                    │
└─────────────────────────────────────────┘
```

---

**Fecha:** 2026-01-15
**Autor:** Claude Code (Frontend Developer Agent)
**Estado:** Implementado - Pendiente validación Playwright
