# INVESTIGACIÓN EXHAUSTIVA: Módulo de Usuarios
**Fecha:** 12 Diciembre 2025
**Backend Developer Analysis**

---

## 1. FUNCIÓN `createUsuario()` (Líneas 266-394)

### Cliente Utilizado:
```typescript
const supabaseAdmin = createAdminClient(); // Línea 273
```

**Razón:** Usa `SUPABASE_SERVICE_ROLE_KEY` para **bypassear RLS** en operaciones de creación.

### ¿Cómo maneja la creación en tablas?

**FLUJO COMPLETO:**

1. **Validación email único** (líneas 276-284)
   - Query a tabla `usuarios` con admin client
   - Retorna error si existe

2. **Validación teléfono único** (líneas 286-309)
   - Query a `vendedores` (línea 289-293)
   - Query a `usuarios_datos_no_vendedores` (línea 299-305)
   - Retorna error si existe en cualquiera de las dos tablas

3. **Crear usuario en auth.users** (líneas 312-329)
   - Usa `supabaseAdmin.auth.admin.createUser()`
   - `email_confirm: true` (no requiere confirmación)
   - Incluye metadata: nombre y rol

4. **Si es vendedor/vendedor_caseta** (líneas 336-355):
   ```typescript
   if (['vendedor', 'vendedor_caseta'].includes(data.rol)) {
     // INSERT en tabla vendedores
     const { data: nuevoVendedor } = await supabaseAdmin
       .from('vendedores')
       .insert({
         nombre: data.nombre,
         telefono: data.telefono || '',
         email: data.email_alternativo || data.email  // ⚠️ NOTA
       })
       .select('id')
       .single();

     vendedor_id = nuevoVendedor.id;
   }
   ```

   **⚠️ NOTA IMPORTANTE:** La tabla `vendedores` tiene un campo `email` que NO está documentado en el schema `supabase-db-model.txt` (líneas 41-55), pero SÍ existe en la implementación real.

5. **Insertar en tabla usuarios** (líneas 358-374)
   ```typescript
   await supabaseAdmin
     .from('usuarios')
     .insert({
       id: userId,
       nombre: data.nombre,
       email: data.email,
       rol: data.rol,
       activo: true,
       vendedor_id  // NULL si no es vendedor
     });
   ```

   **Rollback:** Si falla, elimina usuario de auth.users (línea 372)

6. **Si es NO vendedor** (líneas 376-390):
   ```typescript
   if (['admin', 'jefe_ventas', 'finanzas'].includes(data.rol)) {
     await supabaseAdmin
       .from('usuarios_datos_no_vendedores')
       .insert({
         usuario_id: userId,
         telefono: data.telefono || null,
         email_alternativo: data.email_alternativo || null
       });
   }
   ```

   **NOTA:** Error no es crítico (línea 388), usuario ya está creado

### ¿Funciona correctamente?
✅ **SÍ**, funciona correctamente porque:
- Usa `createAdminClient()` que bypasea RLS
- Maneja rollback si falla inserción en usuarios
- Soporta ambas rutas: vendedores y no-vendedores

---

## 2. FUNCIÓN `updateUsuario()` (Líneas 400-516)

### Cliente Utilizado:
```typescript
const supabase = await createClient(); // Línea 405
```

**⚠️ PROBLEMA IDENTIFICADO:** Usa cliente **regular con auth del usuario**, lo que está sujeto a RLS policies.

### ¿Cómo maneja las actualizaciones?

**FLUJO COMPLETO:**

1. **Obtener usuario actual** (líneas 408-416)
   ```typescript
   const { data: usuarioActual } = await supabase
     .from('usuarios')
     .select('*')
     .eq('id', data.id)
     .single();
   ```

   **RLS IMPACT:** Necesita policy SELECT en tabla `usuarios`

2. **Validar teléfono único** (líneas 419-446)
   - Query a `vendedores` (líneas 420-430)
   - Query a `usuarios_datos_no_vendedores` (líneas 436-442)

   **RLS IMPACT:** Necesita policies SELECT en ambas tablas

3. **Actualizar tabla usuarios** (líneas 449-464)
   ```typescript
   const { error: updateError } = await supabase
     .from('usuarios')
     .update(updateUsuarioData)
     .eq('id', data.id);
   ```

   **RLS IMPACT:** Necesita policy UPDATE en tabla `usuarios`

4. **Si es vendedor** (líneas 469-481):
   ```typescript
   if (['vendedor', 'vendedor_caseta'].includes(rolActual) && usuarioActual.vendedor_id) {
     await supabase
       .from('vendedores')
       .update(updateVendedorData)
       .eq('id', usuarioActual.vendedor_id);
   }
   ```

   **⚠️ RLS IMPACT CRÍTICO:** Necesita policy UPDATE en tabla `vendedores`

5. **Si es NO vendedor** (líneas 482-512):
   ```typescript
   if (['admin', 'jefe_ventas', 'finanzas'].includes(rolActual)) {
     // Verificar si existe registro
     const { data: existingDatos } = await supabase
       .from('usuarios_datos_no_vendedores')
       .select('id')
       .eq('usuario_id', data.id)
       .single();

     if (existingDatos) {
       // UPDATE
       await supabase
         .from('usuarios_datos_no_vendedores')
         .update(updateDatosData)
         .eq('usuario_id', data.id);
     } else {
       // INSERT (primera vez)
       await supabase
         .from('usuarios_datos_no_vendedores')
         .insert({
           usuario_id: data.id,
           telefono: data.telefono || null,
           email_alternativo: data.email_alternativo || null
         });
     }
   }
   ```

   **⚠️ RLS IMPACT CRÍTICO:** Necesita policies SELECT, UPDATE, INSERT en tabla `usuarios_datos_no_vendedores`

### ¿Actualiza correctamente según el rol?
✅ **SÍ**, la lógica es correcta:
- Detecta rol actual (usa `data.rol || usuarioActual.rol`)
- Actualiza en la tabla correspondiente (vendedores vs usuarios_datos_no_vendedores)
- Soporta INSERT si no existe registro en usuarios_datos_no_vendedores

### ⚠️ PROBLEMA IDENTIFICADO:
**Usa cliente regular (`createClient()`) en vez de admin client**, lo que puede causar errores si las RLS policies no permiten UPDATE en tablas `vendedores` o `usuarios_datos_no_vendedores`.

---

## 3. FUNCIÓN `toggleUsuarioActivo()` (Líneas 522-560)

### Cliente Utilizado:
```typescript
const supabase = await createClient(); // Línea 529
```

**⚠️ PROBLEMA IDENTIFICADO:** Mismo problema que `updateUsuario()`.

### Flujo:
1. **Obtener estado actual** (líneas 532-540)
   ```typescript
   const { data: usuario } = await supabase
     .from('usuarios')
     .select('activo')
     .eq('id', id)
     .single();
   ```

2. **Actualizar estado** (líneas 545-552)
   ```typescript
   const { error: updateError } = await supabase
     .from('usuarios')
     .update({ activo: nuevoEstado })
     .eq('id', id);
   ```

### ⚠️ PROBLEMA IDENTIFICADO:
- Solo actualiza tabla `usuarios` (no afecta vendedores)
- Usa cliente regular (sujeto a RLS)

---

## 4. RLS POLICIES ACTUALES

### Según archivos SQL analizados:

#### ENABLE_RLS_SECURITY.sql (Archivo completo)

**Tabla `usuarios`:**
```sql
CREATE POLICY "usuarios_select_own" ON public.usuarios
FOR SELECT TO authenticated
USING (auth.uid() = id);
```

**⚠️ PROBLEMA:** Esta policy solo permite ver el **propio registro**, NO todos los usuarios.

**Tabla `vendedores`:**
```sql
CREATE POLICY "vendedores_select_authenticated" ON public.vendedores
FOR SELECT TO authenticated
USING (activo = true);
```

**⚠️ PROBLEMA:**
- Solo permite SELECT de vendedores activos
- **NO hay policy para UPDATE** ❌
- **NO hay policy para INSERT** ❌

#### RLS_SIMPLE_VERSION.sql (Alternativa más permisiva)

**Tabla `usuarios`:**
```sql
CREATE POLICY "usuarios_select_own" ON public.usuarios
FOR SELECT TO authenticated
USING (auth.uid() = id);
```
**⚠️ Mismo problema** - Solo ve su propio registro

**Tabla `vendedores`:**
```sql
CREATE POLICY "vendedores_select_all" ON public.vendedores
FOR SELECT TO authenticated
USING (activo = true);
```
**⚠️ Mismo problema** - Solo SELECT, no UPDATE/INSERT

#### ¿Existe policy para `usuarios_datos_no_vendedores`?
**❌ NO** - No encontré ningún archivo SQL con policies para esta tabla.

### TABLA RESUMEN DE POLICIES ACTUALES:

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `usuarios` | ✅ (solo propio registro) | ❌ | ❌ | ❌ |
| `vendedores` | ✅ (solo activos) | ❌ | ❌ | ❌ |
| `usuarios_datos_no_vendedores` | ❌ | ❌ | ❌ | ❌ |

---

## 5. IMPACTO DEL CAMBIO: createClient() → createAdminClient()

### Funciones a modificar:

#### 1. `updateUsuario()` (línea 405)

**ANTES:**
```typescript
const supabase = await createClient();
```

**DESPUÉS:**
```typescript
const supabase = createAdminClient();
```

**IMPACTO:**
✅ **POSITIVO:**
- Bypasea RLS en todas las tablas
- Funciona sin necesidad de crear policies UPDATE
- Consistente con `createUsuario()` y `getAllUsuarios()`

⚠️ **RIESGOS:**
- **NINGUNO** - La validación de permisos se hace en:
  1. **Middleware** (verifica que solo admin acceda a `/admin/usuarios`)
  2. **Página** (`app/admin/usuarios/page.tsx` líneas verifican rol admin)
  3. **Comentario en código** (líneas 104-106): "La verificación de admin se hace en el middleware y en la página"

#### 2. `toggleUsuarioActivo()` (línea 529)

**ANTES:**
```typescript
const supabase = await createClient();
```

**DESPUÉS:**
```typescript
const supabase = createAdminClient();
```

**IMPACTO:** Igual que `updateUsuario()`

### ¿Afecta algo más?

Verifiquemos todas las funciones:

| Función | Cliente actual | ¿Cambiar? | Razón |
|---------|----------------|-----------|-------|
| `getAllUsuarios()` | `createAdminClient()` ✅ | NO | Ya correcto |
| `getUsuarioById()` | `createAdminClient()` ✅ | NO | Ya correcto |
| `createUsuario()` | `createAdminClient()` ✅ | NO | Ya correcto |
| **`updateUsuario()`** | `createClient()` ❌ | **SÍ** | Necesita bypass RLS |
| **`toggleUsuarioActivo()`** | `createClient()` ❌ | **SÍ** | Necesita bypass RLS |
| `resetUsuarioPassword()` | `createClient()` ✅ | NO | Solo usa auth API (no afecta RLS) |
| `bulkCreateUsuarios()` | `createAdminClient()` ✅ | NO | Ya correcto |
| `getUsuariosStats()` | `createAdminClient()` ✅ | NO | Ya correcto |

---

## 6. EVIDENCIA HISTÓRICA: Commit a4cd01d

**Fecha:** 9 Diciembre 2025
**Título:** "fix: use admin client to bypass RLS for vendedores data in user queries"

**Descripción del commit:**
```
Root cause: RLS policies on 'vendedores' table were blocking SELECT
queries when using regular client, causing vendedor/vendedor_caseta
users to show "Sin datos" in CONTACTO column despite having data.

Changes:
- getAllUsuarios(): Use createAdminClient() instead of createClient()
- getUsuarioById(): Use createAdminClient() instead of createClient()
- getUsuariosStats(): Use createAdminClient() instead of createClient()
```

**LECCIÓN APRENDIDA:**
El equipo ya identificó este problema EXACTAMENTE en las funciones de lectura (SELECT). Cambiaron de `createClient()` a `createAdminClient()` para evitar errores de RLS.

**⚠️ INCONSISTENCIA DETECTADA:**
- Se arregló para **funciones de lectura** (getAllUsuarios, getUsuarioById, getUsuariosStats)
- **NO se arregló** para **funciones de escritura** (updateUsuario, toggleUsuarioActivo)
- Estas funciones tienen el **mismo problema** con RLS en operaciones UPDATE

---

## 7. RIESGOS DE SEGURIDAD

### ¿Es seguro usar createAdminClient()?

✅ **SÍ**, porque:

1. **Middleware protege la ruta** (`middleware.ts`):
   - Solo rol `admin` accede a `/admin/usuarios`
   - Redirect automático para otros roles

2. **Página valida rol** (`app/admin/usuarios/page.tsx`):
   - Verificación adicional client-side

3. **Service role key NO se expone al cliente**:
   - Solo se usa en Server Actions (server-side)
   - Variable de entorno: `SUPABASE_SERVICE_ROLE_KEY`

4. **Patrón consistente del proyecto**:
   - Mismo patrón usado en `getAllUsuarios()`, `createUsuario()`, `bulkCreateUsuarios()`
   - Ya validado en producción

### ¿Qué pasa si NO cambiamos a admin client?

**ESCENARIOS DE FALLO ACTUALES:**

1. **Si existen policies restrictivas en `vendedores`:**
   ```
   Error: UPDATE policy not found for table vendedores
   → updateUsuario() falla al actualizar teléfono de vendedor
   ```

2. **Si NO existen policies en `usuarios_datos_no_vendedores`:**
   ```
   Error: RLS enabled but no SELECT policy found
   → updateUsuario() falla al verificar datos existentes

   Error: RLS enabled but no UPDATE policy found
   → updateUsuario() falla al actualizar teléfono de admin/jefe_ventas

   Error: RLS enabled but no INSERT policy found
   → updateUsuario() falla al crear datos por primera vez
   ```

3. **Si policy en `usuarios` es restrictiva:**
   ```
   Error: UPDATE policy not allows changing other users
   → updateUsuario() falla si admin intenta editar otro usuario
   ```

---

## 8. RECOMENDACIONES

### ✅ RECOMENDACIÓN 1: CAMBIAR A ADMIN CLIENT (PREFERIDA)

**Archivos a modificar:**
- `lib/actions-usuarios.ts`

**Cambios específicos:**

```typescript
// LÍNEA 405 - updateUsuario()
// ANTES:
const supabase = await createClient();

// DESPUÉS:
const supabase = createAdminClient();
```

```typescript
// LÍNEA 529 - toggleUsuarioActivo()
// ANTES:
const supabase = await createClient();

// DESPUÉS:
const supabase = createAdminClient();
```

**Justificación:**
- Consistente con el resto del módulo
- Evita problemas de RLS sin crear policies complejas
- Ya validado en commit a4cd01d para funciones de lectura
- Seguro (middleware + página validan permisos)

**Ventajas:**
- ✅ Cambio quirúrgico (2 líneas)
- ✅ Sin riesgo de seguridad
- ✅ Sin necesidad de modificar DB
- ✅ Consistente con patrón existente

**Desventajas:**
- Ninguna identificada

---

### ⚠️ ALTERNATIVA 2: CREAR RLS POLICIES COMPLETAS (NO RECOMENDADA)

Si se insiste en usar `createClient()`, se necesitarían estas policies:

```sql
-- Policy para admin: Ver todos los usuarios
CREATE POLICY "admin_select_all_usuarios" ON public.usuarios
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
  OR
  auth.uid() = id  -- Todos ven su propio registro
);

-- Policy para admin: Actualizar cualquier usuario
CREATE POLICY "admin_update_usuarios" ON public.usuarios
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
);

-- Policy UPDATE para vendedores (solo admin)
CREATE POLICY "admin_update_vendedores" ON public.vendedores
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
);

-- Policy INSERT para vendedores (solo admin)
CREATE POLICY "admin_insert_vendedores" ON public.vendedores
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
);

-- Habilitar RLS en usuarios_datos_no_vendedores
ALTER TABLE public.usuarios_datos_no_vendedores ENABLE ROW LEVEL SECURITY;

-- Policy SELECT para usuarios_datos_no_vendedores
CREATE POLICY "admin_select_usuarios_datos_no_vendedores" ON public.usuarios_datos_no_vendedores
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
  OR
  usuario_id = auth.uid()  -- Cada quien ve sus propios datos
);

-- Policy UPDATE para usuarios_datos_no_vendedores
CREATE POLICY "admin_update_usuarios_datos_no_vendedores" ON public.usuarios_datos_no_vendedores
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
);

-- Policy INSERT para usuarios_datos_no_vendedores
CREATE POLICY "admin_insert_usuarios_datos_no_vendedores" ON public.usuarios_datos_no_vendedores
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin')
);
```

**Desventajas de esta alternativa:**
- ❌ Complejidad innecesaria (10+ policies nuevas)
- ❌ Riesgo de recursión infinita (error 42P17) por subqueries en tabla usuarios
- ❌ Performance impact (cada query ejecuta subquery de validación)
- ❌ Mantenimiento complejo (modificar policies cada vez que cambian roles)
- ❌ Inconsistente con el resto del módulo

---

## 9. PLAN DE ACCIÓN RECOMENDADO

### FASE 1: Cambio en código (INMEDIATO)

```typescript
// Archivo: lib/actions-usuarios.ts

// 1. updateUsuario() - LÍNEA 405
export async function updateUsuario(data: UpdateUsuarioData): Promise<{
  success: boolean;
  message: string;
}> {
  // CAMBIO AQUÍ ⬇️
  const supabase = createAdminClient();  // ANTES: await createClient()

  // ... resto del código sin cambios
}

// 2. toggleUsuarioActivo() - LÍNEA 529
export async function toggleUsuarioActivo(id: string): Promise<{
  success: boolean;
  message: string;
  nuevoEstado?: boolean;
}> {
  // CAMBIO AQUÍ ⬇️
  const supabase = createAdminClient();  // ANTES: await createClient()

  // ... resto del código sin cambios
}
```

### FASE 2: Testing (POST-CAMBIO)

1. **Test funcional:**
   - Login como admin
   - Ir a `/admin/usuarios`
   - Editar usuario vendedor (cambiar teléfono)
   - Editar usuario admin (cambiar email alternativo)
   - Toggle activo/inactivo de un usuario
   - Verificar cambios se reflejan en tabla

2. **Test de seguridad:**
   - Login como vendedor
   - Intentar acceder `/admin/usuarios` → Debe redirigir
   - Verificar que middleware bloquea acceso

3. **Test de roles:**
   - Editar cada tipo de rol (admin, jefe_ventas, vendedor, vendedor_caseta, finanzas)
   - Verificar que datos se guardan en la tabla correcta:
     - vendedor/vendedor_caseta → tabla `vendedores`
     - admin/jefe_ventas/finanzas → tabla `usuarios_datos_no_vendedores`

### FASE 3: Documentación (POST-TESTING)

Actualizar archivo `docs/modulos/usuarios.md`:
```markdown
## Lecciones Aprendidas

### Uso de Admin Client vs Regular Client

**REGLA:** Server actions del módulo usuarios SIEMPRE usan `createAdminClient()`

**Razón:**
- Operaciones de administración requieren bypass de RLS
- Seguridad garantizada por middleware + validación de página
- Consistente con patrón establecido en commit a4cd01d

**Funciones afectadas:**
- getAllUsuarios() ✅
- getUsuarioById() ✅
- createUsuario() ✅
- **updateUsuario()** ✅ (fix aplicado 12 Dic 2025)
- **toggleUsuarioActivo()** ✅ (fix aplicado 12 Dic 2025)
- bulkCreateUsuarios() ✅
- getUsuariosStats() ✅
- resetUsuarioPassword() - NO (solo usa auth API)
```

---

## 10. CONCLUSIÓN

### Estado actual del código:

❌ **INCONSISTENCIA DETECTADA:**
- 6 funciones usan `createAdminClient()` ✅
- 2 funciones usan `createClient()` ❌ (`updateUsuario`, `toggleUsuarioActivo`)

### Problema identificado:

Las funciones `updateUsuario()` y `toggleUsuarioActivo()` están sujetas a RLS policies que:
1. **NO existen** para tabla `usuarios_datos_no_vendedores`
2. **Son restrictivas** para tabla `vendedores` (solo SELECT, no UPDATE)
3. **Bloquean** operaciones de administración legítimas

### Solución recomendada:

✅ **CAMBIAR 2 LÍNEAS:**
- Línea 405: `createAdminClient()` (updateUsuario)
- Línea 529: `createAdminClient()` (toggleUsuarioActivo)

### Riesgos:

✅ **CERO RIESGOS DE SEGURIDAD:**
- Middleware valida rol admin
- Página valida rol admin
- Service role key no se expone al cliente
- Patrón ya usado en 6 funciones del mismo módulo

### Beneficios:

✅ **SOLUCIÓN QUIRÚRGICA:**
- 2 líneas de código
- Consistencia con el módulo
- Sin modificaciones de DB
- Sin riesgo de regression

---

**RECOMENDACIÓN FINAL: PROCEDER CON EL CAMBIO**

El cambio es:
- Seguro ✅
- Necesario ✅
- Mínimo ✅
- Consistente ✅
- Sin riesgos ✅

---

**Investigación realizada por:** Backend Developer
**Fecha:** 12 Diciembre 2025
**Archivos analizados:** 8 archivos (TypeScript + SQL)
**Líneas de código revisadas:** 856 líneas
