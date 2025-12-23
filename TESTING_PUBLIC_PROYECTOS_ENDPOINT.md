# Testing - Endpoint Público de Proyectos

## Endpoint Creado

```
GET /api/public/proyectos
```

## Características

- **Sin autenticación**: Endpoint público, no requiere token
- **CORS habilitado**: Permite acceso desde cualquier origen (app móvil)
- **Solo proyectos activos**: Filtra automáticamente por `activo = true`
- **Ordenados alfabéticamente**: Por nombre de proyecto

## Response Esperado

```json
{
  "success": true,
  "proyectos": [
    {
      "id": "uuid-del-proyecto",
      "nombre": "Proyecto Trapiche",
      "slug": "trapiche",
      "color": "#1b967a"
    },
    {
      "id": "uuid-del-proyecto-2",
      "nombre": "San Gabriel",
      "slug": "san-gabriel",
      "color": "#3b82f6"
    }
  ]
}
```

## Pruebas Manuales

### 1. Con cURL (desde terminal)

```bash
curl -X GET http://localhost:3000/api/public/proyectos
```

### 2. Con cURL (verificar CORS)

```bash
curl -X GET http://localhost:3000/api/public/proyectos \
  -H "Origin: https://example.com" \
  -v
```

Deberías ver en los headers:
```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, OPTIONS
```

### 3. Desde navegador (JavaScript)

```javascript
fetch('http://localhost:3000/api/public/proyectos')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 4. Preflight request (OPTIONS)

```bash
curl -X OPTIONS http://localhost:3000/api/public/proyectos \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Debería retornar status 204 con headers CORS.

## Testing en Producción (Vercel)

Una vez deployado:

```bash
curl -X GET https://tu-dominio.vercel.app/api/public/proyectos
```

## Integración con App Móvil

### Flutter/Dart

```dart
final response = await http.get(
  Uri.parse('https://tu-dominio.vercel.app/api/public/proyectos'),
);

if (response.statusCode == 200) {
  final data = json.decode(response.body);
  final proyectos = data['proyectos'] as List;
  // Usar proyectos para dropdown
}
```

### React Native

```javascript
const fetchProyectos = async () => {
  try {
    const response = await fetch('https://tu-dominio.vercel.app/api/public/proyectos');
    const data = await response.json();
    if (data.success) {
      return data.proyectos;
    }
  } catch (error) {
    console.error('Error fetching proyectos:', error);
  }
};
```

## Verificación de Datos

Los proyectos retornados deben:
- Tener `activo = true` en la base de datos
- Estar ordenados alfabéticamente
- Incluir los 4 campos: id, nombre, slug, color

## Notas de Seguridad

- El endpoint es público por diseño (necesario para login)
- Solo expone información básica (no sensible)
- Solo retorna proyectos activos
- No permite POST/PUT/DELETE (solo GET)

## Troubleshooting

### Error 500 - Error al obtener proyectos
- Verificar variables de entorno: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Revisar logs de Supabase
- Verificar que la tabla `proyectos` existe

### CORS bloqueado
- Verificar que el header `Origin` está siendo enviado
- Confirmar que el endpoint maneja OPTIONS correctamente

### Proyectos vacíos
- Verificar que hay proyectos con `activo = true` en la base de datos
```sql
SELECT id, nombre, slug, color, activo FROM proyectos WHERE activo = true;
```

---

**Creado**: 23 Diciembre 2025
**Sesión**: 74+
**Ubicación**: `app/api/public/proyectos/route.ts`
