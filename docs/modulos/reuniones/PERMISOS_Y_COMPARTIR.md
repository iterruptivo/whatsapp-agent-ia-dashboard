# Sistema de Permisos y Compartir - Módulo Reuniones

> Documentación del sistema de permisos y compartir para reuniones

---

## Campos de Base de Datos (a agregar en migración)

```sql
ALTER TABLE reuniones
ADD COLUMN es_publico BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN link_token TEXT UNIQUE,
ADD COLUMN usuarios_permitidos UUID[],
ADD COLUMN roles_permitidos TEXT[];

-- Índice para búsqueda por token
CREATE INDEX idx_reuniones_link_token ON reuniones(link_token) WHERE link_token IS NOT NULL;

-- Índice para búsqueda por permisos de usuario
CREATE INDEX idx_reuniones_usuarios_permitidos ON reuniones USING GIN(usuarios_permitidos);

-- Índice para búsqueda por permisos de rol
CREATE INDEX idx_reuniones_roles_permitidos ON reuniones USING GIN(roles_permitidos);
```

---

## Lógica de Permisos

### Ver Reunión (SELECT)

Un usuario **PUEDE VER** una reunión si cumple **CUALQUIERA** de estas condiciones:

1. **Es superadmin/admin/gerencia** → Ve TODAS las reuniones
2. **Es creador** → `created_by = user.id`
3. **Está en usuarios permitidos** → `user.id IN usuarios_permitidos`
4. **Su rol está en roles permitidos** → `user.rol IN roles_permitidos`
5. **Accede por link público** → `es_publico = true` AND `link_token` válido

```typescript
// Ejemplo de validación
const puedeVer =
  esAdminRol ||
  reunion.created_by === user.id ||
  reunion.usuarios_permitidos?.includes(user.id) ||
  reunion.roles_permitidos?.includes(user.rol);
```

### Crear Reunión (INSERT)

Solo pueden crear reuniones:

- ✅ `superadmin`
- ✅ `admin`
- ✅ `gerencia`
- ❌ Otros roles: **BLOQUEADOS**

### Modificar Permisos/Compartir

Solo pueden modificar permisos o compartir:

- **Creador de la reunión** (`created_by = user.id`)
- **Admin/Superadmin/Gerencia**

---

## Server Actions Implementadas

### 1. `compartirReunion(reunionId: string)`

**Función:** Activa el compartir público y genera un link único

**Retorna:**

```typescript
{
  success: boolean;
  token?: string;          // Token generado (64 caracteres hex)
  shareUrl?: string;       // URL completa para compartir
  error?: string;
}
```

**Ejemplo de uso:**

```typescript
const result = await compartirReunion('uuid-reunion');
if (result.success) {
  console.log('Link para compartir:', result.shareUrl);
  // URL: https://dashboard.ecoplaza.com/reuniones/compartida/abc123...
}
```

---

### 2. `desactivarCompartir(reunionId: string)`

**Función:** Desactiva el compartir público (el link deja de funcionar)

**Retorna:**

```typescript
{
  success: boolean;
  error?: string;
}
```

**Ejemplo de uso:**

```typescript
const result = await desactivarCompartir('uuid-reunion');
if (result.success) {
  console.log('Compartir desactivado');
}
```

---

### 3. `regenerarLinkToken(reunionId: string)`

**Función:** Invalida el link anterior y genera uno nuevo

**Uso:** Cuando el link fue compartido con alguien no autorizado y necesitas revocarlo

**Retorna:**

```typescript
{
  success: boolean;
  token?: string;          // Nuevo token generado
  shareUrl?: string;       // Nueva URL
  error?: string;
}
```

**Ejemplo de uso:**

```typescript
const result = await regenerarLinkToken('uuid-reunion');
if (result.success) {
  console.log('Nuevo link:', result.shareUrl);
  // El link anterior YA NO funciona
}
```

---

### 4. `actualizarPermisosReunion(reunionId, params)`

**Función:** Actualiza quién puede ver la reunión

**Parámetros:**

```typescript
{
  usuarios_permitidos?: string[];  // Array de UUIDs
  roles_permitidos?: string[];     // Array de roles
}
```

**Retorna:**

```typescript
{
  success: boolean;
  error?: string;
}
```

**Ejemplos de uso:**

```typescript
// Permitir acceso a usuarios específicos
await actualizarPermisosReunion('uuid-reunion', {
  usuarios_permitidos: ['uuid-user-1', 'uuid-user-2', 'uuid-user-3'],
});

// Permitir acceso a roles específicos
await actualizarPermisosReunion('uuid-reunion', {
  roles_permitidos: ['jefe_ventas', 'vendedor'],
});

// Combinar ambos
await actualizarPermisosReunion('uuid-reunion', {
  usuarios_permitidos: ['uuid-user-1'],
  roles_permitidos: ['finanzas'],
});

// Remover todos los permisos (solo creador y admins ven)
await actualizarPermisosReunion('uuid-reunion', {
  usuarios_permitidos: [],
  roles_permitidos: [],
});
```

---

### 5. `getReunionPorToken(token: string)`

**Función:** Obtener reunión mediante link público (sin autenticación)

**Retorna:**

```typescript
{
  success: boolean;
  data?: {
    reunion: Reunion;
    actionItems: ReunionActionItem[];
  };
  error?: string;
}
```

**Ejemplo de uso:**

```typescript
// En página pública /reuniones/compartida/[token]
const result = await getReunionPorToken(params.token);
if (result.success) {
  console.log('Reunión:', result.data.reunion);
  console.log('Action Items:', result.data.actionItems);
}
```

---

### 6. `getReuniones(params)` - MODIFICADA

**Cambios:** Agregado filtro `created_by_filter` y lógica de permisos

**Nuevo parámetro:**

```typescript
created_by_filter?: 'mine' | 'all' | string;
```

- `'mine'` → Solo reuniones creadas por mí
- `'all'` → Todas las reuniones que tengo permiso de ver
- `UUID` → Reuniones creadas por usuario específico

**Ejemplo de uso:**

```typescript
// Ver solo mis reuniones
const misReuniones = await getReuniones({
  created_by_filter: 'mine',
  proyecto_id: 'uuid-proyecto',
});

// Ver todas las reuniones disponibles
const todasReuniones = await getReuniones({
  created_by_filter: 'all',
  proyecto_id: 'uuid-proyecto',
});

// Ver reuniones de un usuario específico (solo admins)
const reunionesUsuario = await getReuniones({
  created_by_filter: 'uuid-user-123',
  proyecto_id: 'uuid-proyecto',
});
```

---

### 7. `getReunionDetalle(reunionId)` - MODIFICADA

**Cambios:** Agregada validación de permisos antes de retornar datos

**Validación:**

- Verifica que el usuario tenga permiso antes de retornar datos
- Retorna error `"No tienes permiso para ver esta reunión"` si no tiene acceso

---

## Flujo de Uso en UI

### Escenario 1: Compartir con Usuarios Específicos

1. Admin crea reunión
2. Admin abre modal "Compartir"
3. Admin selecciona usuarios del equipo (ej: vendedor1, vendedor2)
4. Sistema ejecuta: `actualizarPermisosReunion(id, { usuarios_permitidos: [uuid1, uuid2] })`
5. Ahora solo admin, creador, y usuarios seleccionados pueden ver la reunión

---

### Escenario 2: Compartir con Link Público

1. Admin crea reunión
2. Admin activa "Compartir con link"
3. Sistema ejecuta: `compartirReunion(id)`
4. Admin copia link: `https://dashboard.ecoplaza.com/reuniones/compartida/abc123...`
5. Admin comparte link por WhatsApp/Email
6. Persona externa abre link → Ve reunión SIN necesidad de login

---

### Escenario 3: Revocar Link Compartido

1. Admin se da cuenta que compartió link con persona incorrecta
2. Admin abre modal "Gestionar Compartir"
3. Admin hace click en "Regenerar Link"
4. Sistema ejecuta: `regenerarLinkToken(id)`
5. Link anterior YA NO funciona
6. Admin comparte nuevo link solo con personas autorizadas

---

### Escenario 4: Compartir con Roles

1. Admin crea reunión de onboarding
2. Admin selecciona "Compartir con todos los vendedores"
3. Sistema ejecuta: `actualizarPermisosReunion(id, { roles_permitidos: ['vendedor', 'jefe_ventas'] })`
4. TODOS los usuarios con rol vendedor o jefe_ventas pueden ver la reunión
5. Si se crea un nuevo vendedor, automáticamente tendrá acceso

---

## Componentes UI Recomendados

### 1. `CompartirReunionModal`

**Props:**

```typescript
{
  reunionId: string;
  esPublico: boolean;
  linkToken: string | null;
  usuariosPermitidos: string[];
  rolesPermitidos: string[];
}
```

**Secciones:**

- ✅ Toggle "Compartir con link público"
- ✅ Botón "Regenerar link" (si está activo)
- ✅ Input con URL para copiar
- ✅ Multi-select de usuarios
- ✅ Multi-select de roles
- ✅ Botón "Guardar permisos"

---

### 2. `ReunionPermisosIndicator`

**Props:**

```typescript
{
  esPublico: boolean;
  usuariosPermitidos: string[];
  rolesPermitidos: string[];
}
```

**Vista:**

```
🔒 Privada (solo admin y creador)
👥 Compartida con 3 usuarios
👤 Compartida con roles: Vendedor, Jefe Ventas
🌐 Pública (link activo)
```

---

## Seguridad

### Protecciones Implementadas

1. **Validación de autenticación** en TODAS las funciones
2. **Verificación de permisos** antes de modificar
3. **Tokens únicos de 64 caracteres** (imposibles de adivinar)
4. **Índices de búsqueda** para performance
5. **Logs de errores** en todas las operaciones

### Recomendaciones Adicionales

- [ ] Implementar logging de accesos por token (auditoría)
- [ ] Agregar fecha de expiración opcional para links públicos
- [ ] Notificar al creador cuando alguien accede por link
- [ ] Rate limiting en endpoint público `/reuniones/compartida/[token]`

---

## Testing

### Casos de Prueba

```typescript
// 1. Superadmin puede ver todas las reuniones
// 2. Vendedor solo ve reuniones donde tiene permiso
// 3. Link público funciona sin login
// 4. Link desactivado retorna error 404
// 5. Regenerar token invalida link anterior
// 6. Usuario no autorizado no puede compartir
// 7. Filtro 'mine' solo retorna reuniones propias
// 8. Permisos por rol se aplican correctamente
```

---

## Migraciones Pendientes

**IMPORTANTE:** Antes de usar estas funciones, ejecutar migración SQL:

```sql
-- Ver sección "Campos de Base de Datos" al inicio de este documento
```

**Archivo de migración:** `migrations/008_reuniones_permisos_compartir.sql`

---

**Última actualización:** 15 Enero 2026
**Autor:** Backend Developer (Claude Code)
**Estado:** ✅ Implementado - Pendiente migración de BD
