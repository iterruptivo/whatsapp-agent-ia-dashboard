# Creación de Usuarios desde Excel - Huancayo

## Resumen Ejecutivo

Se crearon **4 usuarios nuevos** desde el archivo Excel `docs/huancayo_users.xlsx` para el equipo de Huancayo.

**Fecha:** 20 Enero 2026
**Script:** `scripts/create-users-from-excel.js`
**Estado:** ✅ COMPLETADO

---

## Usuarios Creados

| Nombre | Email | Rol | Teléfono | Estado Login |
|--------|-------|-----|----------|--------------|
| Álvaro Espinoza Escalante | alvaroespinozaescalante4@gmail.com | jefe_ventas | 51921312350 | ✅ Verificado |
| Arnold Castañeda Salinas | arnoldcastanedasalinas@gmail.com | vendedor_caseta | 51997000977 | ✅ Verificado |
| Estefani Noemi Cerdan Saman | estefani.cerdan.0214@gmail.com | vendedor_caseta | 51934896916 | ✅ Verificado |
| Marysella Alisson Orellana Romero | alissonmarysella@gmail.com | vendedor_caseta | 51920611622 | ✅ Verificado |

---

## Usuarios Duplicados (Ya Existían)

12 usuarios fueron saltados porque ya existían en el sistema (mismo teléfono):

1. Marleny Cantorin Saldaña - 51950753799
2. Sadith Yolanda Allpas Aquino - 51960734862
3. Patricia Ana Pardave Chuco - 51997178832
4. Vanessa Vilcapoma Romero - 51972295760
5. Dayana Ruiz Cajahuaringa - 51960908520
6. huros gurdijef damas flores - 51926721409
7. Percy Martín Torres Yapias - 51964705725
8. Elfer Andres Espinoza Escalante - 51922434547
9. Gianmarco Rodrigo Osores Morales - 51997749672
10. Ronald Reyes Andrade - 51964737058
11. Antonella Sanchez Pachamango - 51931757389
12. Adrián Cóndor Escalante - 51977473688

**Recomendación:** Verificar si estos usuarios necesitan actualizar su información o si son usuarios válidos existentes.

---

## Archivo de Passwords

**Ubicación:** `docs/huancayo_users_passwords.xlsx`

**Contenido:**
- Nombre completo
- Email (para login)
- Teléfono corporativo
- Rol en el sistema
- **Password generado** (12 caracteres alfanuméricos con símbolos)
- Estado de creación

**IMPORTANTE:**
- Este archivo contiene las contraseñas en texto plano
- Debe ser enviado de forma segura a los usuarios
- Los usuarios deben cambiar su contraseña en el primer login
- NO subir este archivo a Git (ya está en .gitignore)

---

## Proceso de Creación

### 1. Lectura del Excel

El script lee el archivo `docs/huancayo_users.xlsx` con las siguientes columnas:
- `NR CELL NOTIFICACION`: Teléfono del usuario (se normaliza a formato +51...)
- `NOMBRE`: Nombre completo
- `EMAIL`: Email para login
- `TIPO DE USUARIO`: Rol (vendedor_caseta, Jefe de Proyecto, etc.)

### 2. Validación de Datos

- ✅ Validación de campos requeridos
- ✅ Mapeo de roles del Excel a roles del sistema
- ✅ Normalización de teléfonos (agregar +51 si falta)
- ✅ Validación de formato de email
- ✅ Verificación de duplicados en BD (email y teléfono)

**Mapeo de Roles:**
```javascript
'vendedor_caseta' → 'vendedor_caseta'
'Jefe de Proyecto' → 'jefe_ventas'
```

### 3. Creación de Usuarios

Para cada usuario se crea:

**a. Registro en auth.users (Supabase Auth)**
- Email y password
- Email confirmado (pueden hacer login inmediatamente)
- Metadata: nombre y rol

**b. Registro en tabla vendedores**
- Nombre del vendedor
- Teléfono corporativo
- Activo por defecto

**c. Registro en tabla usuarios**
- ID vinculado a auth.users
- Email, nombre, rol
- vendedor_id (todos los usuarios tienen vendedor_id según Sesión 84)
- Activo = true

### 4. Generación de Passwords

Passwords seguros generados automáticamente:
- **Longitud:** 12 caracteres
- **Composición:**
  - Al menos 1 mayúscula
  - Al menos 1 minúscula
  - Al menos 1 número
  - Al menos 1 símbolo (@#$%&*)
- **Ejemplo:** `@m$r8EdMLcsY`

---

## Testing Realizado

### Login Verification

Se probó el login de los 4 usuarios creados:

```
✅ Álvaro Espinoza Escalante - Login exitoso
✅ Arnold Castañeda Salinas - Login exitoso
✅ Estefani Noemi Cerdan Saman - Login exitoso
✅ Marysella Alisson Orellana Romero - Login exitoso
```

**Verificaciones:**
- ✅ Email confirmado
- ✅ Metadata correcta (nombre y rol)
- ✅ Registro en tabla usuarios
- ✅ vendedor_id asignado
- ✅ Estado activo

### Verificación en Base de Datos

```sql
-- Query de verificación ejecutada
SELECT nombre, email, rol, activo, created_at
FROM usuarios
WHERE email IN (
  'alvaroespinozaescalante4@gmail.com',
  'arnoldcastanedasalinas@gmail.com',
  'estefani.cerdan.0214@gmail.com',
  'alissonmarysella@gmail.com'
)
ORDER BY created_at DESC;
```

**Resultado:** 4 registros encontrados, todos activos.

---

## Scripts Creados

### 1. `scripts/create-users-from-excel.js`

**Propósito:** Crear usuarios masivamente desde Excel

**Uso:**
```bash
node scripts/create-users-from-excel.js
```

**Prerrequisitos:**
- Archivo Excel: `docs/huancayo_users.xlsx`
- Variables de entorno: `.env.local`
- Dependencias: `npm install xlsx dotenv @supabase/supabase-js`

**Output:**
- Usuarios creados en Supabase
- Archivo Excel con passwords: `docs/huancayo_users_passwords.xlsx`
- Reporte en consola

### 2. `scripts/test-login-huancayo.js`

**Propósito:** Probar login de usuarios creados

**Uso:**
```bash
node scripts/test-login-huancayo.js
```

**Verifica:**
- Login con email/password
- Email confirmado
- Metadata de usuario
- Datos en tabla usuarios
- vendedor_id asignado

---

## Próximos Pasos

### 1. Envío de Credenciales

- [ ] Enviar archivo `huancayo_users_passwords.xlsx` al responsable de Huancayo
- [ ] Asegurar transmisión segura (no por email sin encriptar)
- [ ] Confirmar recepción

### 2. Primer Login de Usuarios

- [ ] Instruir a usuarios para hacer login en: https://tu-dashboard.vercel.app
- [ ] Solicitar cambio de contraseña en primer login
- [ ] Verificar que pueden acceder a sus funciones según rol

### 3. Asignación a Proyecto

- [ ] Verificar a qué proyecto de Huancayo pertenecen
- [ ] Asignar proyecto_id si es necesario
- [ ] Configurar permisos específicos del proyecto

### 4. Capacitación

- [ ] Capacitar en uso del dashboard
- [ ] Explicar flujo de captura de leads
- [ ] Mostrar cómo asignar vendedores
- [ ] Revisar reportes disponibles

---

## Lecciones Aprendidas

### 1. Normalización de Teléfonos

**Problema:** Excel contenía teléfonos sin código de país
**Solución:** Script normaliza agregando +51 automáticamente
**Código:**
```javascript
function normalizePhone(phone) {
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('51')) {
    cleaned = '51' + cleaned;
  }
  return cleaned;
}
```

### 2. Duplicados por Teléfono

**Problema:** 12 usuarios ya existían (mismo teléfono)
**Solución:** Script valida contra usuarios ACTIVOS antes de crear
**Impacto:** Evitó errores y data inconsistente

### 3. Todos los Usuarios son Vendedores

**Decisión de Sesión 84:** Todos los usuarios tienen `vendedor_id`
**Razón:** Cualquier usuario puede hacer ventas
**Implementación:** Script crea vendedor para TODOS los usuarios

### 4. Passwords en Excel

**Decisión:** Generar passwords y guardarlos en Excel
**Pros:**
- Usuarios reciben credenciales completas
- Fácil distribución
- No requiere email automation

**Contras:**
- Archivo sensible (no versionar)
- Requiere transmisión segura

**Recomendación:** Implementar cambio de password obligatorio en primer login

---

## Troubleshooting

### Error: "Ya existe un usuario con ese teléfono"

**Causa:** Teléfono ya asignado a un usuario ACTIVO
**Solución:** Verificar si el usuario existente es válido o debe ser reemplazado

### Error: "No se pudo leer el archivo Excel"

**Causa:** Archivo no encontrado o corrupto
**Solución:** Verificar ruta: `docs/huancayo_users.xlsx`

### Error: "Faltan variables de entorno"

**Causa:** `.env.local` no configurado
**Solución:** Verificar que existan `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

### Usuarios no pueden hacer login

**Verificar:**
1. Email correcto (sin espacios ni mayúsculas)
2. Password exacto del Excel
3. Usuario está activo en BD
4. Email fue confirmado (email_confirm: true)

---

## Datos Técnicos

**Tablas Involucradas:**
- `auth.users` - Autenticación Supabase
- `usuarios` - Datos del sistema
- `vendedores` - Todos los usuarios tienen vendedor_id

**Service Role Key:**
- Usado para bypasear RLS
- Permite crear usuarios sin necesidad de estar autenticado
- Solo usar en scripts admin

**Timestamps:**
- Creación: 2026-01-20 12:46:50 - 12:46:52 UTC
- Total duración: ~2.5 segundos (4 usuarios)

---

## Contacto

Para preguntas o issues relacionados con la creación de usuarios de Huancayo:

- **Script creado por:** Database Architect (DataDev)
- **Sesión:** 100+ (20 Enero 2026)
- **Documentación:** Este archivo
- **Scripts:** `scripts/create-users-from-excel.js`, `scripts/test-login-huancayo.js`

---

**Última actualización:** 20 Enero 2026
