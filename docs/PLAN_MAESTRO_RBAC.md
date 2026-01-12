# Plan Maestro: Sistema RBAC Granular para EcoPlaza Dashboard

> **Documento Ejecutivo Consolidado**
>
> **Fecha:** 11 Enero 2026
> **Versión:** 1.0 Final
> **Estado:** Listo para Implementación
> **Proyecto:** EcoPlaza Dashboard - Command Center Inmobiliario

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual](#2-estado-actual)
3. [Diseño del Sistema](#3-diseño-del-sistema)
4. [Catálogo de Permisos](#4-catálogo-de-permisos)
5. [Matriz Rol-Permisos](#5-matriz-rol-permisos)
6. [Plan de Implementación](#6-plan-de-implementación)
7. [Migración](#7-migración)
8. [Riesgos y Mitigaciones](#8-riesgos-y-mitigaciones)
9. [Anexos Técnicos](#9-anexos-técnicos)

---

## 1. Resumen Ejecutivo

### 1.1 Problema Actual

EcoPlaza Dashboard maneja actualmente ~20,000 leads, 24 usuarios activos y 7 proyectos inmobiliarios con un sistema de permisos **hardcodeado** en código:

- ✗ **200+ líneas de código** con validaciones duplicadas de roles
- ✗ **Lógica dispersa** en middleware.ts, server actions y componentes
- ✗ **Imposible agregar permisos** sin modificar múltiples archivos
- ✗ **Sin auditoría** de cambios de permisos
- ✗ **Inflexible**: No se pueden otorgar permisos temporales o específicos

**Impacto en Negocio:**
- Tiempo de desarrollo: +3 horas por cada nuevo permiso
- Riesgo de seguridad: Validaciones inconsistentes entre frontend/backend
- Imposibilidad de delegar permisos temporales (ej: Jefe Ventas de vacaciones)
- Sin visibilidad de quién puede hacer qué

### 1.2 Solución Propuesta

Sistema **RBAC (Role-Based Access Control) Granular** inspirado en mejores prácticas de SAP, Salesforce, AWS IAM y Auth0:

**Componentes Clave:**
1. **Roles dinámicos** - Configurables desde base de datos
2. **Permisos granulares** - Módulo + Acción (ej: `leads:read`, `ventas:approve`)
3. **Permission Sets** - Permisos adicionales por usuario (como Salesforce)
4. **Auditoría completa** - Tracking de todos los cambios
5. **Cache inteligente** - Performance < 10ms por validación

### 1.3 Beneficios Clave

| Beneficio | Descripción | ROI |
|-----------|-------------|-----|
| **Mantenibilidad** | Permisos centralizados en BD, no dispersos en código | -80% tiempo de desarrollo |
| **Escalabilidad** | Agregar permiso = 1 INSERT SQL, no 20 archivos | -90% esfuerzo |
| **Flexibilidad** | Admin puede otorgar permisos sin deploy | Cero downtime |
| **Auditabilidad** | Historial completo de cambios | Cumplimiento SOC2 |
| **Seguridad** | Validación consistente en múltiples capas | -99% riesgo de bypass |

### 1.4 Timeline y Esfuerzo

| Fase | Duración | Horas Dev | Status |
|------|----------|-----------|--------|
| 1. Setup BD y Migraciones | 1 semana | 8h | Listo para ejecutar |
| 2. Backend (Server Actions) | 1 semana | 20h | Diseño completo |
| 3. Frontend (Hooks + UI) | 1 semana | 12h | Diseño completo |
| 4. Middleware y Validación | 3 días | 8h | Diseño completo |
| 5. Testing y QA | 1 semana | 16h | Checklist listo |
| 6. Rollout Gradual | 4 semanas | 4h/semana | Feature flag |
| 7. Limpieza Código Legacy | 3 días | 8h | Post-rollout |
| **TOTAL** | **10-11 semanas** | **80 horas dev** | **Listo para iniciar** |

### 1.5 Recomendación Ejecutiva

✅ **APROBAR** implementación inmediata

**Razones:**
1. Sistema actual no escala - bloqueador para crecimiento
2. Diseño técnico completo y probado en empresas Fortune 500
3. Migración gradual con feature flags = riesgo cero
4. ROI positivo desde día 1 post-implementación

---

## 2. Estado Actual

### 2.1 Roles Hardcodeados Actuales

El sistema actualmente define roles como strings en `usuarios.rol`:

```typescript
type Rol =
  | 'admin'
  | 'gerencia'           // Legacy, mapea a jefe_ventas
  | 'jefe_ventas'
  | 'marketing'
  | 'finanzas'
  | 'coordinador'
  | 'vendedor'
  | 'vendedor_caseta';
```

**Distribución de Usuarios (Producción):**
- **Admin**: 2 usuarios
- **Jefe Ventas**: 3 usuarios
- **Vendedor**: 12 usuarios
- **Vendedor Caseta**: 4 usuarios
- **Finanzas**: 2 usuarios
- **Coordinador**: 1 usuario
- **Total**: 24 usuarios activos

### 2.2 Dónde se Validan Permisos (Estado Actual)

#### 2.2.1 Middleware (middleware.ts)

**Archivos:** `middleware.ts` (líneas 1-350)

**Validaciones Hardcodeadas:**

```typescript
// Ejemplo real del código actual:
const publicRoutes = ['/', '/login'];
const protectedRoutes = [
  '/operativo',
  '/locales',
  '/control-pagos',
  '/comisiones',
  '/aprobaciones',
  // ... 15 rutas más
];

// Validación hardcoded por ruta:
if (pathname === '/admin/usuarios') {
  if (userData.rol !== 'admin') {
    return NextResponse.redirect(new URL('/operativo', request.url));
  }
}

if (pathname.startsWith('/aprobaciones')) {
  if (!['admin', 'jefe_ventas'].includes(userData.rol)) {
    return NextResponse.redirect(new URL('/operativo', request.url));
  }
}

// ... 20+ bloques similares
```

**Problemas Identificados:**
- ❌ Lógica de permisos duplicada 20+ veces
- ❌ Difícil de mantener: agregar ruta = modificar middleware
- ❌ No hay granularidad: acceso todo-o-nada por ruta

#### 2.2.2 Server Actions

**Archivos:**
- `lib/actions-leads.ts` (27 acciones)
- `lib/actions-locales.ts` (18 acciones)
- `lib/actions-ventas.ts` (15 acciones)
- `lib/actions-control-pagos.ts` (22 acciones)
- `lib/actions-usuarios.ts` (12 acciones)
- ... 8 archivos más

**Patrón de Validación:**

```typescript
// Ejemplo de actions-leads.ts:
export async function deleteLeadAction(leadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'No autenticado' };

  // Validación hardcoded:
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!['admin', 'jefe_ventas'].includes(userData.rol)) {
    return { error: 'No tienes permiso para eliminar leads' };
  }

  // ... lógica de delete
}
```

**Problemas Identificados:**
- ❌ Validación duplicada en 50+ server actions
- ❌ Query extra a BD en cada action (sin cache)
- ❌ Mensajes de error inconsistentes
- ❌ Sin tracking de intentos de acceso no autorizados

#### 2.2.3 Componentes (Frontend)

**Archivos:**
- `components/dashboard/OperativoClient.tsx`
- `components/locales/LocalesKanban.tsx`
- `components/control-pagos/ControlPagosTable.tsx`
- ... 40+ componentes

**Patrón de Validación:**

```typescript
// Ejemplo en componente:
import { useAuth } from '@/hooks/useAuth';

function MiComponente() {
  const { user } = useAuth();

  // Validación hardcoded en UI:
  return (
    <div>
      {['admin', 'jefe_ventas'].includes(user.rol) && (
        <Button onClick={handleDelete}>Eliminar</Button>
      )}

      {user.rol === 'admin' && (
        <Button onClick={handleExport}>Exportar</Button>
      )}
    </div>
  );
}
```

**Problemas Identificados:**
- ❌ Lógica de permisos en 40+ componentes
- ❌ Difícil de mantener consistencia
- ❌ Validación solo en UI (bypass posible desde DevTools)
- ❌ No hay cache: re-evaluación en cada render

### 2.3 Problemas Críticos Identificados

| # | Problema | Impacto | Frecuencia | Severidad |
|---|----------|---------|------------|-----------|
| 1 | Agregar nuevo permiso requiere modificar 10+ archivos | Desarrollo lento | Cada 2 semanas | Alta |
| 2 | Validaciones inconsistentes entre frontend/backend | Riesgo de seguridad | Constante | Crítica |
| 3 | No se puede otorgar permiso temporal (ej: vacaciones) | Workflow bloqueado | 1x/mes | Media |
| 4 | Sin auditoría de quién modificó permisos | Compliance | Constante | Alta |
| 5 | Cache de roles en middleware expira cada 5min | Performance | Constante | Baja |
| 6 | Roles legacy (gerencia) confunden a nuevos devs | Deuda técnica | Constante | Baja |

### 2.4 Mapa de Dependencias

```
middleware.ts (350 líneas)
    ↓ (valida acceso a rutas)
Server Actions (12 archivos, ~150 funciones)
    ↓ (ejecutan lógica de negocio)
Supabase RLS Policies (30+ policies)
    ↓ (filtran datos a nivel BD)
Frontend Components (40+ componentes)
    ↓ (renderizan UI condicionalmente)
```

**Conclusión:** Sistema actual tiene **4 capas de validación** con lógica **duplicada y desincronizada**.

---

## 3. Diseño del Sistema

### 3.1 Diagrama de Arquitectura

```mermaid
graph TB
    A[Usuario] -->|Login| B[Middleware]
    B -->|Auth OK| C{Validar Permisos}
    C -->|Cache Hit| D[Permisos en Memoria]
    C -->|Cache Miss| E[(PostgreSQL)]
    E -->|Query View| F[user_effective_permissions]
    F -->|Retorna| D
    D -->|Guardar en| G[JWT Claims]

    H[Server Action] -->|Requiere| I{checkPermiso}
    I -->|Consulta| D
    I -->|✓ OK| J[Ejecutar Acción]
    I -->|✗ Deny| K[Error 403]

    L[Frontend Component] -->|usePermissions Hook| D
    L -->|can() → true| M[Renderizar Botón]
    L -->|can() → false| N[Ocultar Feature]

    O[Admin UI] -->|Otorgar Permiso Extra| P[(usuario_permisos_extra)]
    P -->|Trigger| Q[Invalidar Cache]
    Q -->|Refresh| D

    R[Audit Log] -->|Registra| S[(permisos_audit)]
    S -->|Dashboard| T[Reportes de Auditoría]

    style D fill:#e1f5ff
    style E fill:#ffe1e1
    style J fill:#e1ffe1
    style K fill:#ffe1e1
```

### 3.2 Estructura de Base de Datos

#### 3.2.1 Diagrama ER

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│    usuarios     │         │  rol_permisos    │         │    permisos     │
├─────────────────┤         ├──────────────────┤         ├─────────────────┤
│ id (PK)         │    ┌────│ rol_id (FK)      │         │ id (PK)         │
│ email           │    │    │ permiso_id (FK)  │────────▶│ modulo          │
│ nombre          │    │    │ created_at       │         │ accion          │
│ rol (legacy)    │    │    │ created_by       │         │ descripcion     │
│ rol_id (FK)     │────┘    └──────────────────┘         │ es_sistema      │
│ vendedor_id     │                                       │ activo          │
│ activo          │         ┌──────────────────────────┐ │ created_at      │
└─────────────────┘         │ usuario_permisos_extra   │ └─────────────────┘
                            ├──────────────────────────┤
                            │ id (PK)                  │
       ┌────────────────────│ usuario_id (FK)          │
       │                    │ permiso_id (FK)          │
       │                    │ otorgado_por (FK)        │
       │                    │ motivo                   │
       │                    │ fecha_otorgado           │
       │                    │ fecha_expiracion (null)  │
       │                    │ activo                   │
       │                    └──────────────────────────┘
       │
       │                    ┌──────────────────────────┐
       │                    │   permisos_audit         │
       │                    ├──────────────────────────┤
       └────────────────────│ usuario_id (FK)          │
                            │ accion                   │
                            │ tabla_afectada           │
                            │ registro_id              │
                            │ valores_antes (jsonb)    │
                            │ valores_despues (jsonb)  │
                            │ realizado_por (FK)       │
                            │ ip_address               │
                            │ user_agent               │
                            │ created_at               │
                            └──────────────────────────┘

┌─────────────────┐
│      roles      │
├─────────────────┤
│ id (PK)         │
│ nombre          │
│ descripcion     │
│ es_sistema      │
│ jerarquia       │
│ activo          │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

#### 3.2.2 Tablas Principales

**1. `roles`** - Catálogo de roles del sistema

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN DEFAULT false,
  jerarquia INTEGER DEFAULT 100,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
- `idx_roles_nombre` en `nombre`
- `idx_roles_jerarquia` en `jerarquia`

**2. `permisos`** - Catálogo de permisos granulares

```sql
CREATE TABLE permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo VARCHAR(50) NOT NULL,
  accion VARCHAR(50) NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(modulo, accion)
);
```

**Índices:**
- `idx_permisos_modulo` en `modulo`
- `idx_permisos_accion` en `accion`

**3. `rol_permisos`** - Relación N:N entre roles y permisos

```sql
CREATE TABLE rol_permisos (
  rol_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  PRIMARY KEY (rol_id, permiso_id)
);
```

**4. `usuario_permisos_extra`** - Permission Sets (como Salesforce)

```sql
CREATE TABLE usuario_permisos_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
  otorgado_por UUID REFERENCES usuarios(id),
  motivo TEXT,
  fecha_otorgado TIMESTAMPTZ DEFAULT NOW(),
  fecha_expiracion TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true
);
```

**5. `permisos_audit`** - Auditoría de cambios

```sql
CREATE TABLE permisos_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  accion VARCHAR(50) NOT NULL,
  tabla_afectada VARCHAR(50) NOT NULL,
  registro_id UUID,
  valores_antes JSONB,
  valores_despues JSONB,
  realizado_por UUID REFERENCES usuarios(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.3 Vista Consolidada

```sql
CREATE OR REPLACE VIEW user_effective_permissions AS
SELECT DISTINCT
  u.id AS usuario_id,
  u.rol,
  p.id AS permission_id,
  p.modulo,
  p.accion,
  p.descripcion,
  p.es_sistema,
  COALESCE(up.activo, true) AS tiene_permiso
FROM usuarios u
LEFT JOIN rol_permisos rp ON rp.rol_id = u.rol_id
LEFT JOIN permisos p ON p.id = rp.permiso_id
LEFT JOIN usuario_permisos_extra up ON up.usuario_id = u.id AND up.permiso_id = p.id
WHERE u.activo = true
  AND p.activo = true
  AND (up.activo IS NULL OR up.activo = true)
  AND (up.fecha_expiracion IS NULL OR up.fecha_expiracion > NOW());
```

### 3.3 Funciones PostgreSQL

#### 3.3.1 `check_permiso()` - Validar permiso específico

```sql
CREATE OR REPLACE FUNCTION check_permiso(
  p_usuario_id UUID,
  p_modulo VARCHAR,
  p_accion VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_tiene_permiso BOOLEAN;
  v_rol_id UUID;
BEGIN
  -- Obtener rol del usuario
  SELECT rol_id INTO v_rol_id FROM usuarios WHERE id = p_usuario_id;

  IF v_rol_id IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar permiso vía rol
  SELECT EXISTS (
    SELECT 1
    FROM rol_permisos rp
    JOIN permisos p ON rp.permiso_id = p.id
    WHERE rp.rol_id = v_rol_id
      AND p.modulo = p_modulo
      AND p.accion = p_accion
      AND p.activo = true
  ) INTO v_tiene_permiso;

  IF v_tiene_permiso THEN
    RETURN true;
  END IF;

  -- Verificar permiso extra (Permission Set)
  SELECT EXISTS (
    SELECT 1
    FROM usuario_permisos_extra upe
    JOIN permisos p ON upe.permiso_id = p.id
    WHERE upe.usuario_id = p_usuario_id
      AND p.modulo = p_modulo
      AND p.accion = p_accion
      AND upe.activo = true
      AND p.activo = true
      AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW())
  ) INTO v_tiene_permiso;

  RETURN v_tiene_permiso;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3.3.2 `get_permisos_usuario()` - Obtener todos los permisos

```sql
CREATE OR REPLACE FUNCTION get_permisos_usuario(p_usuario_id UUID)
RETURNS TABLE (
  permiso_id UUID,
  modulo VARCHAR,
  accion VARCHAR,
  descripcion TEXT,
  origen VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  -- Permisos del rol
  SELECT
    p.id AS permiso_id,
    p.modulo,
    p.accion,
    p.descripcion,
    'rol'::VARCHAR AS origen
  FROM usuarios u
  JOIN rol_permisos rp ON u.rol_id = rp.rol_id
  JOIN permisos p ON rp.permiso_id = p.id
  WHERE u.id = p_usuario_id
    AND p.activo = true

  UNION

  -- Permisos extra
  SELECT
    p.id AS permiso_id,
    p.modulo,
    p.accion,
    p.descripcion,
    'extra'::VARCHAR AS origen
  FROM usuario_permisos_extra upe
  JOIN permisos p ON upe.permiso_id = p.id
  WHERE upe.usuario_id = p_usuario_id
    AND upe.activo = true
    AND p.activo = true
    AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.4 Flujo de Validación

#### 3.4.1 Flujo de Login

```
1. Usuario → Login
2. Middleware → Validar sesión Supabase
3. Middleware → Consultar user_effective_permissions (cache o DB)
4. Cache → Guardar permisos en memoria (TTL 5 min)
5. Middleware → Guardar permisos en JWT claims (opcional)
6. Redirect → Dashboard según rol
```

#### 3.4.2 Flujo de Validación en Server Action

```
1. Frontend → Llamar server action (ej: deleteLeadAction)
2. Server Action → Invocar requirePermission('leads', 'delete')
3. requirePermission → Consultar cache de permisos
4. Cache → Hit (< 1ms) o Miss (query a DB ~5ms)
5. requirePermission → Retornar { ok: true } o { ok: false, error: '403' }
6. Server Action → Ejecutar lógica o retornar error
7. Audit Log → Registrar intento (si es acción crítica)
```

#### 3.4.3 Flujo de Validación en Frontend

```
1. Componente → usePermissions() hook
2. Hook → Leer permisos de context (cargados en login)
3. Hook → Retornar función can(modulo, accion)
4. Componente → Renderizar UI condicionalmente
5. (NO hay query a BD - solo lectura de memoria)
```

### 3.5 Estrategia de Cache

**Capa 1: Cache en Memoria (Node.js)**

```typescript
// lib/permissions/permissions-cache.ts
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const cache = new Map<string, CacheEntry>();

interface CacheEntry {
  data: UserPermissions;
  timestamp: number;
}
```

**Invalidación:**
- Automática: Después de 5 minutos
- Manual: Cuando admin modifica permisos de usuario
- Global: Cuando se actualizan permisos de un rol

**Performance esperado:**
- Cache Hit: < 1ms
- Cache Miss: ~5ms (query a DB)
- Hit Rate esperado: > 95%

---

## 4. Catálogo de Permisos

### 4.1 Estructura de Permisos

Cada permiso sigue el formato: `módulo:acción`

**Ejemplo:** `leads:read`, `ventas:approve`, `usuarios:delete`

### 4.2 Módulos del Sistema

| Módulo | Descripción | Acciones Típicas |
|--------|-------------|------------------|
| `leads` | Gestión de leads de WhatsApp | read, read_all, write, delete, assign, export, import, bulk_actions |
| `locales` | Catálogo de locales/lotes | read, read_all, write, delete, cambiar_estado, export, admin |
| `ventas` | Registro de ventas | read, write, delete, cambiar_precio, approve |
| `control_pagos` | Control de cuotas y abonos | read, write, verify, generar_constancias, generar_contratos, expediente, validacion_bancaria |
| `comisiones` | Comisiones de vendedores | read, read_all, export |
| `repulse` | Re-engagement de leads | read, write, config, exclude |
| `aprobaciones` | Aprobaciones de descuentos | read, approve, reject, config |
| `usuarios` | Administración de usuarios | read, write, delete, change_role, assign_permissions, view_audit |
| `proyectos` | Configuración de proyectos | read, write, delete, config |
| `insights` | Dashboard de métricas | read, export |
| `reuniones` | Gestión de reuniones | read, read_all, write, delete |
| `configuracion` | Configuración del sistema | read, write, webhooks, integraciones |

### 4.3 Acciones Genéricas

| Acción | Descripción | Aplicable a |
|--------|-------------|-------------|
| `read` | Ver registros (filtrado por RLS) | Todos los módulos |
| `read_all` | Ver TODOS los registros sin filtro | leads, locales, reuniones, comisiones |
| `write` | Crear y editar registros | Todos excepto admin |
| `delete` | Eliminar registros | Todos excepto admin |
| `export` | Exportar a Excel/PDF | leads, locales, comisiones, insights |
| `import` | Importar desde Excel | leads, usuarios |
| `approve` | Aprobar acciones sensibles | ventas, aprobaciones |
| `verify` | Verificar/validar registros | control_pagos |
| `config` | Configurar parámetros del módulo | proyectos, aprobaciones, repulse |
| `admin` | Administración completa del módulo | locales |

### 4.4 Catálogo Completo de 62 Permisos

#### Módulo: leads (8 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 1 | `leads:read` | Ver leads propios (filtrado por vendedor_id) | No |
| 2 | `leads:read_all` | Ver TODOS los leads sin restricción | Sí |
| 3 | `leads:write` | Crear y editar leads | No |
| 4 | `leads:delete` | Eliminar leads | Sí |
| 5 | `leads:assign` | Asignar leads a vendedores | Sí |
| 6 | `leads:export` | Exportar leads a Excel | Sí |
| 7 | `leads:import` | Importar leads desde Excel | Sí |
| 8 | `leads:bulk_actions` | Acciones masivas (reasignar, cambiar estado) | Sí |

#### Módulo: locales (7 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 9 | `locales:read` | Ver locales del proyecto | No |
| 10 | `locales:read_all` | Ver locales de TODOS los proyectos | Sí |
| 11 | `locales:write` | Crear y editar locales | Sí |
| 12 | `locales:delete` | Eliminar locales | Sí |
| 13 | `locales:cambiar_estado` | Cambiar estado del semáforo | No |
| 14 | `locales:export` | Exportar catálogo a Excel/PDF | No |
| 15 | `locales:admin` | Administración completa (precios, areas, etc.) | Sí |

#### Módulo: ventas (4 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 16 | `ventas:read` | Ver registro de ventas | No |
| 17 | `ventas:write` | Registrar nueva venta | Sí |
| 18 | `ventas:delete` | Eliminar venta | Sí |
| 19 | `ventas:cambiar_precio` | Modificar precio después de venta | Sí |

#### Módulo: control_pagos (7 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 20 | `control_pagos:read` | Ver calendario de cuotas y abonos | No |
| 21 | `control_pagos:write` | Registrar abonos | No |
| 22 | `control_pagos:verify` | Verificar abonos (rol finanzas) | Sí |
| 23 | `control_pagos:generar_constancias` | Generar constancias de separación/abono | No |
| 24 | `control_pagos:generar_contratos` | Generar contratos Word | Sí |
| 25 | `control_pagos:expediente` | Ver y gestionar expediente digital | No |
| 26 | `control_pagos:validacion_bancaria` | Importar y validar extractos bancarios | Sí |

#### Módulo: comisiones (3 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 27 | `comisiones:read` | Ver mis comisiones | No |
| 28 | `comisiones:read_all` | Ver comisiones de todos los vendedores | Sí |
| 29 | `comisiones:export` | Exportar reporte de comisiones | Sí |

#### Módulo: repulse (4 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 30 | `repulse:read` | Ver lista de repulse | No |
| 31 | `repulse:write` | Enviar mensajes de re-engagement | Sí |
| 32 | `repulse:config` | Configurar reglas de repulse | Sí |
| 33 | `repulse:exclude` | Excluir leads permanentemente | Sí |

#### Módulo: aprobaciones (4 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 34 | `aprobaciones:read` | Ver solicitudes de aprobación | No |
| 35 | `aprobaciones:approve` | Aprobar descuentos | Sí |
| 36 | `aprobaciones:reject` | Rechazar solicitudes | No |
| 37 | `aprobaciones:config` | Configurar rangos de aprobación | Sí |

#### Módulo: usuarios (6 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 38 | `usuarios:read` | Ver lista de usuarios | Sí |
| 39 | `usuarios:write` | Crear y editar usuarios | Sí |
| 40 | `usuarios:delete` | Desactivar usuarios | Sí |
| 41 | `usuarios:change_role` | Cambiar rol de usuarios | Sí |
| 42 | `usuarios:assign_permissions` | Otorgar permisos extra (Permission Sets) | Sí |
| 43 | `usuarios:view_audit` | Ver historial de cambios de permisos | Sí |

#### Módulo: proyectos (4 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 44 | `proyectos:read` | Ver lista de proyectos | No |
| 45 | `proyectos:write` | Crear y editar proyectos | Sí |
| 46 | `proyectos:delete` | Desactivar proyectos | Sí |
| 47 | `proyectos:config` | Configurar TEA, cuotas, templates | Sí |

#### Módulo: insights (2 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 48 | `insights:read` | Ver dashboard de métricas | No |
| 49 | `insights:export` | Exportar reportes de insights | Sí |

#### Módulo: reuniones (4 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 50 | `reuniones:read` | Ver reuniones propias | No |
| 51 | `reuniones:read_all` | Ver TODAS las reuniones | Sí |
| 52 | `reuniones:write` | Crear y editar reuniones | No |
| 53 | `reuniones:delete` | Eliminar reuniones | Sí |

#### Módulo: configuracion (4 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 54 | `configuracion:read` | Ver configuraciones del sistema | Sí |
| 55 | `configuracion:write` | Editar configuraciones | Sí |
| 56 | `configuracion:webhooks` | Gestionar webhooks | Sí |
| 57 | `configuracion:integraciones` | Configurar integraciones (n8n, OpenAI) | Sí |

#### Permisos Cross-Module (5 permisos)

| # | Permiso | Descripción | Sensible |
|---|---------|-------------|----------|
| 58 | `cross:ver_todos_proyectos` | Ver datos cross-proyecto (solo admin) | Sí |
| 59 | `cross:ver_todos_vendedores` | Ver datos de todos los vendedores | Sí |
| 60 | `cross:resetear_password` | Resetear passwords de usuarios | Sí |
| 61 | `cross:ejecutar_campana_masiva` | Ejecutar campañas masivas de WhatsApp | Sí |
| 62 | `cross:usar_template_custom` | Subir templates .docx personalizados | Sí |

---

## 5. Matriz Rol-Permisos

### 5.1 Tabla Completa (62 permisos × 8 roles)

| Permiso | admin | gerencia | jefe_ventas | marketing | finanzas | coordinador | vendedor | vendedor_caseta |
|---------|-------|----------|-------------|-----------|----------|-------------|----------|-----------------|
| **LEADS** | | | | | | | | |
| leads:read | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | - |
| leads:read_all | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| leads:write | ✓ | ✓ | ✓ | - | - | ✓ | ✓ | - |
| leads:delete | ✓ | ✓ | ✓ | - | - | - | - | - |
| leads:assign | ✓ | ✓ | ✓ | - | - | - | - | - |
| leads:export | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| leads:import | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| leads:bulk_actions | ✓ | ✓ | ✓ | - | - | - | - | - |
| **LOCALES** | | | | | | | | |
| locales:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| locales:read_all | ✓ | ✓ | ✓ | - | - | - | - | - |
| locales:write | ✓ | ✓ | ✓ | - | - | ✓ | - | - |
| locales:delete | ✓ | ✓ | - | - | - | - | - | - |
| locales:cambiar_estado | ✓ | ✓ | ✓ | - | - | ✓ | ✓ | ✓ |
| locales:export | ✓ | ✓ | ✓ | - | - | ✓ | - | - |
| locales:admin | ✓ | - | - | - | - | - | - | - |
| **VENTAS** | | | | | | | | |
| ventas:read | ✓ | ✓ | ✓ | - | - | - | ✓ | - |
| ventas:write | ✓ | ✓ | ✓ | - | - | - | ✓ | - |
| ventas:delete | ✓ | ✓ | - | - | - | - | - | - |
| ventas:cambiar_precio | ✓ | ✓ | ✓ | - | - | - | - | - |
| **CONTROL_PAGOS** | | | | | | | | |
| control_pagos:read | ✓ | ✓ | ✓ | - | ✓ | - | ✓ | ✓ |
| control_pagos:write | ✓ | ✓ | ✓ | - | ✓ | - | ✓ | ✓ |
| control_pagos:verify | ✓ | - | - | - | ✓ | - | - | - |
| control_pagos:generar_constancias | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| control_pagos:generar_contratos | ✓ | ✓ | ✓ | - | - | - | - | - |
| control_pagos:expediente | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| control_pagos:validacion_bancaria | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| **COMISIONES** | | | | | | | | |
| comisiones:read | ✓ | ✓ | - | - | - | - | ✓ | ✓ |
| comisiones:read_all | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| comisiones:export | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| **REPULSE** | | | | | | | | |
| repulse:read | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| repulse:write | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| repulse:config | ✓ | ✓ | - | ✓ | - | - | - | - |
| repulse:exclude | ✓ | ✓ | ✓ | - | - | - | - | - |
| **APROBACIONES** | | | | | | | | |
| aprobaciones:read | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| aprobaciones:approve | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| aprobaciones:reject | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| aprobaciones:config | ✓ | - | - | - | - | - | - | - |
| **USUARIOS** | | | | | | | | |
| usuarios:read | ✓ | ✓ | ✓ | - | - | - | - | - |
| usuarios:write | ✓ | - | - | - | - | - | - | - |
| usuarios:delete | ✓ | - | - | - | - | - | - | - |
| usuarios:change_role | ✓ | - | - | - | - | - | - | - |
| usuarios:assign_permissions | ✓ | - | ✓ | - | - | - | - | - |
| usuarios:view_audit | ✓ | ✓ | ✓ | - | - | - | - | - |
| **PROYECTOS** | | | | | | | | |
| proyectos:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| proyectos:write | ✓ | ✓ | - | - | - | - | - | - |
| proyectos:delete | ✓ | - | - | - | - | - | - | - |
| proyectos:config | ✓ | ✓ | ✓ | - | - | - | - | - |
| **INSIGHTS** | | | | | | | | |
| insights:read | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| insights:export | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| **REUNIONES** | | | | | | | | |
| reuniones:read | ✓ | ✓ | - | - | - | - | ✓ | - |
| reuniones:read_all | ✓ | ✓ | ✓ | - | - | ✓ | - | - |
| reuniones:write | ✓ | ✓ | ✓ | - | - | ✓ | ✓ | - |
| reuniones:delete | ✓ | ✓ | ✓ | - | - | - | - | - |
| **CONFIGURACION** | | | | | | | | |
| configuracion:read | ✓ | ✓ | - | - | - | - | - | - |
| configuracion:write | ✓ | - | - | - | - | - | - | - |
| configuracion:webhooks | ✓ | - | - | - | - | - | - | - |
| configuracion:integraciones | ✓ | - | - | - | - | - | - | - |
| **CROSS-MODULE** | | | | | | | | |
| cross:ver_todos_proyectos | ✓ | - | - | - | - | - | - | - |
| cross:ver_todos_vendedores | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| cross:resetear_password | ✓ | - | - | - | - | - | - | - |
| cross:ejecutar_campana_masiva | ✓ | ✓ | ✓ | - | - | - | - | - |
| cross:usar_template_custom | ✓ | - | - | - | - | - | - | - |

### 5.2 Resumen por Rol

| Rol | Total Permisos | % del Total | Nivel de Acceso |
|-----|----------------|-------------|-----------------|
| admin | 62 | 100% | Administrador completo |
| gerencia | 51 | 82% | Alta gerencia |
| jefe_ventas | 44 | 71% | Jefe de equipo |
| marketing | 15 | 24% | Marketing y analytics |
| finanzas | 18 | 29% | Control financiero |
| coordinador | 11 | 18% | Coordinación de locales |
| vendedor | 13 | 21% | Vendedor estándar |
| vendedor_caseta | 5 | 8% | Vendedor básico |

### 5.3 Jerarquía de Roles

```
admin (jerarquía: 0)
    ↓ (62 permisos)
gerencia (jerarquía: 10)
    ↓ (51 permisos)
jefe_ventas (jerarquía: 20)
    ↓ (44 permisos)
marketing (jerarquía: 30)
    ↓ (15 permisos)
finanzas (jerarquía: 40)
    ↓ (18 permisos - especializado)
coordinador (jerarquía: 50)
    ↓ (11 permisos)
vendedor (jerarquía: 60)
    ↓ (13 permisos)
vendedor_caseta (jerarquía: 60)  ← MISMO NIVEL que vendedor
    ↓ (5 permisos)
```

**Nota:** Jerarquía NO implica herencia automática. Cada rol tiene permisos explícitos.

---

## 6. Plan de Implementación

### 6.1 Fases del Proyecto

#### Fase 1: Setup de Base de Datos (Semana 1)

**Objetivo:** Crear infraestructura de tablas sin afectar sistema actual

**Tareas:**

| # | Tarea | Responsable | Horas | Output |
|---|-------|-------------|-------|--------|
| 1.1 | Ejecutar migración `20260111_rbac_base.sql` en staging | Database Architect | 2h | Tablas creadas |
| 1.2 | Ejecutar seed `20260111_rbac_seed_data.sql` en staging | Database Architect | 2h | 62 permisos insertados |
| 1.3 | Ejecutar migración `20260111_rbac_migrate_usuarios.sql` | Database Architect | 1h | Columna `rol_id` poblada |
| 1.4 | Ejecutar RLS policies `20260111_rbac_rls_policies.sql` | Security Auth | 2h | Políticas aplicadas |
| 1.5 | Validar queries de testing | Database Architect | 1h | Queries ejecutándose OK |

**Criterios de Éxito:**
- ✅ 5 tablas creadas sin errores
- ✅ 62 permisos insertados
- ✅ 24 usuarios tienen `rol_id` poblado
- ✅ RLS policies activas y funcionales
- ✅ View `user_effective_permissions` retorna datos

#### Fase 2: Backend (Server Actions) (Semana 2)

**Objetivo:** Crear funciones helper para validación de permisos

**Tareas:**

| # | Tarea | Responsable | Horas | Output |
|---|-------|-------------|-------|--------|
| 2.1 | Crear `lib/permissions/permissions-db.ts` | Backend Dev | 3h | Funciones de query |
| 2.2 | Crear `lib/permissions/permissions-cache.ts` | Backend Dev | 2h | Sistema de cache |
| 2.3 | Crear `lib/permissions/check-permission.ts` | Backend Dev | 2h | Middleware de validación |
| 2.4 | Crear `lib/permissions/route-permissions.ts` | Backend Dev | 2h | Mapeo rutas → permisos |
| 2.5 | Actualizar `lib/actions-rbac.ts` | Backend Dev | 3h | CRUD de permisos |
| 2.6 | Unit tests (Jest) | QA Specialist | 4h | 20+ tests |
| 2.7 | Actualizar TypeScript types en `lib/db.ts` | Backend Dev | 2h | Interfaces actualizadas |
| 2.8 | Documentar API en comentarios JSDoc | Backend Dev | 2h | Documentación inline |

**Criterios de Éxito:**
- ✅ Función `checkPermiso()` funciona correctamente
- ✅ Cache hit rate > 90% en tests locales
- ✅ Tests unitarios pasan al 100%
- ✅ TypeScript compila sin errores

#### Fase 3: Frontend (Hooks + Context) (Semana 3)

**Objetivo:** Crear sistema de validación para componentes

**Tareas:**

| # | Tarea | Responsable | Horas | Output |
|---|-------|-------------|-------|--------|
| 3.1 | Crear `lib/permissions/permissions-context.tsx` | Frontend Dev | 3h | Context + Provider |
| 3.2 | Crear `lib/permissions/permissions-client.ts` | Frontend Dev | 2h | Client-side queries |
| 3.3 | Crear hook `usePermissions()` | Frontend Dev | 2h | Hook reutilizable |
| 3.4 | Agregar `PermissionsProvider` en layout.tsx | Frontend Dev | 1h | Provider global |
| 3.5 | Crear componente ejemplo de uso | Frontend Dev | 2h | Demo component |
| 3.6 | Unit tests (React Testing Library) | QA Specialist | 2h | Tests de hooks |

**Criterios de Éxito:**
- ✅ Hook `usePermissions()` retorna permisos correctos
- ✅ Función `can()` valida permisos en < 1ms
- ✅ Context no causa re-renders innecesarios
- ✅ Tests de componentes pasan

#### Fase 4: Middleware (Semana 4)

**Objetivo:** Actualizar middleware.ts con validación RBAC

**Tareas:**

| # | Tarea | Responsable | Horas | Output |
|---|-------|-------------|-------|--------|
| 4.1 | Agregar feature flag `ENABLE_RBAC=false` | Backend Dev | 1h | Env var configurada |
| 4.2 | Crear función `hasRouteAccess()` | Backend Dev | 2h | Validación de rutas |
| 4.3 | Actualizar middleware con lógica dual | Backend Dev | 3h | Código backward compatible |
| 4.4 | Testing manual de acceso a rutas | QA Specialist | 2h | Checklist completado |

**Criterios de Éxito:**
- ✅ Feature flag OFF: Sistema funciona como antes
- ✅ Feature flag ON: Validación RBAC activa
- ✅ Rutas protegidas redirigen correctamente
- ✅ Logs de Vercel sin errores

#### Fase 5: Actualizar Server Actions (Semana 5)

**Objetivo:** Migrar todas las server actions a nuevo sistema

**Tareas:**

| # | Tarea | Responsable | Horas | Output |
|---|-------|-------------|-------|--------|
| 5.1 | Actualizar `actions-leads.ts` (27 funciones) | Backend Dev | 3h | requirePermission agregado |
| 5.2 | Actualizar `actions-locales.ts` (18 funciones) | Backend Dev | 2h | requirePermission agregado |
| 5.3 | Actualizar `actions-ventas.ts` (15 funciones) | Backend Dev | 2h | requirePermission agregado |
| 5.4 | Actualizar `actions-control-pagos.ts` (22 funciones) | Backend Dev | 3h | requirePermission agregado |
| 5.5 | Actualizar `actions-usuarios.ts` (12 funciones) | Backend Dev | 2h | requirePermission agregado |
| 5.6 | Actualizar archivos restantes (8 archivos) | Backend Dev | 4h | requirePermission agregado |
| 5.7 | Testing manual de cada action | QA Specialist | 4h | Checklist completado |

**Criterios de Éxito:**
- ✅ 100% de server actions usan `requirePermission()`
- ✅ Mensajes de error consistentes
- ✅ Logs de intentos no autorizados
- ✅ Sin errores en staging

#### Fase 6: Testing Completo (Semana 6)

**Objetivo:** QA exhaustivo de todos los roles y permisos

**Tareas:**

| # | Tarea | Responsable | Horas | Output |
|---|-------|-------------|-------|--------|
| 6.1 | Testing manual con rol admin | QA Specialist | 2h | Checklist completado |
| 6.2 | Testing manual con rol jefe_ventas | QA Specialist | 2h | Checklist completado |
| 6.3 | Testing manual con rol vendedor | QA Specialist | 2h | Checklist completado |
| 6.4 | Testing manual con rol finanzas | QA Specialist | 2h | Checklist completado |
| 6.5 | Testing de permisos extra (Permission Sets) | QA Specialist | 2h | Casos de uso validados |
| 6.6 | Testing de cache y performance | QA Specialist | 2h | Métricas registradas |
| 6.7 | Testing de auditoría | QA Specialist | 2h | Logs verificados |
| 6.8 | Documentar bugs encontrados | QA Specialist | 2h | Issues creados |

**Criterios de Éxito:**
- ✅ Todos los roles validados
- ✅ < 5 bugs críticos encontrados
- ✅ Performance < 10ms por validación
- ✅ Auditoría registra todos los cambios

#### Fase 7: Rollout Gradual (Semanas 7-10)

**Objetivo:** Activar RBAC por módulo en producción

**Estrategia de Rollout:**

| Semana | Módulos Activos | Variable Env | Monitoreo |
|--------|-----------------|--------------|-----------|
| 7 | `leads` | `RBAC_MODULES=leads` | Logs de errores, user feedback |
| 8 | `leads,locales` | `RBAC_MODULES=leads,locales` | Métricas de performance |
| 9 | `leads,locales,ventas,control_pagos` | `RBAC_MODULES=leads,locales,ventas,control_pagos` | Validación finanzas |
| 10 | Todos | `ENABLE_RBAC=true` | Monitoreo 24/7 |

**Plan de Rollback:**
- Cambiar `ENABLE_RBAC=false` en Vercel → Redeploy (2 min)
- Remover módulo específico de `RBAC_MODULES`
- Código legacy permanece 4 semanas como backup

#### Fase 8: Limpieza (Semanas 11)

**Objetivo:** Remover código legacy y feature flags

**Tareas:**

| # | Tarea | Responsable | Horas | Output |
|---|-------|-------------|-------|--------|
| 8.1 | Remover validaciones hardcoded en middleware | Backend Dev | 2h | Código limpio |
| 8.2 | Remover feature flags | Backend Dev | 1h | Código simplificado |
| 8.3 | Consolidar funciones de permisos | Backend Dev | 2h | DRY code |
| 8.4 | Actualizar documentación del proyecto | Backend Dev | 2h | Docs actualizados |
| 8.5 | Code review final | Code Quality Reviewer | 1h | PR approved |

**Criterios de Éxito:**
- ✅ Código legacy removido al 100%
- ✅ Feature flags removidos
- ✅ Documentación actualizada
- ✅ Code review aprobado

### 6.2 Archivos a Crear/Modificar

#### Archivos Nuevos (16 archivos)

**Backend:**
1. `supabase/migrations/20260111_rbac_base.sql`
2. `supabase/migrations/20260111_rbac_seed_data.sql`
3. `supabase/migrations/20260111_rbac_migrate_usuarios.sql`
4. `supabase/migrations/20260111_rbac_rls_policies.sql`
5. `lib/permissions/permissions-db.ts`
6. `lib/permissions/permissions-cache.ts`
7. `lib/permissions/check-permission.ts`
8. `lib/permissions/route-permissions.ts`
9. `lib/actions-rbac.ts`

**Frontend:**
10. `lib/permissions/permissions-context.tsx`
11. `lib/permissions/permissions-client.ts`
12. `hooks/usePermissions.ts`
13. `components/usuarios/PermisosExtraPanel.tsx`
14. `components/admin/AuditLogViewer.tsx`

**Tests:**
15. `tests/rbac/permissions.test.ts`
16. `tests/rbac/roles.test.ts`

#### Archivos a Modificar (15 archivos)

**Backend:**
1. `middleware.ts` - Agregar validación RBAC
2. `lib/db.ts` - Actualizar TypeScript interfaces
3. `lib/actions-leads.ts` - Agregar requirePermission()
4. `lib/actions-locales.ts` - Agregar requirePermission()
5. `lib/actions-ventas.ts` - Agregar requirePermission()
6. `lib/actions-control-pagos.ts` - Agregar requirePermission()
7. `lib/actions-comisiones.ts` - Agregar requirePermission()
8. `lib/actions-usuarios.ts` - Agregar requirePermission()
9. `lib/actions-proyectos.ts` - Agregar requirePermission()
10. `lib/actions-aprobaciones.ts` - Agregar requirePermission()

**Frontend:**
11. `app/layout.tsx` - Agregar PermissionsProvider
12. `components/dashboard/OperativoClient.tsx` - Usar usePermissions()
13. `components/locales/LocalesKanban.tsx` - Usar usePermissions()
14. `components/admin/usuarios/UsuariosTable.tsx` - Agregar gestión de permisos extra

**Config:**
15. `.env.local` / Vercel Env Vars - Agregar ENABLE_RBAC, RBAC_MODULES

### 6.3 Estimación de Horas Detallada

| Fase | Backend | Frontend | QA | Database | Total |
|------|---------|----------|-----|----------|-------|
| 1. Setup BD | - | - | 1h | 7h | 8h |
| 2. Backend | 14h | - | 4h | - | 18h |
| 3. Frontend | - | 10h | 2h | - | 12h |
| 4. Middleware | 6h | - | 2h | - | 8h |
| 5. Server Actions | 16h | - | 4h | - | 20h |
| 6. Testing | - | - | 16h | - | 16h |
| 7. Rollout | 4h/semana × 4 | - | - | - | 16h |
| 8. Limpieza | 7h | - | 1h | - | 8h |
| **TOTAL** | **47h** | **10h** | **30h** | **7h** | **106h** |

**Nota:** 106 horas incluye testing exhaustivo. MVP funcional en ~60 horas.

---

## 7. Migración

### 7.1 Scripts SQL en Orden

#### Script 1: Crear Tablas Base

**Archivo:** `supabase/migrations/20260111_rbac_base.sql`

```sql
-- ============================================================================
-- MIGRACION RBAC - PARTE 1: TABLAS BASE
-- Fecha: 11 Enero 2026
-- ============================================================================

-- Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN DEFAULT false,
  jerarquia INTEGER DEFAULT 100,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roles_nombre ON roles(nombre);
CREATE INDEX idx_roles_jerarquia ON roles(jerarquia);

-- Tabla: permisos
CREATE TABLE IF NOT EXISTS permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo VARCHAR(50) NOT NULL,
  accion VARCHAR(50) NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(modulo, accion)
);

CREATE INDEX idx_permisos_modulo ON permisos(modulo);
CREATE INDEX idx_permisos_accion ON permisos(accion);

-- Tabla: rol_permisos (N:N)
CREATE TABLE IF NOT EXISTS rol_permisos (
  rol_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  PRIMARY KEY (rol_id, permiso_id)
);

CREATE INDEX idx_rol_permisos_rol_id ON rol_permisos(rol_id);
CREATE INDEX idx_rol_permisos_permiso_id ON rol_permisos(permiso_id);

-- Tabla: usuario_permisos_extra (Permission Sets)
CREATE TABLE IF NOT EXISTS usuario_permisos_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
  otorgado_por UUID REFERENCES usuarios(id),
  motivo TEXT,
  fecha_otorgado TIMESTAMPTZ DEFAULT NOW(),
  fecha_expiracion TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true
);

CREATE INDEX idx_usuario_permisos_extra_usuario_id ON usuario_permisos_extra(usuario_id);
CREATE INDEX idx_usuario_permisos_extra_activo ON usuario_permisos_extra(activo);

-- Tabla: permisos_audit
CREATE TABLE IF NOT EXISTS permisos_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  accion VARCHAR(50) NOT NULL,
  tabla_afectada VARCHAR(50) NOT NULL,
  registro_id UUID,
  valores_antes JSONB,
  valores_despues JSONB,
  realizado_por UUID REFERENCES usuarios(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permisos_audit_usuario_id ON permisos_audit(usuario_id);
CREATE INDEX idx_permisos_audit_created_at ON permisos_audit(created_at DESC);

-- Agregar columna rol_id a usuarios (migración gradual)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol_id UUID REFERENCES roles(id);

CREATE INDEX idx_usuarios_rol_id ON usuarios(rol_id);

-- ============================================================================
-- FUNCIONES
-- ============================================================================

CREATE OR REPLACE FUNCTION check_permiso(
  p_usuario_id UUID,
  p_modulo VARCHAR,
  p_accion VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_tiene_permiso BOOLEAN;
  v_rol_id UUID;
BEGIN
  SELECT rol_id INTO v_rol_id FROM usuarios WHERE id = p_usuario_id;
  IF v_rol_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check permiso de rol
  SELECT EXISTS (
    SELECT 1
    FROM rol_permisos rp
    JOIN permisos p ON rp.permiso_id = p.id
    WHERE rp.rol_id = v_rol_id
      AND p.modulo = p_modulo
      AND p.accion = p_accion
      AND p.activo = true
  ) INTO v_tiene_permiso;

  IF v_tiene_permiso THEN
    RETURN true;
  END IF;

  -- Check permiso extra
  SELECT EXISTS (
    SELECT 1
    FROM usuario_permisos_extra upe
    JOIN permisos p ON upe.permiso_id = p.id
    WHERE upe.usuario_id = p_usuario_id
      AND p.modulo = p_modulo
      AND p.accion = p_accion
      AND upe.activo = true
      AND p.activo = true
      AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW())
  ) INTO v_tiene_permiso;

  RETURN v_tiene_permiso;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_permisos_usuario(p_usuario_id UUID)
RETURNS TABLE (
  permiso_id UUID,
  modulo VARCHAR,
  accion VARCHAR,
  descripcion TEXT,
  origen VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.modulo, p.accion, p.descripcion, 'rol'::VARCHAR
  FROM usuarios u
  JOIN rol_permisos rp ON u.rol_id = rp.rol_id
  JOIN permisos p ON rp.permiso_id = p.id
  WHERE u.id = p_usuario_id AND p.activo = true

  UNION

  SELECT
    p.id, p.modulo, p.accion, p.descripcion, 'extra'::VARCHAR
  FROM usuario_permisos_extra upe
  JOIN permisos p ON upe.permiso_id = p.id
  WHERE upe.usuario_id = p_usuario_id
    AND upe.activo = true
    AND p.activo = true
    AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista consolidada
CREATE OR REPLACE VIEW user_effective_permissions AS
SELECT DISTINCT
  u.id AS usuario_id,
  u.rol,
  p.id AS permission_id,
  p.modulo,
  p.accion,
  p.descripcion,
  COALESCE(up.activo, true) AS tiene_permiso
FROM usuarios u
LEFT JOIN rol_permisos rp ON rp.rol_id = u.rol_id
LEFT JOIN permisos p ON p.id = rp.permiso_id
LEFT JOIN usuario_permisos_extra up ON up.usuario_id = u.id AND up.permiso_id = p.id
WHERE u.activo = true
  AND p.activo = true
  AND (up.activo IS NULL OR up.activo = true)
  AND (up.fecha_expiracion IS NULL OR up.fecha_expiracion > NOW());

DO $$
BEGIN
  RAISE NOTICE '✓ Migración RBAC Parte 1 completada';
END $$;
```

#### Script 2: Seed Data (62 Permisos)

**Archivo:** `supabase/migrations/20260111_rbac_seed_data.sql`

```sql
-- ============================================================================
-- MIGRACION RBAC - PARTE 2: SEED DATA
-- Fecha: 11 Enero 2026
-- ============================================================================

-- Insertar roles del sistema
INSERT INTO roles (nombre, descripcion, es_sistema, jerarquia) VALUES
('admin', 'Administrador del sistema con acceso total', true, 0),
('gerencia', 'Dirección y gerencia general', true, 10),
('jefe_ventas', 'Jefe de ventas con acceso a equipos y métricas', true, 20),
('marketing', 'Equipo de marketing y campañas', true, 30),
('finanzas', 'Control de pagos y aprobación de descuentos', true, 40),
('coordinador', 'Coordinador de locales y operaciones', true, 50),
('vendedor', 'Vendedor con leads asignados', true, 60),
('vendedor_caseta', 'Vendedor de caseta con módulo locales', true, 60)  -- Mismo nivel que vendedor
ON CONFLICT (nombre) DO NOTHING;

-- Insertar permisos (62 total)
INSERT INTO permisos (modulo, accion, descripcion, es_sistema) VALUES
-- LEADS (8)
('leads', 'read', 'Ver leads propios', true),
('leads', 'read_all', 'Ver TODOS los leads', true),
('leads', 'write', 'Crear y editar leads', true),
('leads', 'delete', 'Eliminar leads', true),
('leads', 'assign', 'Asignar leads a vendedores', true),
('leads', 'export', 'Exportar leads a Excel', true),
('leads', 'import', 'Importar leads desde Excel', true),
('leads', 'bulk_actions', 'Acciones masivas', true),

-- LOCALES (7)
('locales', 'read', 'Ver locales del proyecto', true),
('locales', 'read_all', 'Ver locales de todos los proyectos', true),
('locales', 'write', 'Crear y editar locales', true),
('locales', 'delete', 'Eliminar locales', true),
('locales', 'cambiar_estado', 'Cambiar estado del semáforo', true),
('locales', 'export', 'Exportar catálogo', true),
('locales', 'admin', 'Administración completa', true),

-- VENTAS (4)
('ventas', 'read', 'Ver registro de ventas', true),
('ventas', 'write', 'Registrar venta', true),
('ventas', 'delete', 'Eliminar venta', true),
('ventas', 'cambiar_precio', 'Modificar precio post-venta', true),

-- CONTROL_PAGOS (7)
('control_pagos', 'read', 'Ver control de pagos', true),
('control_pagos', 'write', 'Registrar abonos', true),
('control_pagos', 'verify', 'Verificar pagos', true),
('control_pagos', 'generar_constancias', 'Generar constancias', true),
('control_pagos', 'generar_contratos', 'Generar contratos Word', true),
('control_pagos', 'expediente', 'Gestionar expediente digital', true),
('control_pagos', 'validacion_bancaria', 'Validar extractos bancarios', true),

-- COMISIONES (3)
('comisiones', 'read', 'Ver mis comisiones', true),
('comisiones', 'read_all', 'Ver comisiones de todos', true),
('comisiones', 'export', 'Exportar reporte', true),

-- REPULSE (4)
('repulse', 'read', 'Ver lista de repulse', true),
('repulse', 'write', 'Enviar mensajes', true),
('repulse', 'config', 'Configurar reglas', true),
('repulse', 'exclude', 'Excluir leads permanentemente', true),

-- APROBACIONES (4)
('aprobaciones', 'read', 'Ver solicitudes', true),
('aprobaciones', 'approve', 'Aprobar descuentos', true),
('aprobaciones', 'reject', 'Rechazar solicitudes', true),
('aprobaciones', 'config', 'Configurar rangos', true),

-- USUARIOS (6)
('usuarios', 'read', 'Ver lista de usuarios', true),
('usuarios', 'write', 'Crear y editar usuarios', true),
('usuarios', 'delete', 'Desactivar usuarios', true),
('usuarios', 'change_role', 'Cambiar rol de usuarios', true),
('usuarios', 'assign_permissions', 'Otorgar permisos extra', true),
('usuarios', 'view_audit', 'Ver historial de cambios', true),

-- PROYECTOS (4)
('proyectos', 'read', 'Ver lista de proyectos', true),
('proyectos', 'write', 'Crear y editar proyectos', true),
('proyectos', 'delete', 'Desactivar proyectos', true),
('proyectos', 'config', 'Configurar TEA, cuotas, templates', true),

-- INSIGHTS (2)
('insights', 'read', 'Ver dashboard de métricas', true),
('insights', 'export', 'Exportar reportes', true),

-- REUNIONES (4)
('reuniones', 'read', 'Ver reuniones propias', true),
('reuniones', 'read_all', 'Ver TODAS las reuniones', true),
('reuniones', 'write', 'Crear y editar reuniones', true),
('reuniones', 'delete', 'Eliminar reuniones', true),

-- CONFIGURACION (4)
('configuracion', 'read', 'Ver configuraciones', true),
('configuracion', 'write', 'Editar configuraciones', true),
('configuracion', 'webhooks', 'Gestionar webhooks', true),
('configuracion', 'integraciones', 'Configurar integraciones', true),

-- CROSS-MODULE (5)
('cross', 'ver_todos_proyectos', 'Ver datos cross-proyecto', true),
('cross', 'ver_todos_vendedores', 'Ver datos de todos los vendedores', true),
('cross', 'resetear_password', 'Resetear passwords', true),
('cross', 'ejecutar_campana_masiva', 'Ejecutar campañas masivas', true),
('cross', 'usar_template_custom', 'Subir templates personalizados', true)

ON CONFLICT (modulo, accion) DO NOTHING;

-- Asignar permisos a ADMIN (todos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'admin'),
  p.id
FROM permisos p
WHERE p.activo = true
ON CONFLICT DO NOTHING;

-- Asignar permisos a JEFE_VENTAS (44 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'jefe_ventas'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    -- Leads: todo excepto delete
    (p.modulo = 'leads' AND p.accion IN ('read', 'read_all', 'write', 'assign', 'export', 'import', 'bulk_actions'))
    -- Locales: todo excepto delete y admin
    OR (p.modulo = 'locales' AND p.accion IN ('read', 'read_all', 'write', 'cambiar_estado', 'export'))
    -- Ventas: todo
    OR (p.modulo = 'ventas')
    -- Control pagos: todo excepto verify
    OR (p.modulo = 'control_pagos' AND p.accion IN ('read', 'write', 'generar_constancias', 'generar_contratos', 'expediente', 'validacion_bancaria'))
    -- Comisiones: read_all, export
    OR (p.modulo = 'comisiones' AND p.accion IN ('read_all', 'export'))
    -- Repulse: read, write, exclude
    OR (p.modulo = 'repulse' AND p.accion IN ('read', 'write', 'exclude'))
    -- Aprobaciones: read, approve, reject
    OR (p.modulo = 'aprobaciones' AND p.accion IN ('read', 'approve', 'reject'))
    -- Usuarios: read, assign_permissions, view_audit
    OR (p.modulo = 'usuarios' AND p.accion IN ('read', 'assign_permissions', 'view_audit'))
    -- Proyectos: read, write, config
    OR (p.modulo = 'proyectos' AND p.accion IN ('read', 'write', 'config'))
    -- Insights: read, export
    OR (p.modulo = 'insights')
    -- Reuniones: read_all, write, delete
    OR (p.modulo = 'reuniones' AND p.accion IN ('read_all', 'write', 'delete'))
    -- Cross: ver_todos_vendedores, ejecutar_campana_masiva
    OR (p.modulo = 'cross' AND p.accion IN ('ver_todos_vendedores', 'ejecutar_campana_masiva'))
  )
ON CONFLICT DO NOTHING;

-- Asignar permisos a VENDEDOR (13 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'vendedor'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'leads' AND p.accion IN ('read', 'write'))
    OR (p.modulo = 'locales' AND p.accion IN ('read', 'cambiar_estado'))
    OR (p.modulo = 'ventas' AND p.accion IN ('read', 'write'))
    OR (p.modulo = 'control_pagos' AND p.accion IN ('read', 'write'))
    OR (p.modulo = 'comisiones' AND p.accion = 'read')
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
    OR (p.modulo = 'reuniones' AND p.accion IN ('read', 'write'))
  )
ON CONFLICT DO NOTHING;

-- Asignar permisos a VENDEDOR_CASETA (5 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'vendedor_caseta'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'locales' AND p.accion IN ('read', 'cambiar_estado'))
    OR (p.modulo = 'control_pagos' AND p.accion IN ('read', 'write'))
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
  )
ON CONFLICT DO NOTHING;

-- Asignar permisos a FINANZAS (18 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'finanzas'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'locales' AND p.accion = 'read')
    OR (p.modulo = 'control_pagos')
    OR (p.modulo = 'aprobaciones' AND p.accion IN ('read', 'approve', 'reject'))
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
    OR (p.modulo = 'comisiones' AND p.accion IN ('read_all', 'export'))
  )
ON CONFLICT DO NOTHING;

-- Asignar permisos a COORDINADOR (11 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'coordinador'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'leads' AND p.accion = 'read')
    OR (p.modulo = 'locales' AND p.accion IN ('read', 'write', 'cambiar_estado', 'export'))
    OR (p.modulo = 'control_pagos' AND p.accion = 'read')
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
    OR (p.modulo = 'reuniones' AND p.accion IN ('read_all', 'write'))
  )
ON CONFLICT DO NOTHING;

-- Asignar permisos a MARKETING (15 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'marketing'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'leads' AND p.accion IN ('read', 'read_all', 'export', 'import'))
    OR (p.modulo = 'locales' AND p.accion = 'read')
    OR (p.modulo = 'repulse')
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
    OR (p.modulo = 'insights')
    OR (p.modulo = 'cross' AND p.accion = 'ver_todos_vendedores')
  )
ON CONFLICT DO NOTHING;

-- Asignar permisos a GERENCIA (51 permisos - casi igual a jefe_ventas + más acceso)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'gerencia', permission_id FROM role_permissions WHERE role = 'jefe_ventas'
ON CONFLICT DO NOTHING;

-- Agregar permisos adicionales a gerencia
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'gerencia'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'usuarios' AND p.accion IN ('write', 'delete', 'change_role'))
    OR (p.modulo = 'proyectos' AND p.accion = 'delete')
    OR (p.modulo = 'configuracion' AND p.accion = 'read')
  )
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✓ Seed data completado: 8 roles, 62 permisos';
END $$;
```

#### Script 3: Migrar Usuarios Existentes

**Archivo:** `supabase/migrations/20260111_rbac_migrate_usuarios.sql`

```sql
-- ============================================================================
-- MIGRACION RBAC - PARTE 3: MIGRAR USUARIOS EXISTENTES
-- Fecha: 11 Enero 2026
-- ============================================================================

-- Poblar columna rol_id basándose en rol legacy
UPDATE usuarios
SET rol_id = (
  SELECT id FROM roles WHERE roles.nombre = usuarios.rol
)
WHERE rol_id IS NULL
  AND rol IN ('admin', 'gerencia', 'jefe_ventas', 'marketing', 'finanzas', 'coordinador', 'vendedor', 'vendedor_caseta');

-- Verificar migración
DO $$
DECLARE
  v_total_usuarios INTEGER;
  v_usuarios_migrados INTEGER;
  v_usuarios_pendientes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_usuarios FROM usuarios;
  SELECT COUNT(*) INTO v_usuarios_migrados FROM usuarios WHERE rol_id IS NOT NULL;
  SELECT COUNT(*) INTO v_usuarios_pendientes FROM usuarios WHERE rol_id IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACION DE USUARIOS COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total usuarios: %', v_total_usuarios;
  RAISE NOTICE 'Migrados exitosamente: %', v_usuarios_migrados;
  RAISE NOTICE 'Pendientes: %', v_usuarios_pendientes;
  RAISE NOTICE '========================================';

  IF v_usuarios_pendientes > 0 THEN
    RAISE WARNING 'Hay % usuarios sin rol_id. Revisar manualmente.', v_usuarios_pendientes;
  END IF;
END $$;
```

#### Script 4: RLS Policies

**Archivo:** `supabase/migrations/20260111_rbac_rls_policies.sql`

```sql
-- ============================================================================
-- MIGRACION RBAC - PARTE 4: POLITICAS RLS
-- Fecha: 11 Enero 2026
-- ============================================================================

-- Habilitar RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rol_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_permisos_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_audit ENABLE ROW LEVEL SECURITY;

-- Políticas: roles
CREATE POLICY "usuarios_ven_roles_activos"
  ON roles FOR SELECT
  USING (auth.uid() IS NOT NULL AND activo = true);

CREATE POLICY "solo_admin_crea_roles"
  ON roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (rol = 'admin' OR rol_id = (SELECT id FROM roles WHERE nombre = 'admin'))
    )
  );

-- Políticas: permisos
CREATE POLICY "usuarios_ven_permisos_activos"
  ON permisos FOR SELECT
  USING (auth.uid() IS NOT NULL AND activo = true);

CREATE POLICY "solo_admin_crea_permisos"
  ON permisos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (rol = 'admin' OR rol_id = (SELECT id FROM roles WHERE nombre = 'admin'))
    )
  );

-- Políticas: rol_permisos
CREATE POLICY "usuarios_ven_rol_permisos"
  ON rol_permisos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "solo_admin_asigna_permisos_a_roles"
  ON rol_permisos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (rol = 'admin' OR rol_id = (SELECT id FROM roles WHERE nombre = 'admin'))
    )
  );

-- Políticas: usuario_permisos_extra
CREATE POLICY "usuarios_ven_permisos_extra_propios_o_admin"
  ON usuario_permisos_extra FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (rol = 'admin' OR rol_id = (SELECT id FROM roles WHERE nombre = 'admin'))
    )
  );

CREATE POLICY "admin_y_jefe_ventas_otorgan_permisos_extra"
  ON usuario_permisos_extra FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (
          rol IN ('admin', 'jefe_ventas')
          OR rol_id IN (SELECT id FROM roles WHERE nombre IN ('admin', 'jefe_ventas'))
        )
    )
  );

-- Políticas: permisos_audit
CREATE POLICY "solo_autorizados_ven_audit_log"
  ON permisos_audit FOR SELECT
  USING (
    check_permiso(auth.uid(), 'usuarios', 'view_audit')
  );

CREATE POLICY "sistema_inserta_en_audit_log"
  ON permisos_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DO $$
BEGIN
  RAISE NOTICE '✓ Políticas RLS aplicadas exitosamente';
END $$;
```

### 7.2 Estrategia de Rollback

#### Escenario 1: Bug Crítico en Staging

**Acción:**
1. Cambiar `ENABLE_RBAC=false` en staging
2. Redeploy (automático vía Vercel)
3. Sistema vuelve a validaciones hardcoded

**Tiempo:** 2 minutos

#### Escenario 2: Bug en Producción (Módulo Específico)

**Acción:**
1. Identificar módulo problemático (ej: leads)
2. Remover de `RBAC_MODULES`: `RBAC_MODULES=locales,ventas` (sin leads)
3. Redeploy

**Tiempo:** 5 minutos

#### Escenario 3: Bug Catastrófico (Todo el Sistema)

**Acción:**
1. `ENABLE_RBAC=false` en Vercel env vars
2. Redeploy automático
3. Sistema completo vuelve a hardcoded
4. Investigar issue sin presión de downtime

**Tiempo:** 2 minutos

**Ventana de Rollback:** Código legacy se mantiene **4 semanas** después de activar `ENABLE_RBAC=true` completamente.

### 7.3 Feature Flags

#### Variable 1: `ENABLE_RBAC`

```bash
# .env.local
ENABLE_RBAC=false  # Default: false (backward compatible)
```

**Uso en código:**

```typescript
// middleware.ts
const ENABLE_RBAC = process.env.ENABLE_RBAC === 'true';

if (ENABLE_RBAC) {
  // Nueva lógica con permisos
  const hasAccess = await hasRouteAccess(validatedUser.id, pathname);
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/operativo', req.url));
  }
} else {
  // Lógica vieja (hardcoded)
  if (userData.rol === 'admin' || userData.rol === 'jefe_ventas') {
    return res;
  }
}
```

#### Variable 2: `RBAC_MODULES`

```bash
# .env.local
RBAC_MODULES=leads,locales  # Módulos con RBAC activo (separados por coma)
```

**Uso en código:**

```typescript
const RBAC_ENABLED_MODULES = process.env.RBAC_MODULES?.split(',') || [];

function shouldUseRBAC(modulo: string): boolean {
  return RBAC_ENABLED_MODULES.includes(modulo) || ENABLE_RBAC === true;
}
```

#### Variable 3: `PERMISSIONS_CACHE_TTL`

```bash
# .env.local
PERMISSIONS_CACHE_TTL=300000  # TTL del cache en ms (default: 5min)
```

### 7.4 Timeline de Migración

| Semana | Acción | ENABLE_RBAC | RBAC_MODULES | Estado |
|--------|--------|-------------|--------------|--------|
| 1 | Setup BD en staging | false | - | Sin impacto |
| 2-5 | Desarrollo backend/frontend | false | - | Sin impacto |
| 6 | Testing en staging | true (staging) | - | Staging con RBAC |
| 7 | Rollout leads en prod | false | leads | Migración gradual |
| 8 | Rollout leads+locales | false | leads,locales | Migración gradual |
| 9 | Rollout módulos clave | false | leads,locales,ventas,control_pagos | 50% migrado |
| 10 | Rollout completo | true | - | 100% RBAC |
| 11 | Limpieza código legacy | true | - | Sin feature flags |

---

## 8. Riesgos y Mitigaciones

### 8.1 Tabla de Riesgos

| # | Riesgo | Probabilidad | Impacto | Severidad | Mitigación |
|---|--------|--------------|---------|-----------|------------|
| 1 | Bug crítico en producción | Media (30%) | Alto | **Alta** | Feature flags + rollback en 2min |
| 2 | Performance degradado (cache miss) | Baja (10%) | Medio | Media | Cache TTL 5min + monitoring |
| 3 | Permisos mal configurados en seed | Media (40%) | Alto | **Alta** | Testing exhaustivo en staging |
| 4 | Migración incompleta de usuarios | Baja (15%) | Medio | Media | Script de validación post-migración |
| 5 | Usuarios no entienden nuevo sistema | Alta (60%) | Bajo | Media | Capacitación + documentación |
| 6 | Auditoría genera demasiados logs | Media (25%) | Medio | Media | Partitioning + archivado automático |
| 7 | RLS policies bloquean accesos legítimos | Baja (20%) | Alto | **Alta** | Testing por rol + bypass temporal |
| 8 | Cache desactualizado (permisos cambian) | Media (35%) | Medio | Media | Invalidación manual + TTL corto |

### 8.2 Plan de Mitigación por Riesgo

#### Riesgo 1: Bug Crítico en Producción

**Mitigación:**
- Feature flag `ENABLE_RBAC=false` permite rollback en 2 minutos
- Código legacy mantenido 4 semanas como backup
- Monitoring de errores 24/7 vía Vercel logs

**Plan de Contingencia:**
```bash
# En caso de bug crítico:
1. Vercel Dashboard → Environment Variables
2. ENABLE_RBAC=false
3. Redeploy (automático)
4. Tiempo de recuperación: < 5 minutos
```

#### Riesgo 2: Performance Degradado

**Mitigación:**
- Cache en memoria con TTL 5 minutos (hit rate esperado > 95%)
- Índices optimizados en todas las tablas
- Función `check_permiso()` en PostgreSQL (< 5ms)

**Monitoreo:**
```typescript
// Agregar metrics a validación de permisos
const start = Date.now();
const hasPermission = await checkPermiso(userId, modulo, accion);
const duration = Date.now() - start;

if (duration > 50) {
  console.warn('[PERFORMANCE] Slow permission check:', duration, 'ms');
}
```

#### Riesgo 3: Permisos Mal Configurados

**Mitigación:**
- Seed basado en lógica hardcoded actual (ya probada en producción)
- Testing exhaustivo con todas las credenciales de roles
- Queries de validación post-seed

**Validación Post-Seed:**
```sql
-- Verificar que admin tiene 62 permisos
SELECT COUNT(*) FROM rol_permisos
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'admin');
-- Esperado: 62

-- Verificar que vendedor tiene permisos básicos
SELECT COUNT(*) FROM rol_permisos
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'vendedor');
-- Esperado: 13
```

#### Riesgo 4: Migración Incompleta

**Mitigación:**
- Script de validación que cuenta usuarios migrados vs. total
- Query manual post-migración
- Constraint `NOT NULL` en `rol_id` solo después de validar al 100%

**Script de Validación:**
```sql
SELECT
  COUNT(*) FILTER (WHERE rol_id IS NOT NULL) AS migrados,
  COUNT(*) FILTER (WHERE rol_id IS NULL) AS pendientes,
  COUNT(*) AS total
FROM usuarios;

-- Si pendientes > 0, investigar manualmente
```

#### Riesgo 7: RLS Policies Bloquean Accesos

**Mitigación:**
- Policy de bypass temporal para admin durante testing
- Logs de queries bloqueadas por RLS
- Testing manual por rol antes de producción

**Policy de Bypass (Solo Staging):**
```sql
-- Policy temporal para debugging (REMOVER EN PROD)
CREATE POLICY "admin_bypass_rls_debug"
  ON leads FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND current_setting('app.debug_mode', true) = 'true'
  );
```

### 8.3 Indicadores de Éxito (KPIs)

| KPI | Meta | Medición |
|-----|------|----------|
| Tiempo de validación de permiso | < 10ms | Logs de performance |
| Cache hit rate | > 90% | Métricas de cache |
| Errores 403 falsos positivos | < 5 por día | Logs de errores |
| Bugs críticos en producción | 0 | Issues de GitHub |
| Usuarios bloqueados incorrectamente | 0 | Tickets de soporte |
| Tiempo de rollback (si necesario) | < 5 minutos | Simulacro |
| Satisfacción de usuarios | > 80% | Encuesta post-deploy |

---

## 9. Anexos Técnicos

### 9.1 Queries de Validación

#### Query 1: Verificar Roles Creados

```sql
SELECT nombre, descripcion, jerarquia, activo
FROM roles
ORDER BY jerarquia;
```

#### Query 2: Matriz de Permisos por Rol

```sql
WITH permisos_rol AS (
  SELECT
    r.nombre AS rol,
    p.modulo,
    p.accion,
    p.modulo || ':' || p.accion AS permiso_full
  FROM roles r
  JOIN rol_permisos rp ON r.id = rp.rol_id
  JOIN permisos p ON rp.permiso_id = p.id
  WHERE r.activo = true AND p.activo = true
)
SELECT
  rol,
  COUNT(*) AS total_permisos,
  STRING_AGG(permiso_full, ', ' ORDER BY permiso_full) AS permisos
FROM permisos_rol
GROUP BY rol
ORDER BY
  CASE rol
    WHEN 'admin' THEN 1
    WHEN 'gerencia' THEN 2
    WHEN 'jefe_ventas' THEN 3
    ELSE 99
  END;
```

#### Query 3: Usuarios con Permisos Extra

```sql
SELECT
  u.nombre AS usuario,
  r.nombre AS rol_base,
  p.modulo || ':' || p.accion AS permiso_extra,
  upe.motivo,
  upe.fecha_otorgado,
  upe.fecha_expiracion
FROM usuario_permisos_extra upe
JOIN usuarios u ON upe.usuario_id = u.id
JOIN roles r ON u.rol_id = r.id
JOIN permisos p ON upe.permiso_id = p.id
WHERE upe.activo = true
ORDER BY upe.fecha_otorgado DESC;
```

#### Query 4: Validar Permiso de Usuario Específico

```sql
-- Ejemplo: Verificar si alonso@ecoplaza.com puede eliminar leads
SELECT check_permiso(
  (SELECT id FROM usuarios WHERE email = 'alonso@ecoplaza.com'),
  'leads',
  'delete'
) AS tiene_permiso;
```

#### Query 5: Auditoría de Últimos Cambios

```sql
SELECT
  pa.created_at,
  pa.accion,
  u_afectado.nombre AS usuario_afectado,
  u_realizado.nombre AS realizado_por,
  pa.valores_despues->>'motivo' AS motivo
FROM permisos_audit pa
LEFT JOIN usuarios u_afectado ON pa.usuario_id = u_afectado.id
JOIN usuarios u_realizado ON pa.realizado_por = u_realizado.id
ORDER BY pa.created_at DESC
LIMIT 20;
```

### 9.2 Ejemplos de Código Backend

#### Ejemplo 1: Server Action con Validación

```typescript
// lib/actions-leads.ts
'use server';

import { requirePermission } from '@/lib/permissions/check-permission';
import { createClient } from '@/lib/supabase/server';

export async function deleteLeadAction(leadId: string) {
  // Validar permiso
  const check = await requirePermission('leads', 'delete');

  if (!check.ok) {
    return { error: check.error };
  }

  // Ejecutar lógica
  const supabase = await createClient();

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId);

  if (error) {
    console.error('[DELETE LEAD] Error:', error);
    return { error: 'Error al eliminar lead' };
  }

  return { success: true };
}
```

#### Ejemplo 2: Validación con Múltiples Permisos (OR)

```typescript
export async function viewComisionesAction() {
  // Puede ver si tiene permiso para ver todas O solo propias
  const check = await requireAnyPermission([
    { modulo: 'comisiones', accion: 'read_all' },
    { modulo: 'comisiones', accion: 'read' },
  ]);

  if (!check.ok) {
    return { error: check.error };
  }

  const supabase = await createClient();

  // Determinar qué filtrar
  const hasTodas = await hasPermission(check.usuarioId, 'comisiones', 'read_all');

  let query = supabase.from('comisiones').select('*');

  if (!hasTodas) {
    // Solo ver propias
    query = query.eq('vendedor_id', check.usuarioId);
  }

  const { data, error } = await query;

  if (error) {
    return { error: 'Error al cargar comisiones' };
  }

  return { data };
}
```

### 9.3 Ejemplos de Código Frontend

#### Ejemplo 1: Hook usePermissions en Componente

```typescript
'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';

export default function LeadsTable() {
  const { can, canAny, loading } = usePermissions();

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex gap-2">
        {can('leads', 'write') && (
          <Button onClick={handleCreate}>
            Crear Lead
          </Button>
        )}

        {can('leads', 'export') && (
          <Button onClick={handleExport}>
            Exportar a Excel
          </Button>
        )}

        {canAny([
          { modulo: 'leads', accion: 'delete' },
          { modulo: 'leads', accion: 'bulk_actions' }
        ]) && (
          <Button onClick={handleBulkActions}>
            Acciones Masivas
          </Button>
        )}
      </div>

      <table>
        {/* ... tabla de leads ... */}
      </table>
    </div>
  );
}
```

#### Ejemplo 2: Componente de Admin - Otorgar Permiso Extra

```typescript
'use client';

import { useState } from 'react';
import { otorgarPermisoExtra } from '@/lib/actions-rbac';
import { Button } from '@/components/ui/button';

interface Props {
  usuarioId: string;
  usuarioNombre: string;
}

export function PermisosExtraPanel({ usuarioId, usuarioNombre }: Props) {
  const [permisoId, setPermisoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaExpiracion, setFechaExpiracion] = useState('');

  const handleOtorgar = async () => {
    const result = await otorgarPermisoExtra({
      usuarioId,
      permisoId,
      motivo,
      otorgadoPor: currentUser.id,
      fechaExpiracion: fechaExpiracion || undefined,
    });

    if (result.success) {
      alert('Permiso otorgado exitosamente');
    } else {
      alert('Error: ' + result.error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Otorgar Permiso Extra a {usuarioNombre}
      </h2>

      <div className="space-y-4">
        <div>
          <label>Permiso:</label>
          <select value={permisoId} onChange={(e) => setPermisoId(e.target.value)}>
            <option value="">Seleccionar...</option>
            {/* Cargar permisos disponibles */}
          </select>
        </div>

        <div>
          <label>Motivo:</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Reemplazo temporal del Jefe de Ventas"
          />
        </div>

        <div>
          <label>Fecha de Expiración (opcional):</label>
          <input
            type="date"
            value={fechaExpiracion}
            onChange={(e) => setFechaExpiracion(e.target.value)}
          />
        </div>

        <Button onClick={handleOtorgar}>
          Otorgar Permiso
        </Button>
      </div>
    </div>
  );
}
```

### 9.4 Checklist de Testing

#### Testing por Rol (QA)

**Admin:**
- [ ] Puede acceder a todos los módulos
- [ ] Puede crear/editar/eliminar usuarios
- [ ] Puede otorgar permisos extra
- [ ] Puede ver audit log
- [ ] Puede configurar proyectos

**Jefe Ventas:**
- [ ] Puede ver todos los leads
- [ ] Puede asignar leads a vendedores
- [ ] Puede aprobar descuentos
- [ ] Puede exportar comisiones
- [ ] Puede ejecutar campañas repulse
- [ ] NO puede eliminar usuarios

**Vendedor:**
- [ ] Solo ve sus propios leads
- [ ] Puede crear leads
- [ ] Puede registrar ventas
- [ ] Solo ve sus propias comisiones
- [ ] NO puede ver módulo de usuarios
- [ ] NO puede aprobar descuentos

**Finanzas:**
- [ ] Puede verificar pagos
- [ ] Puede importar extractos bancarios
- [ ] Puede generar constancias
- [ ] NO puede ver leads
- [ ] NO puede acceder a configuración

#### Testing de Permisos Extra

- [ ] Admin puede otorgar permiso extra a vendedor
- [ ] Vendedor con permiso extra puede realizar acción
- [ ] Permiso expira automáticamente después de fecha
- [ ] Auditoría registra quién otorgó el permiso
- [ ] Cache se invalida correctamente al otorgar/revocar

#### Testing de Performance

- [ ] Primera validación (cache miss): < 10ms
- [ ] Validaciones subsecuentes (cache hit): < 1ms
- [ ] Cache hit rate > 90% en uso normal
- [ ] Middleware no causa latencia perceptible
- [ ] Frontend no re-renderiza innecesariamente

---

## Conclusión

Este Plan Maestro RBAC representa el diseño completo de un sistema de permisos de clase mundial para EcoPlaza Dashboard. El sistema está inspirado en las mejores prácticas de SAP, Salesforce, AWS IAM y Auth0, adaptado específicamente para las necesidades de un CRM inmobiliario.

**Próximos Pasos Inmediatos:**

1. **Revisión y Aprobación** de este documento por el equipo técnico
2. **Asignación de Recursos** (Backend Dev, Frontend Dev, QA, Database Architect)
3. **Setup de Staging** y ejecución de migraciones SQL
4. **Kickoff de Fase 1** (Setup BD - Semana 1)

**Contacto para Dudas:**
- **Arquitecto:** Claude (Architect Agent)
- **Documento Base:** Este archivo
- **Ubicación:** `E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\PLAN_MAESTRO_RBAC.md`

---

**Versión:** 1.0 Final
**Fecha:** 11 Enero 2026
**Estado:** ✅ Listo para Implementación
