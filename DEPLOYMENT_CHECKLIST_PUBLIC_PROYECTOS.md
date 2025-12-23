# Deployment Checklist - Endpoint Público de Proyectos

**Endpoint**: `GET /api/public/proyectos`
**Fecha**: 23 Diciembre 2025
**Sesión**: 74+

---

## Pre-Deployment Verification

### 1. Código

- [x] Endpoint creado en `app/api/public/proyectos/route.ts`
- [x] TypeScript compila sin errores
- [x] Build de Next.js exitoso
- [x] CORS headers configurados correctamente
- [x] Manejo de OPTIONS para preflight requests

### 2. Base de Datos (Supabase)

- [x] RLS habilitado en tabla `proyectos`
- [x] Política `proyectos_select_anon` activa (permite lectura pública)
- [x] Política `proyectos_select_authenticated` activa (permite lectura autenticada)

```sql
-- Verificar políticas (ejecutar en Supabase SQL Editor)
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'proyectos';
```

**Resultado esperado:**
```
proyectos | proyectos_select_anon          | anon         | SELECT
proyectos | proyectos_select_authenticated | authenticated | SELECT
```

### 3. Variables de Entorno

Verificar en Vercel Dashboard:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada

**Comando para verificar localmente:**
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Deployment Steps

### 1. Commit y Push

```bash
git add app/api/public/proyectos/route.ts
git commit -m "feat: Add public proyectos endpoint for mobile app"
git push origin main
```

### 2. Vercel Auto-Deploy

- [ ] Esperar a que Vercel detecte el push
- [ ] Verificar build exitoso en Vercel Dashboard
- [ ] Verificar deployment completo

### 3. Testing en Producción

```bash
# Test básico
curl -X GET https://tu-dominio.vercel.app/api/public/proyectos

# Test CORS
curl -X GET https://tu-dominio.vercel.app/api/public/proyectos \
  -H "Origin: https://example.com" \
  -v

# Test preflight
curl -X OPTIONS https://tu-dominio.vercel.app/api/public/proyectos \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

**Response esperado:**
```json
{
  "success": true,
  "proyectos": [
    {
      "id": "...",
      "nombre": "Proyecto Trapiche",
      "slug": "trapiche",
      "color": "#1b967a"
    }
  ]
}
```

---

## Post-Deployment

### 1. Verificación de Datos

```sql
-- Verificar que hay proyectos activos
SELECT id, nombre, slug, color, activo
FROM proyectos
WHERE activo = true
ORDER BY nombre;
```

**Acción si está vacío:**
- Activar al menos un proyecto en Supabase
- Re-testear endpoint

### 2. Monitoreo

- [ ] Verificar logs de Vercel (primeras 24h)
- [ ] Verificar Analytics de Vercel (uso del endpoint)
- [ ] Verificar Supabase Dashboard (queries ejecutadas)

### 3. Documentación para Equipo Móvil

Proveer al equipo:

```
Endpoint: GET https://tu-dominio.vercel.app/api/public/proyectos

Headers: Ninguno requerido (público)

Response:
{
  "success": true,
  "proyectos": [
    {
      "id": "uuid",
      "nombre": "string",
      "slug": "string",
      "color": "string" // Hex color
    }
  ]
}

Error Handling:
- 500: Error de servidor (revisar logs)
- success: false en response (error en query)
```

---

## Rollback Plan

Si hay problemas después del deployment:

### Opción 1: Rollback de Vercel

```bash
# En Vercel Dashboard
1. Ir a Deployments
2. Encontrar deployment anterior (antes de este cambio)
3. Click en "..." → "Rollback to this deployment"
```

### Opción 2: Revert Git

```bash
git revert HEAD
git push origin main
```

### Opción 3: Fix Forward

Si el error es menor (typo, etc):
```bash
# Fix el código
git add .
git commit -m "fix: Public proyectos endpoint issue"
git push origin main
```

---

## Troubleshooting Common Issues

### Issue 1: Error 500 - Error al obtener proyectos

**Causa probable**: Variables de entorno no configuradas

**Solución**:
1. Verificar en Vercel Dashboard → Settings → Environment Variables
2. Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy

### Issue 2: CORS bloqueado

**Causa probable**: Headers no configurados correctamente

**Solución**:
1. Verificar que `OPTIONS` handler existe
2. Verificar que `corsHeaders()` retorna headers correctos
3. Testing con `curl -v` para ver headers

### Issue 3: Proyectos vacíos

**Causa probable**: No hay proyectos activos en la base de datos

**Solución**:
```sql
UPDATE proyectos SET activo = true WHERE id = 'uuid-del-proyecto';
```

### Issue 4: RLS bloquea lectura

**Causa probable**: Política RLS no permite lectura anónima

**Solución**:
```sql
-- Verificar que esta política existe
CREATE POLICY proyectos_select_anon ON proyectos
  FOR SELECT TO anon USING (true);
```

---

## Success Criteria

El deployment es exitoso si:

- [ ] Endpoint responde con status 200
- [ ] Response tiene estructura correcta (`success: true`, `proyectos: []`)
- [ ] CORS headers presentes en la respuesta
- [ ] Preflight request (OPTIONS) retorna 204
- [ ] Solo proyectos activos son retornados
- [ ] Proyectos están ordenados alfabéticamente

---

## Next Steps Después del Deployment

1. **Notificar al equipo móvil** con la URL del endpoint
2. **Coordinar testing** con la app móvil en staging
3. **Monitorear uso** en las primeras 48 horas
4. **Documentar en Wiki** del proyecto (si existe)

---

**Owner**: Backend Team
**Reviewer**: Project Manager
**Last Updated**: 23 Diciembre 2025
