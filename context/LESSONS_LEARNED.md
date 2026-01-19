# LESSONS_LEARNED - EcoPlaza Dashboard

> Lecciones aprendidas de errores y exitos. Consultar antes de repetir algo.

---

## Autenticacion

### Middleware debe ser minimal
- Solo validar JWT, no business logic
- `getUser()` > `getSession()` (validacion con servidor)
- Split useEffects previene infinite loops
- Timeout de 30s es balance optimo (tolerancia vs UX)

### Patron Client Component
- Proyecto usa 'use client' + useAuth() hook
- NO usar Server Components con getServerSession()
- Verificar patrones existentes antes de implementar

---

## Supabase

### Quirks importantes
- `.limit()` falla con JOINs → usar `.range()` o fetch separado
- Limite por defecto de 1000 registros → siempre especificar
- RLS policies con Server Actions necesitan policy para `anon` role

### RLS Policies
- SELECT policies restrictivas pueden bloquear UPDATE/DELETE
- Server Actions sin auth context fallan RLS
- NUNCA usar browser client en Server Actions, usar createServerClient con cookies
- Service role key bypass es anti-patron - evitar
- NUNCA hacer subquery a la misma tabla dentro de su policy (causa recursion 42P17)

---

## PostgreSQL

### Triggers
- Trigger cascades NO son confiables
- UPDATE dentro de trigger NO garantiza disparar otro trigger AFTER UPDATE
- Integrar logica relacionada en la misma funcion es mas robusto
- Probar con diferentes patrones de datos (1 registro vs 2+)

---

## Google Maps API

### Geocoding API Key Restrictions
- **Geocoding API NO soporta HTTP referer restrictions**
- Error: "API keys with referer restrictions cannot be used with this API"
- Las llamadas a Geocoding son **client-side** (desde el navegador)
- No se pueden proteger con IP restrictions porque la IP cambia por usuario
- **Solución:** Usar solo "API restrictions" (limitar qué APIs puede usar la key)
- En Google Cloud Console: Credentials → Edit API Key → API restrictions → Restrict key

### NEXT_PUBLIC_* Environment Variables
- Variables con prefijo `NEXT_PUBLIC_` se "bake" en el bundle client-side en compile time
- Cambiar `.env.local` NO tiene efecto inmediato en desarrollo
- **Requiere Hard Refresh:** Ctrl+Shift+R o reiniciar el servidor
- Si hay cacheo agresivo, puede requerir limpiar caché del navegador

---

## TypeScript

### Tuple types
- Usar tipos explicitos para arrays de tamano fijo
- `const color: [number, number, number] = [255, 0, 0]`
- NO `const color = [255, 0, 0]` (infiere readonly)

### PDF Generation (jsPDF)
- autoTable alignment requiere config en DOS lugares: headStyles.halign Y columnStyles[n].halign
- Margin consistency entre secciones y tablas

---

## UI/UX

### Convenciones obligatorias
```tsx
// Input number - SIEMPRE agregar onWheel
<input
  type="number"
  onWheel={(e) => e.currentTarget.blur()}
/>
```

### Fechas
- Usar `getFullYear()`, `getMonth()`, `getDate()` para fechas locales
- NO usar `toISOString()` (convierte a UTC)

### Tooltips
- Usar componente `@/components/shared/Tooltip`
- NO usar title nativo del navegador

---

## docx-templates (Contratos Word)

### Sintaxis FOR loops (CRITICO)
- Usar `IN` no `OF`: `{FOR item IN items}` (NO `{FOR item OF items}`)
- Acceder elementos con `$`: `{$item.campo}` (NO `{item.campo}`)
- Cerrar con nombre: `{END-FOR item}`
- Ejemplo completo:
  ```
  {FOR deposito IN depositos}
  {$deposito.fecha} - {$deposito.monto}
  {END-FOR deposito}
  ```
- NUNCA usar sintaxis Handlebars `{#array}...{/array}` (causa error JS private field)

### Comandos en parrafos separados (CRITICO)
- `{IF}`, `{END-IF}`, `{FOR}`, `{END-FOR}` SOLOS en su parrafo
- Usar ENTER (no Shift+Enter) para crear nuevo parrafo
- Multiples comandos en misma linea = error "infinite loop"

### Post-procesamiento
- Los comandos dejan parrafos vacios
- Usar `removeEmptyParagraphs()` con JSZip

### Variables
- Usar notacion de punto: `{cliente.nombres}`
- Condicionales con arrays: `{IF array.length}`

---

## Desarrollo General

### Principios clave
- Rollback es herramienta valida (no temer usarlo)
- Cambios quirurgicos > rewrites completos
- Documentacion exhaustiva previene errores futuros
- Testing incremental ahorra tiempo (FASE 1 antes de FASE 2)

### Commits
- NO incluir "Generated with Claude Code"
- NO incluir "Co-Authored-By: Claude"
- Razon: Empresas aun no entienden uso de IA

### Regla de Filtro por Proyecto
- TODO se filtra por proyecto seleccionado
- NUNCA mostrar datos globales a menos que se solicite
- Proyecto viene de localStorage (client) o cookies (server)

---

**Ultima Actualizacion:** 23 Diciembre 2025
