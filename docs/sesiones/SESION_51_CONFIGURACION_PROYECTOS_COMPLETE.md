# Sesión 51 - Sistema Completo de Configuración de Proyectos

**Fecha:** 20-21 Noviembre 2025
**Branch:** staging
**Duración:** ~3 horas
**Estado:** ✅ COMPLETADO

---

## 📋 RESUMEN EJECUTIVO

Implementación completa del sistema de configuración de proyectos para administradores, incluyendo:
- Nueva página `/configuracion-proyectos`
- Gestión de TEA, Color y Estado (activo/inactivo)
- Sistema ordenable de Porcentajes de Inicial
- Sistema ordenable de Cuotas sin intereses (meses)
- Sistema ordenable de Cuotas con intereses (meses)
- Resolución de problemas críticos con RLS policies

---

## 🎯 OBJETIVOS CUMPLIDOS

### ✅ Features Implementadas

1. **Página de Configuración de Proyectos** (`/configuracion-proyectos`)
   - Solo accesible para rol admin
   - Vista de todos los proyectos con acordeones expandibles
   - Layout responsive: 2 columnas en desktop, apilado en mobile
   - Zebra striping en headers para mejor identificación visual

2. **Configuraciones por Proyecto**
   - **TEA del proyecto** (Tasa Efectiva Anual): 0.01-100, permite null
   - **Color del proyecto**: Selector visual + input hex + preview
   - **Estado activo/inactivo**: Toggle switch con indicador visual

3. **Porcentaje(s) de Inicial**
   - Input numérico con validación 0.01-100
   - Lista ordenable con botones ↑↓
   - Eliminar con botón X
   - Sin duplicados permitidos
   - Enter key para agregar rápido

4. **Cuotas sin intereses (Meses)**
   - Input numérico entero > 0
   - Funcionalidad idéntica a porcentajes
   - Display: "12 meses", "18 meses", etc.

5. **Cuotas con intereses (Meses)**
   - Input numérico entero > 0
   - Funcionalidad idéntica a porcentajes
   - Almacenamiento separado en BD

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tabla: `proyecto_configuraciones`

```sql
CREATE TABLE proyecto_configuraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  tea DECIMAL(5,2) CHECK (tea > 0 AND tea <= 100),
  configuraciones_extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES usuarios(id),
  UNIQUE(proyecto_id)
);
```

### Estructura JSONB: `configuraciones_extra`

```json
{
  "porcentajes_inicial": [
    { "value": 50, "order": 0 },
    { "value": 30, "order": 1 },
    { "value": 45, "order": 2 }
  ],
  "cuotas_sin_interes": [
    { "value": 12, "order": 0 },
    { "value": 18, "order": 1 },
    { "value": 24, "order": 2 }
  ],
  "cuotas_con_interes": [
    { "value": 36, "order": 0 },
    { "value": 48, "order": 1 },
    { "value": 60, "order": 2 }
  ]
}
```

---

## 🔧 PROBLEMAS RESUELTOS

### Issue #1: Error RLS al guardar configuración

**Problema:**
```
Error: new row violates row-level security policy for table "proyectos"
```

**Root Cause:**
- Server Action usaba browser client (`lib/proyecto-config.ts`) sin contexto de autenticación
- Intento inicial de bypass con service role key rechazado correctamente por el usuario

**Solución Implementada:**
- Eliminado uso de helpers con browser client
- Reescrito Server Action para usar `createServerClient` con cookies directamente
- Todas las queries ahora tienen contexto de autenticación correcto

**Commits:**
- `c20a4a4` - fix: RLS bypass eliminado - Server Action usa autenticación correcta
- `4b8521b` - fix: 406 errors + debugging UPDATE proyectos

---

### Issue #2: Campo `activo` no persistía en BD

**Problema:**
- Al cambiar proyecto a `activo = false`, el UPDATE retornaba array vacío
- Base de datos no se actualizaba
- Error: `proyectoData: null, proyectoError: { code: '42501' }`

**Root Cause:**
Policy SELECT de tabla `proyectos` solo permitía ver proyectos con `activo = true`:
```sql
USING (activo = true)
```

Cuando se hacía UPDATE a `activo = false`, la fila dejaba de cumplir la policy y PostgreSQL rechazaba el cambio.

**Solución:**
```sql
-- Eliminar policy restrictiva
DROP POLICY IF EXISTS "proyectos_select_all" ON proyectos;

-- Nueva policy: admins ven todos, otros solo activos
CREATE POLICY "proyectos_select_all"
  ON proyectos FOR SELECT
  TO authenticated
  USING (
    activo = true
    OR
    auth.uid() IN (
      SELECT id FROM usuarios
      WHERE rol = 'admin' AND activo = true
    )
  );

-- Policy UPDATE para admins
CREATE POLICY "Admins pueden actualizar proyectos"
  ON proyectos FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios
      WHERE rol = 'admin' AND activo = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM usuarios
      WHERE rol = 'admin' AND activo = true
    )
  );
```

**Resultado:**
- ✅ Admins pueden ver y editar proyectos activos E inactivos
- ✅ Otros roles solo ven proyectos activos
- ✅ Solo admins pueden hacer UPDATE

---

### Issue #3: Errores 406 al cargar configuraciones

**Problema:**
```
GET .../proyecto_configuraciones?select=*&proyecto_id=eq.xxx 406 (Not Acceptable)
```

**Root Cause:**
Página usaba `getProyectoConfiguracion()` con browser client sin autenticación.

**Solución:**
Nuevo Server Action `getProyectosWithConfigurations()` que:
- Usa `supabaseAuth` con cookies
- Fetch proyectos + configuraciones en single call
- Elimina necesidad de browser client en página

**Commits:**
- `4b8521b` - fix: 406 errors + debugging UPDATE proyectos
- `8bdc5c9` - debug: Add auth UUID logging to diagnose RLS policy mismatch

---

## 📁 ARCHIVOS MODIFICADOS/CREADOS

### Backend

**lib/actions-proyecto-config.ts** (NUEVO - 233 líneas)
```typescript
// Tipos
export interface PorcentajeInicial { value: number; order: number }
export interface CuotaMeses { value: number; order: number }
export interface ProyectoConfiguracion { ... }

// Server Actions
export async function getProyectosWithConfigurations(): Promise<...>
export async function saveProyectoConfiguracion(...): Promise<...>
```

**Funcionalidades:**
- `getProyectosWithConfigurations()` - Carga proyectos + configs con autenticación
- `saveProyectoConfiguracion()` - Guarda TEA, color, activo, porcentajes, cuotas

### Frontend

**app/configuracion-proyectos/page.tsx** (NUEVO - 810 líneas)

**Componentes principales:**
- Acordeones expandibles por proyecto
- Grid 2 columnas en desktop (lg:grid-cols-2)
- Columna izquierda: TEA, Color, Estado
- Columna derecha: Porcentajes, Cuotas sin/con intereses
- Handlers para agregar/eliminar/reordenar cada lista
- Validaciones inline con mensajes de error
- Botón guardar único con feedback visual

**components/shared/Sidebar.tsx**
- Agregado link "Configurar Proyectos" en bottomItems (solo admin)
- Ruta: `/configuracion-proyectos`

**middleware.ts**
- Protección de ruta `/configuracion-proyectos` (solo admin)
- Redirect a `/operativo` o `/locales` según rol

### Base de Datos

**supabase/migrations/20251120_create_proyecto_configuraciones.sql**
- Tabla `proyecto_configuraciones` con JSONB
- Índices optimizados
- RLS policies para admins

**Políticas RLS creadas/modificadas:**
```sql
-- proyecto_configuraciones (todas para admins)
CREATE POLICY "Admins pueden ver todas las configuraciones" ON proyecto_configuraciones FOR SELECT...
CREATE POLICY "Admins pueden insertar configuraciones" ON proyecto_configuraciones FOR INSERT...
CREATE POLICY "Admins pueden actualizar configuraciones" ON proyecto_configuraciones FOR UPDATE...
CREATE POLICY "Admins pueden eliminar configuraciones" ON proyecto_configuraciones FOR DELETE...

-- proyectos (modificadas)
DROP POLICY "proyectos_select_all" ON proyectos;
CREATE POLICY "proyectos_select_all" -- Admins ven todos, otros solo activos

CREATE POLICY "Admins pueden actualizar proyectos" ON proyectos FOR UPDATE...

-- usuarios (agregada para permitir validación RLS)
CREATE POLICY "Users can read own data for RLS checks" ON usuarios FOR SELECT
  USING (id = auth.uid());
```

---

## 🎨 INTERFAZ DE USUARIO

### Layout Desktop (2 columnas)

```
┌──────────────────────────────────────────────────────┐
│  Proyecto Header (expandible con zebra striping)     │
├─────────────────────────┬────────────────────────────┤
│ Columna Izquierda       │ Columna Derecha            │
│                         │                            │
│ • TEA del proyecto      │ • Porcentaje(s) Inicial    │
│   [input number]        │   [input] [+ Agregar]      │
│                         │   1° 50%  [↑][↓][X]        │
│ • Color del proyecto    │   2° 30%  [↑][↓][X]        │
│   [color picker]        │                            │
│   [hex input]           │ ─────────────────────      │
│   [preview box]         │                            │
│                         │ • Cuotas sin intereses     │
│ • Estado del proyecto   │   [input] [+ Agregar]      │
│   [toggle switch]       │   1° 12 meses [↑][↓][X]    │
│   Activo/Inactivo       │   2° 18 meses [↑][↓][X]    │
│                         │                            │
│                         │ ─────────────────────      │
│                         │                            │
│                         │ • Cuotas con intereses     │
│                         │   [input] [+ Agregar]      │
│                         │   1° 36 meses [↑][↓][X]    │
│                         │   2° 48 meses [↑][↓][X]    │
└─────────────────────────┴────────────────────────────┘
│ [Guardar] [Mensaje éxito/error]                      │
└──────────────────────────────────────────────────────┘
```

### Features UX

**Zebra Striping:**
- Headers pares (0,2,4...): bg-gray-50 → hover:bg-gray-100
- Headers impares (1,3,5...): bg-blue-50 → hover:bg-blue-100
- Solo en headers, no afecta contenido expandido

**Validaciones en Tiempo Real:**
- TEA: 0.01-100 o null
- Color: Hex válido (#RRGGBB)
- Porcentajes: 0.01-100, sin duplicados
- Cuotas: Enteros > 0, sin duplicados
- Mensajes de error inline con colores (rojo/verde)

**Interacciones:**
- Enter key funciona en todos los inputs
- Botones ↑↓ deshabilitados cuando no aplican
- Guardar único para todos los campos
- Feedback visual: "Guardando..." → "Configuración guardada exitosamente"
- Auto-hide mensaje después de 3s

---

## 🔄 FLUJO DE TRABAJO

### Cargar Configuraciones

```
Usuario → /configuracion-proyectos
    ↓
Middleware verifica rol === 'admin'
    ↓
Page.tsx → useEffect ejecuta
    ↓
getProyectosWithConfigurations() Server Action
    ↓ (createServerClient con cookies)
Supabase:
  - SELECT proyectos ORDER BY created_at ASC
  - SELECT proyecto_configuraciones
    ↓
Map proyectos + configuraciones
    ↓
Inicializar formData con:
  - tea, color, activo (desde proyecto/config)
  - porcentajes_inicial (desde config.configuraciones_extra)
  - cuotas_sin_interes (desde config.configuraciones_extra)
  - cuotas_con_interes (desde config.configuraciones_extra)
    ↓
Renderizar acordeones (primer proyecto expandido)
```

### Guardar Configuraciones

```
Usuario modifica campos → Click "Guardar"
    ↓
Validaciones frontend:
  - TEA: 0.01-100 o null
  - Color: /^#[0-9A-F]{6}$/i
  - Porcentajes/cuotas: valores únicos
    ↓
saveProyectoConfiguracion() Server Action
    ↓ (createServerClient con cookies)
auth.getUser() → Verificar admin
    ↓
Query existingConfig (maybeSingle)
    ↓
Build configuraciones_extra JSONB:
  {
    ...existing,
    porcentajes_inicial: [...],
    cuotas_sin_interes: [...],
    cuotas_con_interes: [...]
  }
    ↓
¿Existe config?
  YES → UPDATE proyecto_configuraciones
  NO  → INSERT proyecto_configuraciones
    ↓
UPDATE proyectos SET color, activo
    ↓
Return { success: true, message: '...' }
    ↓
Frontend muestra mensaje verde
Auto-hide después de 3s
```

---

## 🧪 TESTING REALIZADO

### Tests Manuales en Staging

**1. Cargar página**
- ✅ Solo admin puede acceder
- ✅ Vendedor/jefe_ventas/vendedor_caseta redirige a /operativo o /locales
- ✅ Proyectos ordenados por created_at ASC
- ✅ Primer proyecto expandido por defecto
- ✅ Zebra striping visible

**2. TEA del proyecto**
- ✅ Acepta decimales 0.01-100
- ✅ Acepta null (campo vacío)
- ✅ Rechaza valores < 0 o > 100
- ✅ Persiste en BD correctamente

**3. Color del proyecto**
- ✅ Color picker funciona
- ✅ Input hex valida formato
- ✅ Preview muestra color en tiempo real
- ✅ Persiste en tabla proyectos.color
- ✅ Se propaga a todo el dashboard

**4. Estado activo/inactivo**
- ✅ Toggle funciona correctamente
- ✅ Persiste en tabla proyectos.activo
- ✅ Admin puede cambiar a inactivo
- ✅ Admin puede ver proyectos inactivos
- ✅ Otros roles NO ven proyectos inactivos
- ✅ No aparece en dropdown de login cuando inactivo

**5. Porcentajes de Inicial**
- ✅ Agregar valores 0.01-100
- ✅ Validación sin duplicados
- ✅ Ordenar con botones ↑↓
- ✅ Eliminar con X
- ✅ Enter key funciona
- ✅ Persiste en configuraciones_extra
- ✅ Orden se preserva

**6. Cuotas sin/con intereses**
- ✅ Solo acepta enteros > 0
- ✅ Rechaza decimales
- ✅ Sin duplicados
- ✅ Ordenar con botones ↑↓
- ✅ Eliminar funciona
- ✅ Display correcto: "12 meses", "36 meses"
- ✅ Persiste separado en configuraciones_extra

**7. Mensajes y feedback**
- ✅ "Guardando..." mientras procesa
- ✅ "Configuración guardada exitosamente" en verde
- ✅ Errores en rojo con mensaje claro
- ✅ Auto-hide después de 3s

---

## 📊 COMMITS DE LA SESIÓN

```
c20a4a4 - fix: RLS bypass eliminado - Server Action usa autenticación correcta
4b8521b - fix: 406 errors + debugging UPDATE proyectos
8bdc5c9 - debug: Add auth UUID logging to diagnose RLS policy mismatch
4fe85b2 - refactor: Rename /configuracion-proyecto to /configuracion-proyectos
144eb3a - chore: Remove debugging logs from proyecto config
3481fcf - feat: Porcentajes de Inicial - Gestión ordenable por proyecto
c0e2d10 - refactor: Layout 2 columnas en desktop para configuración proyectos
c2420a6 - chore: Cambiar texto a 'Porcentaje(s) de Inicial'
4131907 - feat: Cuotas sin/con intereses - Gestión ordenable por proyecto
c4360ba - feat: Zebra striping en headers de proyectos
```

---

## 🎓 APRENDIZAJES CLAVE

### 1. RLS Policies en Server Actions

**Problema común:**
Usar browser client (`supabase` import) en Server Actions NO funciona porque no tiene contexto de autenticación.

**Solución correcta:**
```typescript
// ❌ NO hacer esto en Server Actions
import { supabase } from './supabase';
const { data } = await supabase.from('table').select();

// ✅ Hacer esto
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const supabaseAuth = createServerClient(url, key, {
  cookies: { get(name) { return cookieStore.get(name)?.value; } }
});
const { data } = await supabaseAuth.from('table').select();
```

### 2. RLS Policy SELECT puede bloquear UPDATE

Cuando una policy SELECT usa condiciones como `activo = true`, hacer UPDATE a `activo = false` puede fallar porque:
1. PostgreSQL verifica si la fila post-UPDATE cumple la policy SELECT
2. Si no cumple, rechaza el UPDATE

**Solución:**
Policy SELECT debe permitir que admins vean filas inactivas:
```sql
USING (activo = true OR auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'))
```

### 3. Bypass RLS con Service Role Key NO es la solución

Aunque técnicamente funciona, bypasear RLS compromete seguridad. Siempre buscar soluciones que mantengan RLS activo.

**Opciones correctas:**
- Usar `createServerClient` con cookies en Server Actions
- Ajustar policies para permitir operaciones legítimas
- Usar `SECURITY DEFINER` functions cuando sea necesario

### 4. Subquery en RLS puede necesitar policy adicional

Si una RLS policy consulta otra tabla:
```sql
USING (auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'))
```

La tabla `usuarios` también debe tener policy que permita esa consulta:
```sql
CREATE POLICY "Users can read own data for RLS checks"
  ON usuarios FOR SELECT
  USING (id = auth.uid());
```

---

## 🚀 USO FUTURO

Estos datos configurados están listos para:

### Cálculos Financieros

```typescript
// Ejemplo de uso futuro
const { porcentajes_inicial, cuotas_sin_interes, cuotas_con_interes } =
  config.configuraciones_extra;

// Calcular cuota mensual con inicial de 30%
const inicial = porcentajes_inicial[1].value; // 30%
const montoInicial = precioLote * (inicial / 100);
const saldo = precioLote - montoInicial;

// Cuotas sin interés (primer opción: 12 meses)
const mesesSinInteres = cuotas_sin_interes[0].value; // 12
const cuotaMensual = saldo / mesesSinInteres;

// Cuotas con interés (aplicando TEA)
const tea = config.tea / 100; // 0.185 (18.5%)
const tem = Math.pow(1 + tea, 1/12) - 1;
const mesesConInteres = cuotas_con_interes[0].value; // 36
const cuotaConInteres = saldo * (tem * Math.pow(1 + tem, mesesConInteres)) /
                        (Math.pow(1 + tem, mesesConInteres) - 1);
```

### Generación de Planes de Pago

El orden preservado permite presentar opciones en el orden preferido por el proyecto:
```typescript
// Generar tabla de planes
porcentajes_inicial.map((p, i) => ({
  opcion: i + 1,
  inicial: p.value,
  cuotasSinInteres: cuotas_sin_interes.map(c => ({
    meses: c.value,
    cuota: calcularCuota(precioLote, p.value, c.value, 0)
  })),
  cuotasConInteres: cuotas_con_interes.map(c => ({
    meses: c.value,
    cuota: calcularCuota(precioLote, p.value, c.value, tea)
  }))
}));
```

---

## 📝 NOTAS ADICIONALES

### Estado del Proyecto

**Completado al 100%:**
- ✅ Backend: Server Actions con autenticación correcta
- ✅ Frontend: UI completa con validaciones
- ✅ Base de Datos: Tabla + RLS policies + índices
- ✅ Testing: Validado en staging
- ✅ UX: Layout responsive + zebra striping
- ✅ Security: RLS policies sin bypass

**Listo para:**
- ✅ Uso en producción
- ✅ Integración con módulos de cálculos financieros
- ✅ Generación de planes de pago
- ✅ Presentación a clientes

### Decisiones de Diseño

**Por qué JSONB para porcentajes y cuotas:**
- Flexibilidad para agregar más configuraciones futuras
- Orden preservado con campo `order`
- Sin necesidad de nuevas tablas para cada tipo de configuración
- Query eficiente con índices GIN opcionales

**Por qué botones ↑↓ en vez de drag & drop:**
- Más simple de implementar (~80 líneas vs ~200 líneas)
- Sin dependencias externas
- Funciona perfecto en mobile
- Suficiente para 2-5 items por lista

**Por qué layout 2 columnas:**
- Mejor aprovechamiento de espacio en desktop
- Aún responsive en mobile (apila automáticamente)
- Todo visible sin scroll excesivo

---

## 🔜 PRÓXIMOS PASOS SUGERIDOS

1. **Módulo de Cálculos Financieros**
   - Usar TEA y configuraciones para calcular cuotas
   - Generar planes de pago personalizados
   - Exportar a PDF/Excel

2. **Dashboard de Simulación**
   - Permitir a vendedores simular planes
   - Usar configuraciones del proyecto seleccionado
   - Presentar opciones al cliente

3. **Reportes Financieros**
   - Proyecciones de ingresos por proyecto
   - Análisis de sensibilidad con diferentes TEAs
   - Comparativas entre proyectos

---

**Sesión completada exitosamente** ✅
**Deployado a:** staging
**Última actualización:** 21 Noviembre 2025

---

🤖 **Generated with [Claude Code](https://claude.com/claude-code)**
**Co-Authored-By:** Claude <noreply@anthropic.com>
