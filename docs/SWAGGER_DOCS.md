# Swagger UI - Documentación API

## Acceso

### Desarrollo (localhost)
```
http://localhost:3000/api/docs
```
- **Autenticación:** No requerida
- **Acceso:** Libre

### Producción
```
https://ecodashboard.iterruptivo.com/api/docs
```
- **Autenticación:** Basic Auth
- **Usuario:** (variable de entorno `SWAGGER_USERNAME`)
- **Contraseña:** (variable de entorno `SWAGGER_PASSWORD`)

## Endpoints Documentados

### 1. GET /api/public/proyectos
- **Tipo:** Público (sin autenticación)
- **Descripción:** Retorna lista de proyectos activos
- **Uso:** App móvil para dropdown de proyectos

**Respuesta:**
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

### 2. POST /api/extension/login
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

**Respuesta:**
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

### 3. POST /api/extension/create-lead
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
  "userId": "uuid",
  "rubro": "Restaurante",
  "email": "juan@example.com",
  "historialConversacion": "...",
  "tipificacionNivel1": "Interesado"
}
```

**Respuesta Exitosa:**
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

**Respuesta Duplicado:**
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

## Variables de Entorno

### Desarrollo
```env
# No requiere autenticación en localhost
```

### Producción
```env
SWAGGER_USERNAME=ecoplaza_admin
SWAGGER_PASSWORD=Sw4gg3r#2025!Eco
```

## Arquitectura

### Archivos
```
lib/swagger/
  ├── swagger-config.ts    # Especificación OpenAPI 3.0
  └── auth.ts              # Helper de autenticación Basic Auth

app/api/docs/
  ├── page.tsx            # UI de Swagger (Client Component)
  └── spec/
      └── route.ts        # Endpoint GET JSON spec
```

### Protección por Ambiente

El helper `verifySwaggerAuth()` detecta el ambiente automáticamente:

```typescript
// Desarrollo (localhost) - Sin autenticación
if (host.includes('localhost')) {
  return true;
}

// Producción - Basic Auth requerido
const authHeader = request.headers.get('authorization');
// Validar contra SWAGGER_USERNAME y SWAGGER_PASSWORD
```

## Uso en Extensión Chrome

1. **Login:**
```javascript
const response = await fetch('https://dashboard.ecoplaza.com/api/extension/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { session, user, proyectos } = await response.json();
```

2. **Crear Lead:**
```javascript
const response = await fetch('https://dashboard.ecoplaza.com/api/extension/create-lead', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    telefono: '+51987654321',
    nombre: 'Juan Perez',
    proyectoId: selectedProyectoId
  })
});
```

## Notas de Seguridad

- Los endpoints de extensión (`/api/extension/*`) usan CORS headers
- El middleware de Next.js NO intercepta `/api/docs` ni `/api/public`
- En producción, Swagger UI requiere Basic Auth para prevenir exposición pública
- Los tokens JWT expiran según configuración de Supabase Auth

---

**Última Actualización:** 23 Diciembre 2025
**Sesión:** 74+
