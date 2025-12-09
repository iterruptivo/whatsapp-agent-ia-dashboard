# Modulo: Administracion de Usuarios

**Branch:** `feature/admin-usuarios`
**Ultima actualizacion:** 9 Diciembre 2025
**Estado:** EN DESARROLLO

---

## Descripcion General

Sistema completo de administracion de usuarios del dashboard EcoPlaza. Permite crear, editar, activar/desactivar usuarios, resetear contrasenas e importar usuarios masivamente desde Excel.

---

## Funcionalidades

### 1. CRUD de Usuarios

| Accion | Descripcion | Roles permitidos |
|--------|-------------|------------------|
| Crear | Nuevo usuario con email, contrasena, rol, telefono | admin |
| Editar | Modificar nombre, rol, telefono, email alternativo | admin |
| Activar/Desactivar | Toggle de estado activo | admin |
| Reset Password | Enviar email de recuperacion | admin |

### 2. Importacion Masiva (Excel)

**Feature nuevo implementado en esta rama.**

Permite crear multiples usuarios desde un archivo Excel/CSV.

#### Flujo de importacion:

1. Click en boton "Importar"
2. Subir archivo Excel (drag & drop o click)
3. Sistema valida y muestra preview con errores
4. Click "Importar X usuarios"
5. Sistema crea usuarios y genera contrasenas automaticamente
6. Descargar Excel con credenciales (nombre, email, rol, password)

#### Validaciones:

| Campo | Validacion |
|-------|------------|
| nombre | Obligatorio |
| email | Formato valido, unico en BD, unico en archivo |
| rol | Debe ser: admin, jefe_ventas, vendedor, vendedor_caseta, coordinador, finanzas |
| telefono | Minimo 10 digitos, sin simbolo +, unico en BD |
| email_alternativo | Opcional, formato valido si se incluye |

#### Formato Excel esperado:

| nombre | email | rol | telefono | email_alternativo |
|--------|-------|-----|----------|-------------------|
| Juan Perez | juan@ecoplaza.pe | vendedor | 51987654321 | juan.personal@gmail.com |
| Maria Garcia | maria@ecoplaza.pe | admin | 51912345678 | |

#### Generacion de contrasenas:

- Longitud: 16 caracteres
- Incluye: mayusculas, minusculas, numeros, caracteres especiales
- Se genera automaticamente para cada usuario
- Solo disponible en el Excel descargado post-importacion (no se guarda en BD en texto plano)

---

## Arquitectura

### Tablas involucradas

```
auth.users (Supabase Auth)
    |
    v
usuarios (tabla principal)
    |
    +-- vendedores (si rol = vendedor | vendedor_caseta)
    |
    +-- usuarios_datos_no_vendedores (si rol = admin | jefe_ventas | finanzas)
```

### Mapeo de datos segun rol:

| Rol | Tabla adicional | Campos |
|-----|-----------------|--------|
| vendedor | vendedores | nombre, telefono, email |
| vendedor_caseta | vendedores | nombre, telefono, email |
| admin | usuarios_datos_no_vendedores | usuario_id, telefono, email_alternativo |
| jefe_ventas | usuarios_datos_no_vendedores | usuario_id, telefono, email_alternativo |
| finanzas | usuarios_datos_no_vendedores | usuario_id, telefono, email_alternativo |

---

## Archivos del Modulo

### Frontend

| Archivo | Descripcion |
|---------|-------------|
| `app/admin/usuarios/page.tsx` | Pagina principal (Server Component) |
| `components/admin/UsuariosClient.tsx` | Cliente con tabla, filtros, botones |
| `components/admin/UsuarioFormModal.tsx` | Modal crear/editar usuario |
| `components/admin/UsuarioImportModal.tsx` | Modal importacion masiva Excel |
| `components/admin/ResetPasswordModal.tsx` | Modal reset contrasena |

### Backend

| Archivo | Funciones |
|---------|-----------|
| `lib/actions-usuarios.ts` | Server actions completas |

#### Funciones en actions-usuarios.ts:

| Funcion | Descripcion |
|---------|-------------|
| `getAllUsuarios()` | Obtener todos los usuarios con datos relacionados |
| `getUsuariosStats()` | Estadisticas (total, activos, por rol) |
| `createUsuario()` | Crear usuario individual |
| `updateUsuario()` | Actualizar usuario existente |
| `toggleUsuarioActivo()` | Activar/desactivar usuario |
| `resetUserPassword()` | Enviar email reset password |
| `bulkCreateUsuarios()` | **NUEVO** - Crear usuarios masivamente |

---

## Implementacion Tecnica

### bulkCreateUsuarios()

```typescript
export async function bulkCreateUsuarios(
  usuarios: BulkUsuarioData[]
): Promise<BulkCreateResult>
```

**Proceso:**

1. Pre-validar emails existentes en BD (tabla usuarios)
2. Pre-validar telefonos existentes (vendedores + usuarios_datos_no_vendedores)
3. Por cada usuario valido:
   - Generar contrasena segura (16 chars)
   - Crear en auth.users (Supabase Auth)
   - Si es vendedor: crear en tabla vendedores
   - Crear en tabla usuarios
   - Si es NO vendedor: crear en usuarios_datos_no_vendedores
4. Rollback: Si falla BD, eliminar usuario de auth.users
5. Retornar resultado con usuarios creados y errores

**Respuesta:**

```typescript
interface BulkCreateResult {
  success: boolean;
  message: string;
  created: Array<{
    nombre: string;
    email: string;
    rol: string;
    password: string;  // Solo disponible en este momento
  }>;
  duplicateEmails: Array<{ email: string; row: number }>;
  duplicatePhones: Array<{ telefono: string; row: number }>;
  errors: Array<{ email: string; row: number; reason: string }>;
}
```

### Supabase Admin Client

Se usa `createAdminClient()` con `SUPABASE_SERVICE_ROLE_KEY` para:
- Bypass de RLS policies
- Acceso a `auth.admin.createUser()`
- Acceso a `auth.admin.deleteUser()` (rollback)

---

## Seguridad

### Permisos

- Solo usuarios con rol `admin` pueden acceder a `/admin/usuarios`
- Middleware valida rol antes de renderizar pagina

### Contrasenas

- Generadas con algoritmo seguro (16 chars, mixed case, numeros, especiales)
- Solo el hash se guarda en Supabase Auth
- Contrasena en texto plano solo disponible en Excel descargado post-importacion
- **Importante:** El Excel con credenciales debe descargarse inmediatamente

### RLS Bypass

- Server actions usan service role key para operaciones admin
- No se expone la key al cliente

---

## UI/UX

### Componente PhoneInputCustom

Input de telefono con selector de pais y bandera:
- Pais por defecto: Peru (+51)
- Paises latinoamericanos priorizados
- Busqueda de paises
- Retorna numero sin simbolo + (ej: 51987654321)

### Modal de Importacion

Estados del modal:
1. **Inicial:** Drag & drop zone
2. **Preview:** Tabla con validaciones y errores
3. **Procesando:** Spinner con mensaje
4. **Resultado:** Resumen + boton descargar credenciales

---

## Commits

| Commit | Descripcion |
|--------|-------------|
| `2f26f5b` | feat: add admin user management page with CRUD |
| `8e4de64` | feat: add bulk import users via Excel |

---

## Dependencias

```json
{
  "xlsx": "^0.18.5",
  "react-phone-number-input": "^3.x",
  "@supabase/ssr": "^0.5.2",
  "@supabase/supabase-js": "^2.47.12"
}
```

**Nota:** Se fijaron versiones de Supabase por compatibilidad de tipos.

---

## Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Requerido para admin operations
```

---

## Testing

### Casos de prueba manuales:

1. **Crear usuario individual**
   - Verificar usuario aparece en lista
   - Verificar puede hacer login con credenciales

2. **Importar usuarios desde Excel**
   - Subir archivo con 5 usuarios validos
   - Verificar preview muestra 5 filas
   - Importar y verificar mensaje de exito
   - Descargar credenciales y verificar contenido
   - Verificar usuarios pueden hacer login

3. **Validaciones de importacion**
   - Email duplicado en BD -> mostrar error
   - Email duplicado en archivo -> mostrar error
   - Telefono invalido (<10 digitos) -> mostrar error
   - Rol invalido -> mostrar error

4. **Rollback**
   - Simular error en tabla usuarios
   - Verificar usuario no queda huerfano en auth.users

---

## Mejoras Futuras

- [ ] Exportar lista de usuarios a Excel
- [ ] Filtro por fecha de creacion
- [ ] Audit log de cambios de usuarios
- [ ] Cambio de contrasena por admin (sin reset email)
- [ ] Bulk update de usuarios
- [ ] Bulk delete/deactivate

---

**Documentacion generada:** 9 Diciembre 2025
**Branch:** feature/admin-usuarios
