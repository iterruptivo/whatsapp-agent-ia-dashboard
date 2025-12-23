# Endpoint Público de Proyectos - Resumen Ejecutivo

**Fecha**: 23 Diciembre 2025
**Sesión**: 74+
**Status**: COMPLETADO

---

## Objetivo

Crear un endpoint público (sin autenticación) para que la app móvil pueda obtener la lista de proyectos activos y mostrarlos en un dropdown durante el login.

---

## Implementación

### Archivo Creado

```
app/api/public/proyectos/route.ts
```

### Características Técnicas

| Característica | Detalle |
|----------------|---------|
| Método HTTP | GET únicamente |
| Autenticación | NO requerida (público) |
| CORS | Habilitado para todos los orígenes |
| Filtrado | Solo proyectos con `activo = true` |
| Ordenamiento | Alfabético por nombre |
| Cliente Supabase | `createClient` con anon key |

### Response Format

```json
{
  "success": true,
  "proyectos": [
    {
      "id": "uuid",
      "nombre": "Proyecto Trapiche",
      "slug": "trapiche",
      "color": "#1b967a"
    }
  ]
}
```

---

## Patrón de Implementación

### CORS Headers (siguiendo patrón de `/api/extension/login`)

```typescript
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}
```

### Preflight Handler

```typescript
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
```

### Query Supabase

```typescript
const { data: proyectos, error } = await supabase
  .from('proyectos')
  .select('id, nombre, slug, color')
  .eq('activo', true)
  .order('nombre', { ascending: true });
```

---

## Seguridad

- **Sin autenticación por diseño**: Necesario para que la app móvil pueda cargar proyectos ANTES del login
- **Datos no sensibles**: Solo expone información básica de proyectos
- **Solo lectura**: Endpoint GET únicamente, no permite modificaciones
- **Filtro activo**: Solo retorna proyectos que están activos en el sistema

---

## Testing

### Verificación de Compilación

```bash
npm run build
```

**Resultado**: Endpoint compila correctamente

### Prueba Manual (cURL)

```bash
curl -X GET http://localhost:3000/api/public/proyectos
```

### Prueba CORS

```bash
curl -X GET http://localhost:3000/api/public/proyectos \
  -H "Origin: https://example.com" \
  -v
```

### Verificar en Navegador

```javascript
fetch('http://localhost:3000/api/public/proyectos')
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## Integración con App Móvil

### Uso Esperado

1. Usuario abre app móvil
2. App hace GET a `/api/public/proyectos`
3. App recibe lista de proyectos
4. Usuario selecciona proyecto del dropdown
5. Usuario ingresa credenciales y hace login

### Ejemplo Flutter

```dart
Future<List<Proyecto>> fetchProyectos() async {
  final response = await http.get(
    Uri.parse('https://tu-dominio.vercel.app/api/public/proyectos'),
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return (data['proyectos'] as List)
      .map((p) => Proyecto.fromJson(p))
      .toList();
  }
  throw Exception('Failed to load proyectos');
}
```

---

## Comparación con Endpoint Similar

### `/api/extension/login` (referencia usada)

| Aspecto | extension/login | public/proyectos |
|---------|-----------------|-------------------|
| Autenticación | Valida credenciales | NO requerida |
| CORS | Habilitado | Habilitado |
| Método | POST | GET |
| Retorna proyectos | Después del login | Siempre |
| Uso | Extensión Chrome | App móvil |

---

## Próximos Pasos

1. **Deploy a producción** (Vercel)
2. **Probar endpoint en staging** con app móvil
3. **Documentar URL del endpoint** para el equipo móvil
4. **Monitorear logs** de Vercel para verificar uso

---

## Archivos Relacionados

| Archivo | Propósito |
|---------|-----------|
| `app/api/public/proyectos/route.ts` | Implementación del endpoint |
| `TESTING_PUBLIC_PROYECTOS_ENDPOINT.md` | Guía de pruebas completa |
| `app/api/extension/login/route.ts` | Referencia de patrón CORS |
| `lib/db.ts` | Tipos TypeScript (`Proyecto`) |

---

## Notas Técnicas

- **Cliente Supabase**: Usa `createClient` con anon key (público), NO usa `createServerClient` con cookies
- **Variables de entorno**: Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **RLS Supabase**: La tabla `proyectos` debe tener política de lectura pública habilitada
- **Build verificado**: Endpoint compila sin errores en Next.js 15.5.7

---

**Backend Developer**: Claude Code
**Patrón seguido**: Server Action público con CORS
**Documentación**: Completa y lista para handoff a equipo móvil
