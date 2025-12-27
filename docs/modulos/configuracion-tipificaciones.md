# Modulo: Configuracion de Tipificaciones

## Resumen Ejecutivo

Pagina de administracion que permite al rol admin gestionar las tipificaciones disponibles para clasificar leads en el sistema.

---

## Informacion Basica

| Atributo | Valor |
|----------|-------|
| **Ruta** | `/configuracion-tipificaciones` |
| **Acceso** | Solo admin |
| **Estado** | Operativo |
| **Version** | 1.0 |
| **Fecha Creacion** | 24 Diciembre 2025 |

---

## Arquitectura

### Stack Tecnico

- **Framework:** Next.js 15.5 App Router
- **UI:** React + TypeScript + Tailwind CSS
- **Icons:** Lucide React
- **Data:** Server Actions + Supabase

### Archivos Principales

```
app/configuracion-tipificaciones/
  └── page.tsx                              # Pagina principal

lib/
  └── actions-tipificaciones-config.ts      # Server actions (CRUD)

components/shared/
  └── Sidebar.tsx                           # Menu lateral (agregado item)

supabase/migrations/
  └── 20251224_tipificaciones_config.sql    # Schema y RPC functions
```

---

## Funcionalidades

### 1. Visualizacion

#### Arbol N1 → N2 (Izquierda)
- Lista jerarquica de tipificaciones N1 con sus N2 hijos
- Acordeones expandibles por N1
- Badge de conteo de uso por cada item
- Estados visuales:
  - Items en uso: fondo azul claro, badge azul
  - Items sin uso: fondo normal, badge gris

#### Lista N3 (Derecha)
- Lista independiente de tipificaciones N3
- Sin jerarquia (flat)
- Badge de conteo de uso

### 2. Operaciones CRUD

#### Crear
- **Nuevo N1:** Modal con campos codigo + label
- **Nuevo N2:** Modal con seleccion de N1 padre + codigo + label
- **Nuevo N3:** Modal con campos codigo + label

#### Editar
- Modal simple para cambiar label
- Se preserva el codigo (inmutable)

#### Activar/Desactivar
- Toggle de estado activo/inactivo
- Validacion: NO se puede desactivar si esta en uso
- Tooltip informativo cuando item esta en uso

### 3. Validaciones

```typescript
// Antes de desactivar
if (uso_count > 0) {
  return error: "No se puede desactivar: X lead(s) la estan usando"
}
```

### 4. Conteo de Uso

Funcion RPC en Supabase:
```sql
get_tipificacion_uso_count(nivel INT, codigo_tipif VARCHAR) RETURNS INT
```

---

## Server Actions Utilizadas

```typescript
getTipificacionesTree()              // Arbol N1→N2 con conteo
getTipificacionesNivel3()            // Lista N3 con conteo
createTipificacionN1(data)           // Crear N1
createTipificacionN2(data)           // Crear N2
createTipificacionN3(data)           // Crear N3
updateTipificacion(nivel, id, data)  // Editar label
toggleTipificacionActivo(nivel, id)  // Activar/Desactivar
```

---

## UI/UX

### Layout

```
┌─────────────────────────────────────────────────┐
│  DashboardHeader                                │
├──────────────────────┬──────────────────────────┤
│                      │                          │
│  Arbol N1→N2         │  Lista N3                │
│  (2 columnas)        │  (1 columna)             │
│                      │                          │
│  ┌─ N1               │  ┌─ N3 Item             │
│  │  ├─ N2            │  │  [badge] [edit] [⚡] │
│  │  ├─ N2            │  └─────────────────      │
│  │  [badge] [+] [✏] │                          │
│  └───────────────    │  ┌─ N3 Item             │
│                      │  │  [badge] [edit] [⚡] │
│                      │  └─────────────────      │
└──────────────────────┴──────────────────────────┘
```

### Colores Corporativos

```css
Verde primario: #1b967a  /* Botones principales */
Azul navy:      #192c4d  /* Titulos */
Amarillo:       #fbde17  /* (no usado en este modulo) */

Badge en uso:   bg-blue-100 text-blue-700
Badge sin uso:  bg-gray-100 text-gray-600
```

### Iconos

| Icono | Uso |
|-------|-----|
| `Layers` | Icono principal del modulo |
| `ChevronDown/Right` | Acordeones N1 |
| `Plus` | Agregar nuevo |
| `Edit` | Editar label |
| `Power` | Activar/Desactivar |
| `Users` | Badge de conteo de uso |
| `Tag` | Seccion N3 |
| `Loader2` | Estados de carga |
| `Check` | Mensaje de exito |
| `AlertCircle` | Mensaje de error |

---

## Flujo de Usuario

### Crear Nueva Tipificacion N1

1. Admin hace clic en "Nuevo N1"
2. Modal se abre con form codigo + label
3. Admin completa campos
4. Click "Crear"
5. Validacion de codigo unico
6. Insercion en `tipificaciones_nivel_1`
7. Recarga de datos
8. Mensaje de exito

### Editar Label de N2

1. Admin hace clic en icono lapiz de un N2
2. Modal se abre con label actual
3. Admin edita label
4. Click "Guardar"
5. Actualizacion en `tipificaciones_nivel_2`
6. Recarga de datos
7. Mensaje de exito

### Intentar Desactivar Item en Uso

1. Admin hace clic en icono Power de item con uso_count > 0
2. Sistema valida conteo con RPC function
3. Error: "No se puede desactivar: 150 lead(s) la estan usando"
4. Mensaje de error mostrado
5. Operacion cancelada

---

## Seguridad

### Autenticacion
- Verificacion de `user.rol === 'admin'` en useEffect
- Redirect a `/operativo` si no es admin

### Server Actions
- Todas las actions usan `createServerClient` con cookies
- Validacion de auth en cada action:
  ```typescript
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'No autenticado' };
  }
  ```

### RLS Policies
- Tablas `tipificaciones_nivel_*` protegidas con RLS
- Solo authenticated users pueden leer
- Solo admins pueden insertar/actualizar

---

## Mensajes del Sistema

### Mensajes de Exito
- "Nivel 1 creado exitosamente"
- "Nivel 2 creado exitosamente"
- "Nivel 3 creado exitosamente"
- "Tipificacion actualizada"
- "Tipificacion activada"
- "Tipificacion desactivada"

### Mensajes de Error
- "Codigo y label son obligatorios"
- "Todos los campos son obligatorios"
- "El codigo 'XXX' ya existe"
- "No se puede desactivar: X lead(s) la estan usando"
- "Error inesperado"

---

## Integracion con Otros Modulos

### Dashboard Operativo
- Al crear/editar tipificaciones, se revalida `/operativo`
- Dropdowns de tipificacion se actualizan automaticamente

### Configuracion Kanban
- Al crear N2, se revalida `/configuracion-kanban`
- Nuevas combinaciones N1+N2 disponibles para mapeo

---

## Performance

### Optimizaciones
- Count queries usan `{ count: 'exact', head: true }` (no traen datos)
- Indices en campos `tipificacion_nivel_*` en tabla leads
- RPC function usa SECURITY DEFINER para bypass RLS

### Tiempos Estimados
- Load inicial: ~200-500ms
- Create operation: ~100-200ms
- Toggle operation: ~150-300ms

---

## Testing

### Casos de Prueba

1. **Admin puede acceder**
   - Login como admin → navegar a `/configuracion-tipificaciones`
   - Resultado: Pagina carga correctamente

2. **No-admin NO puede acceder**
   - Login como vendedor → navegar a `/configuracion-tipificaciones`
   - Resultado: Redirect a `/operativo`

3. **Crear N1 duplicado**
   - Crear N1 con codigo existente
   - Resultado: Error "El codigo 'XXX' ya existe"

4. **Desactivar item en uso**
   - Intentar desactivar N2 con uso_count > 0
   - Resultado: Error "No se puede desactivar: X lead(s) la estan usando"

5. **Crear N2 bajo N1**
   - Expandir N1 → Click (+) → Completar form → Crear
   - Resultado: N2 aparece bajo el N1 correspondiente

---

## Proximas Mejoras

### v1.1 (Futuro)
- [ ] Drag & drop para reordenar
- [ ] Bulk operations (activar/desactivar multiples)
- [ ] Exportar configuracion a JSON
- [ ] Importar configuracion desde JSON
- [ ] Historial de cambios (audit log)

### v2.0 (Futuro)
- [ ] Colores personalizados por tipificacion
- [ ] Iconos personalizados
- [ ] Reglas de auto-tipificacion (IA)

---

## Notas de Desarrollo

### Decisiones de Diseno

1. **Por que separar N3 del arbol?**
   - N3 es independiente, no tiene jerarquia
   - UI mas clara mostrando dos estructuras distintas

2. **Por que no permitir desactivar items en uso?**
   - Integridad referencial
   - Evitar leads con tipificaciones "fantasma"

3. **Por que modal en vez de inline editing?**
   - Mejor UX en mobile
   - Foco en la accion
   - Validacion centralizada

---

## Changelog

### v1.0 - 24 Diciembre 2025
- Creacion inicial del modulo
- CRUD completo para N1, N2, N3
- Validacion de uso antes de desactivar
- Conteo de leads por tipificacion
- Integracion con Sidebar

---

**Ultima Actualizacion:** 24 Diciembre 2025
**Mantenedor:** Admin EcoPlaza
**Status:** Produccion
