# SESION 75 - Implementación Swagger UI

**Fecha:** 23 Diciembre 2025
**Desarrollador:** Agente Backend
**Objetivo:** Implementar Swagger UI para documentación de APIs con protección por ambiente

---

## Resumen Ejecutivo

Implementación exitosa de Swagger UI usando `swagger-ui-react` y `next-swagger-doc` compatible con Next.js 15.5 App Router. La documentación incluye 3 endpoints principales y tiene protección Basic Auth en producción mientras permite acceso libre en desarrollo.

---

## Implementación

### 1. Instalación de Dependencias

```bash
npm install swagger-ui-react next-swagger-doc @types/swagger-ui-react openapi-types
```

### 2. Estructura de Archivos Creados

```
lib/swagger/
├── swagger-config.ts       # Especificación OpenAPI 3.0
└── auth.ts                 # Helper de autenticación Basic Auth

app/api/docs/
├── page.tsx               # UI de Swagger (Client Component)
└── spec/
    └── route.ts          # Endpoint GET JSON spec

docs/
├── SWAGGER_DOCS.md       # Documentación de uso
└── VERCEL_ENV_VARS.md    # Instrucciones de configuración
```

### 3. Endpoints Documentados

#### a. GET /api/public/proyectos
- **Tipo:** Público (sin autenticación)
- **Descripción:** Lista de proyectos activos
- **Uso:** App móvil para dropdown de proyectos

**Response:**
```json
{
  "success": true,
  "proyectos": [
    {
      "id": "uuid",
      "nombre": "Victoria Eco Plaza Callao",
      "slug": "callao",
      "color": "#3B82F6"
    }
  ]
}
```

#### b. POST /api/extension/login
- **Tipo:** Público (sin autenticación)
- **Descripción:** Login para extensión Chrome
- **Retorna:** JWT tokens + datos de usuario + proyectos

**Request:**
```json
{
  "email": "alonso@ecoplaza.com",
  "password": "Q0KlC36J4M_y"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": 1735257600
  },
  "user": {
    "id": "uuid",
    "email": "alonso@ecoplaza.com",
    "nombre": "Alonso Gutierrez",
    "rol": "vendedor",
    "vendedor_id": "uuid"
  },
  "proyectos": [...]
}
```

#### c. POST /api/extension/create-lead
- **Tipo:** Protegido (requiere Bearer token)
- **Autenticación:** `Authorization: Bearer {access_token}`
- **Descripción:** Crear nuevo lead desde extensión Chrome

**Request:**
```json
{
  "telefono": "+51987654321",
  "nombre": "Juan Perez",
  "proyectoId": "uuid",
  "vendedorId": "uuid",
  "rubro": "Restaurante"
}
```

**Response (Exitoso):**
```json
{
  "success": true,
  "lead": {
    "id": "uuid",
    "nombre": "Juan Perez",
    "telefono": "51987654321"
  },
  "message": "Lead \"Juan Perez\" creado exitosamente"
}
```

**Response (Duplicado):**
```json
{
  "success": false,
  "duplicate": true,
  "existingLead": {
    "id": "uuid",
    "nombre": "Juan Perez",
    "telefono": "51987654321",
    "vendedor_nombre": "Alonso Gutierrez"
  }
}
```

### 4. Protección por Ambiente

**Desarrollo (localhost):**
- Acceso libre sin autenticación
- URL: `http://localhost:3000/api/docs`

**Producción:**
- Requiere Basic Auth
- URL: `https://ecodashboard.iterruptivo.com/api/docs`
- Credenciales desde env vars:
  - `SWAGGER_USERNAME=ecoplaza_admin`
  - `SWAGGER_PASSWORD=Sw4gg3r#2025!Eco`

### 5. Middleware

Se agregaron excepciones en `middleware.ts` para permitir acceso a:
- `/api/docs/*` - Maneja su propia autenticación
- `/api/public/*` - Endpoints públicos

```typescript
// SWAGGER/DOCS ROUTES - Allow with their own auth
if (pathname.startsWith('/api/docs')) {
  return res;
}

// PUBLIC API ROUTES - Allow without authentication
if (pathname.startsWith('/api/public')) {
  return res;
}
```

---

## Testing Local

### 1. Spec OpenAPI
```bash
curl http://localhost:3004/api/docs/spec
```
**Resultado:** JSON con especificación OpenAPI 3.0

### 2. Proyectos Públicos
```bash
curl http://localhost:3004/api/public/proyectos
```
**Resultado:** Lista de proyectos activos

### 3. Login de Extensión
```bash
curl -X POST http://localhost:3004/api/extension/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alonso@ecoplaza.com","password":"Q0KlC36J4M_y"}'
```
**Resultado:** Session tokens + user data + proyectos

### 4. UI de Swagger
```
http://localhost:3004/api/docs
```
**Resultado:** Interfaz visual de Swagger UI cargada correctamente

---

## Variables de Entorno

### .env.local (actualizado)
```env
# Swagger UI - Proteccion en produccion
SWAGGER_USERNAME=ecoplaza_admin
SWAGGER_PASSWORD=Sw4gg3r#2025!Eco
```

### Vercel (pendiente configurar)
```
SWAGGER_USERNAME=ecoplaza_admin
SWAGGER_PASSWORD=Sw4gg3r#2025!Eco
```

---

## Próximos Pasos

1. **Deploy a Producción:**
   - Push a main
   - Configurar variables de entorno en Vercel
   - Verificar acceso con Basic Auth

2. **Documentación Adicional:**
   - Agregar más endpoints conforme se desarrollen
   - Incluir ejemplos de error responses

3. **Seguridad:**
   - Rotar credenciales periódicamente
   - Monitorear accesos a la documentación

---

## Lecciones Aprendidas

### Qué Funcionó
1. `swagger-ui-react` es compatible con Next.js 15 App Router
2. Dynamic import con `{ ssr: false }` evita problemas de hidratación
3. Basic Auth a nivel de API route es más simple que middleware global
4. Detección de ambiente por `host` header funciona en localhost y producción

### Desafíos
1. Middleware interceptaba `/api/docs` - se agregó excepción
2. Peer dependencies warnings de React 19 con swagger-ui-react (no crítico)

### Mejores Prácticas
- Mantener especificación OpenAPI actualizada con cada cambio de API
- Documentar todos los códigos de error posibles
- Incluir ejemplos reales de request/response
- Proteger documentación en producción pero permitir acceso fácil en dev

---

## Archivos Modificados

### Nuevos
- `lib/swagger/swagger-config.ts`
- `lib/swagger/auth.ts`
- `app/api/docs/page.tsx`
- `app/api/docs/spec/route.ts`
- `docs/SWAGGER_DOCS.md`
- `docs/VERCEL_ENV_VARS.md`

### Modificados
- `middleware.ts` - Agregadas excepciones para `/api/docs` y `/api/public`
- `.env.local` - Agregadas credenciales de Swagger
- `context/NEXT_STEPS.md` - Actualizado con tasks de Swagger

---

**Estado:** COMPLETADO (pendiente deploy a producción)
**Testing:** Local OK, Producción pendiente
**Documentación:** Completa
