# SESION 97 - Filtro de Usuarios con Reuniones

**Fecha:** 2026-01-16
**Tipo:** Backend + Frontend
**Estado:** Implementado

---

## PROBLEMA

El combobox "Ver reuniones de" en el modulo de Reuniones mostraba TODOS los usuarios activos del sistema, incluso aquellos que nunca han creado reuniones. Esto generaba confusion y ruido en la UI.

**Ejemplo:**
- Sistema con 24 usuarios activos
- Solo 3 usuarios han creado reuniones
- Combobox mostraba los 24 usuarios

---

## SOLUCION IMPLEMENTADA

### Backend: Endpoint `/api/usuarios`

**Archivo:** `app/api/usuarios/route.ts`

#### Nuevos Query Params

```typescript
GET /api/usuarios?activos_only=true&con_reuniones=true&proyecto_id=UUID
```

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `activos_only` | boolean | No | Solo usuarios activos (default: true) |
| `rol` | string | No | Filtrar por rol especifico |
| `con_reuniones` | boolean | No | Solo usuarios con reuniones creadas |
| `proyecto_id` | string | Si (si con_reuniones=true) | ID del proyecto para filtrar reuniones |

#### Logica de Filtrado

```typescript
// PASO 1: Obtener IDs unicos de creadores de reuniones en el proyecto
const { data: reunionesData } = await supabase
  .from('reuniones')
  .select('created_by')
  .eq('proyecto_id', proyectoId)
  .not('created_by', 'is', null);

// Extraer IDs unicos
const creatorsIds = Array.from(
  new Set(reunionesData?.map(r => r.created_by).filter(Boolean) || [])
);

// PASO 2: Obtener usuarios por IDs
const { data: usuariosData } = await supabase
  .from('usuarios')
  .select('id, nombre, email, rol, activo')
  .in('id', creatorsIds);

// PASO 3: Aplicar filtros adicionales (activos, rol)
// PASO 4: Ordenar por nombre
```

#### Validacion

- Si `con_reuniones=true` pero no hay `proyecto_id`, retorna **400 Bad Request**
- Si no hay creadores en el proyecto, retorna lista vacia (200 OK)

---

### Frontend: `ReunionFiltros.tsx`

**Archivo:** `components/reuniones/ReunionFiltros.tsx`

#### Cambios Implementados

1. **Obtener `selectedProyecto` del contexto de auth:**

```typescript
const { user, selectedProyecto } = useAuth();
```

2. **Actualizar fetch con nuevos parametros:**

```typescript
const response = await fetch(
  `/api/usuarios?activos_only=true&con_reuniones=true&proyecto_id=${selectedProyecto.id}`
);
```

3. **Agregar `selectedProyecto` a dependencias del useEffect:**

```typescript
useEffect(() => {
  if (!esAdminRol || !selectedProyecto) return;
  // ... fetch usuarios
}, [esAdminRol, selectedProyecto]);
```

---

## SQL GENERADO (CONCEPTUAL)

Aunque usamos el cliente de Supabase, la query equivalente seria:

```sql
-- Obtener usuarios que han creado reuniones en un proyecto
SELECT DISTINCT u.id, u.nombre, u.email, u.rol, u.activo
FROM usuarios u
INNER JOIN reuniones r ON r.created_by = u.id
WHERE r.proyecto_id = :proyecto_id
  AND r.created_by IS NOT NULL
  AND u.activo = true  -- si activos_only=true
ORDER BY u.nombre ASC;
```

---

## BENEFICIOS

1. **UX Mejorado:** Solo se muestran usuarios relevantes en el combobox
2. **Performance:** Menos datos transferidos al frontend
3. **Claridad:** Usuarios sin reuniones no generan confusion
4. **Escalabilidad:** Funciona correctamente con 100+ usuarios

---

## ARCHIVOS MODIFICADOS

```
app/api/usuarios/route.ts
components/reuniones/ReunionFiltros.tsx
```

---

## TESTING

### Caso 1: Usuario sin reuniones
```bash
# Usuario "Leo Vendedor" (UUID: abc123) sin reuniones
GET /api/usuarios?con_reuniones=true&proyecto_id=proyecto-pruebas

# Response:
{
  "success": true,
  "usuarios": [],  # Leo NO aparece
  "total": 0
}
```

### Caso 2: Usuario con reuniones
```bash
# Usuario "Alonso Admin" (UUID: xyz789) con 3 reuniones
GET /api/usuarios?con_reuniones=true&proyecto_id=proyecto-pruebas

# Response:
{
  "success": true,
  "usuarios": [
    { "id": "xyz789", "nombre": "Alonso Admin", ... }
  ],
  "total": 1
}
```

### Caso 3: Sin proyecto_id (error)
```bash
GET /api/usuarios?con_reuniones=true

# Response (400):
{
  "success": false,
  "error": "proyecto_id es requerido cuando con_reuniones=true",
  "usuarios": []
}
```

---

## CONSIDERACIONES

1. **Proyecto Global:** Las reuniones son globales, pero se filtran por proyecto_id del usuario actual
2. **Cache:** El frontend NO cachea la lista (se recarga al cambiar de proyecto)
3. **Permisos:** Solo roles `superadmin`, `admin`, `gerencia` ven este filtro
4. **Orden:** Usuarios ordenados alfabeticamente por nombre

---

## NEXT STEPS (OPCIONALES)

1. Agregar contador de reuniones por usuario en la UI
2. Cachear lista de usuarios con TTL de 5 minutos
3. Agregar filtro de rango de fechas (solo usuarios con reuniones en X periodo)
4. Implementar pagination si hay 100+ creadores

---

**Commit Message:**
```
feat(reuniones): filtrar usuarios con reuniones en combobox

- Agregar parametro con_reuniones al endpoint /api/usuarios
- Validar proyecto_id requerido cuando con_reuniones=true
- Actualizar ReunionFiltros para usar selectedProyecto
- Solo mostrar usuarios que han creado al menos 1 reunion
```
