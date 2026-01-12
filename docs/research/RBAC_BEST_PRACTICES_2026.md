# Sistemas RBAC y Permisos de Clase Mundial - Mejores Prácticas 2026

> **Investigación:** Estrategias de sistemas de permisos Role-Based Access Control (RBAC) de nivel enterprise aplicables a dashboard CRM inmobiliario
>
> **Fecha:** 11 Enero 2026
>
> **Investigador:** Strategic Researcher Agent

---

## Resumen Ejecutivo

Esta investigación analiza cómo las empresas de clase mundial (SAP, Salesforce, AWS IAM, Auth0) implementan sistemas RBAC avanzados y cómo estas mejores prácticas pueden aplicarse a un dashboard CRM inmobiliario moderno. Los hallazgos clave incluyen:

1. **Modelo aditivo de permisos**: Todos los sistemas enterprise usan un modelo donde los permisos se suman (no se restan), permitiendo composición flexible mediante múltiples roles y permission sets.

2. **Separación de roles y permisos**: SAP y Salesforce separan claramente roles (conjuntos de permisos) de permisos granulares (acciones específicas), permitiendo reutilización y herencia.

3. **Granularidad en múltiples niveles**:
   - **Módulo/Pantalla**: Control de acceso a secciones completas
   - **CRUD por entidad**: Crear/Leer/Actualizar/Eliminar sobre objetos específicos
   - **Field-level**: Permisos sobre campos individuales
   - **Row-level (RLS)**: Permisos sobre registros específicos basados en contexto (proyecto, equipo, etc.)

4. **Validación en múltiples capas**: Backend (base de datos + API) + Middleware + Frontend (UX only)

5. **Auditoría obligatoria**: Logs de cambios de permisos, asignación de roles y accesos críticos

6. **Performance**: Cacheo de permisos en JWT/tokens, uso de índices en RLS policies, minimizar queries de validación

---

## 1. Cómo lo Hacen los Grandes

### 1.1 SAP - Authorization Objects, Profiles y Roles

SAP implementa uno de los sistemas RBAC más robustos del mundo empresarial, utilizado por miles de organizaciones Fortune 500.

#### Componentes Clave

**Authorization Objects:**
- Son los bloques fundamentales del sistema de autorización
- Cada objeto representa un área específica de funcionalidad o proceso de negocio
- Contienen parámetros específicos de autorización (por ejemplo: "Crear orden de venta", "Ver reportes financieros")

**Profiles:**
- Agrupaciones de authorization objects
- **DEPRECADOS** en favor de roles modernos
- SAP_ALL profile es restringido - solo para emergencias con password protegido

**Roles:**
- Mapean a funciones de trabajo reales (Sales Manager, Finance Analyst, etc.)
- Contienen múltiples profiles/authorization objects
- **Jerarquía de roles**: Los roles pueden heredar de roles padres

#### Best Practices SAP

1. **NO usar perfiles directamente** - Solo roles
2. **Segregación de deberes (SoD)**: Análisis de riesgos de acceso para identificar conflictos
3. **Revisiones regulares**: Actualizar roles basado en cambios organizacionales
4. **Monitoreo y auditoría**: Logs de acceso, auditorías periódicas
5. **Principio de menor privilegio**: Solo permisos necesarios para la función

**Aplicación a ECOPLAZA:**
- Crear roles como "Jefe Ventas", "Vendedor", "Finanzas", "Coordinador"
- Cada rol contiene "permission objects" granulares (ver_leads, crear_contrato, aprobar_descuento)
- Evitar permisos "god-mode" como admin_total

**Fuentes:**
- [SafePaaS - Understanding SAP Authorization](https://www.safepaas.com/articles/understanding-sap-authorization/)
- [Aglea - SAP Roles and Profiles](https://www.aglea.com/en/blog/sap-roles-and-profiles-what-are-they)
- [Pathlock - SAP Authorization Handling](https://pathlock.com/role-adjustments-for-technical-sap-users-how-to-handle-sap-authorizations-safely-and-efectively/)

---

### 1.2 Salesforce - Profiles, Permission Sets y Permission Set Groups

Salesforce revolucionó su modelo de permisos en 2024-2026, moviéndose de profiles a permission sets como estrategia principal.

#### Evolución del Modelo

**Estado 2026:**
- Salesforce **revirtió** su decisión de deprecar permissions en profiles (Spring '26)
- Sin embargo, **recomienda fuertemente** un modelo basado en permission sets
- Profiles retienen: login hours/IP ranges, defaults (record types, apps), page layouts
- Permission Sets/Groups: Permisos de objetos, campos, acciones

#### Componentes

**Profiles (Rol Base):**
- **Un perfil por usuario** (obligatorio)
- Define configuración por defecto: apps asignadas, record types, page layouts
- Restricciones de login (horarios, IPs permitidas)

**Permission Sets (Permisos Adicionales):**
- **Múltiples por usuario**
- Asignan permisos específicos de objetos, campos, usuarios
- Permiten tareas adicionales no habilitadas por el profile base
- Ejemplo: "Crear vistas personalizadas", "Activar contratos", "Aprobar descuentos"

**Permission Set Groups (Personas):**
- Agrupan múltiples permission sets
- Representan "personas" organizacionales (Sales Rep, Team Lead, Manager)
- Usuarios reciben permisos combinados de todos los sets en el grupo

#### Best Practices Salesforce

1. **Permission Set-Led Security Model**: Usar permission sets como fuente principal de permisos
2. **Profiles para defaults**: Solo configuración base y restricciones de acceso
3. **Principio de menor privilegio**: Todos los permisos en permission sets/groups
4. **Granularidad por campo**: Field-level security dentro de permission sets

**Aplicación a ECOPLAZA:**
- **Profile "Usuario Base"**: Acceso básico a dashboard, login hours
- **Permission Set "Ventas - Ver Leads"**: Permisos para módulo leads
- **Permission Set "Ventas - Crear Contratos"**: Permisos para generar documentos
- **Permission Set Group "Vendedor Senior"**: Combina múltiples sets para vendedores experimentados

**Fuentes:**
- [Salesforce - Permission Sets Overview](https://help.salesforce.com/s/articleView?id=sf.perm_sets_overview.htm&language=en_US&type=5)
- [Salesforce Admins - Get Agentforce Ready: Move From Profiles to Permission Sets](https://admin.salesforce.com/blog/2025/get-agentforce-ready-move-from-profiles-to-permission-sets-how-i-solved-it)
- [Salesforce Ben - Salesforce to Retire Permissions on Profiles](https://www.salesforceben.com/salesforce-to-retire-permissions-on-profiles-whats-next/)
- [PhoneIQ - Profiles vs Permission Sets](https://www.phoneiq.co/blog/salesforce-permissions-in-a-nutshell-profiles-vs-permission-sets)

---

### 1.3 Auth0/Okta - RBAC con Scopes, Claims y Permissions

Auth0 y Okta (ahora fusionados) representan el estado del arte en autenticación y autorización moderna basada en OAuth 2.0/OpenID Connect.

#### Componentes del Sistema

**Roles:**
- Agrupaciones lógicas de permisos
- Asignados a usuarios
- Ejemplo: "sales_manager", "finance_admin", "viewer"

**Permissions:**
- Acciones granulares sobre recursos
- Formato: `resource:action` (ej: `leads:read`, `contracts:create`, `discounts:approve`)
- Incluidos en access tokens cuando RBAC está habilitado

**Scopes:**
- Bundles de claims (agrupaciones de permisos)
- Solicitan acceso a recursos específicos
- Usados en flujo OAuth 2.0

**Claims:**
- Información sobre el usuario en JWT
- Más granular que scopes
- Permiten control de acceso a recursos específicos

#### RBAC en Auth0

Para habilitar RBAC en Auth0:
1. Scroll a **RBAC Settings**
2. Enable **Enable RBAC** toggle
3. Enable **Add Permissions in the Access Token** para incluir todos los permisos

**Scopes vs Permissions:**
- **Scopes**: Solicitan acceso a recursos (más general)
- **Claims**: Proveen información sobre permisos (más granular)

#### Okta Authorization Factors

Okta soporta múltiples modelos:
- **RBAC** (Role-Based Access Control)
- **ABAC** (Attribute-Based Access Control)
- Combinaciones híbridas

#### Best Practices Auth0/Okta

1. **Validación server-side**: Siempre validar permisos en backend
2. **JWT Claims**: Incluir roles/permisos en tokens para minimizar queries
3. **Scopes mínimos**: Solicitar solo scopes necesarios
4. **Custom Claims**: Agregar metadata de usuario para decisiones de acceso
5. **Token Refresh**: Renovar tokens cuando cambian permisos

**Aplicación a ECOPLAZA:**
- Incluir roles en JWT: `{ "role": "jefe_ventas", "proyecto_id": "123" }`
- Custom claims para permisos específicos: `{ "permissions": ["leads:read", "contracts:create"] }`
- Middleware validando tokens en cada request
- Frontend lee claims para UI condicional (solo UX)

**Fuentes:**
- [Okta Learning - Secure Your API with Auth0 Role-Based Access Control](https://learning.okta.com/secure-your-api-with-auth0-role-based-access-control)
- [Auth0 Docs - Enable Role-Based Access Control for APIs](https://auth0.com/docs/get-started/apis/enable-role-based-access-control-for-apis)
- [Okta Developer - Authorization Factors](https://developer.okta.com/docs/concepts/iam-overview-authorization-factors/)
- [Macnica - Realizing Backend API Access Control using Auth0 RBAC](https://www.macnica.co.jp/en/business/security/manufacturers/okta/tech_auth0_okta_rbac.html)

---

### 1.4 AWS IAM - Policies, Roles y Groups

AWS Identity and Access Management (IAM) es el estándar de oro para control de acceso en cloud, manejando miles de millones de requests diarios.

#### Componentes IAM

**Policies:**
- Documentos JSON que definen permisos
- Tipos:
  - **AWS Managed**: Mantenidas por AWS
  - **Customer Managed**: Específicas del cliente (recomendado)
  - **Inline**: Embebidas en users/roles (evitar)

**Roles:**
- **Más seguros que users** para aplicaciones/servicios
- Proveen credenciales temporales que expiran automáticamente
- Permiten rotación fácil sin passwords/keys manuales

**Groups:**
- Colecciones de users
- Aplican policies a nivel de grupo (no user individual)

**Service Control Policies (SCPs):**
- Control a nivel de AWS Organizations
- Guardrails para todos los users/roles en cuentas

#### Best Practices AWS IAM 2026

1. **Principio de Menor Privilegio:**
   - Otorgar solo permisos específicos requeridos
   - Usar IAM Access Analyzer para generar least-privilege policies
   - Reducir permisos y remover users/roles no utilizados

2. **Roles y Groups sobre Users:**
   - Aplicar policies a groups/roles, **NO a users directamente**
   - Reduce complejidad cuando el número de users crece

3. **Customer-Managed Policies:**
   - AWS managed policies no son least-privilege (diseñadas para todos los clientes)
   - Crear policies específicas para casos de uso

4. **IAM Access Analyzer:**
   - Analiza servicios y acciones que roles usan
   - Genera least-privilege policy automáticamente
   - Identifica users/roles/permisos no utilizados

5. **Attribute-Based Access Control (ABAC):**
   - Permite rango de acciones/recursos solo a requesters designados
   - Evita unauthorized requests

6. **Multi-Factor Authentication (MFA):**
   - Configurar MFA para proteger credenciales
   - Usar root user solo para tareas que requieren root

7. **Permission Boundaries:**
   - Restringen permisos máximos que user/role puede tener
   - Permiten delegar gestión de acceso a developers/team leads sin riesgo de escalación

8. **Auditorías Regulares:**
   - Revisar y actualizar policies regularmente
   - Remover recursos cuando groups ya no los necesitan

9. **Preferir Roles sobre Access Keys:**
   - Roles proveen credenciales temporales
   - Easier rotation sin password/key management manual

10. **Usar AWS Organizations + SCPs:**
    - Separar workloads con múltiples cuentas
    - SCPs establecen guardrails de permisos

**Aplicación a ECOPLAZA:**
- **Grupos**: admin_group, sales_group, finance_group
- **Roles**: vendedor_role, jefe_ventas_role
- **Policies**: sales_leads_policy, finance_approval_policy
- **Permission Boundaries**: Limitar que vendedores nunca puedan acceder a finanzas
- **Auditoría**: Tabla audit_logs con cambios de permisos

**Fuentes:**
- [AWS - IAM Best Practices](https://aws.amazon.com/iam/resources/best-practices/)
- [AWS Docs - Policies and Permissions](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [TechTarget - AWS IAM Best Practices](https://www.techtarget.com/searchcloudcomputing/tip/An-introduction-to-AWS-IAM-best-practices)
- [Datadog - Best Practices for Creating Least-Privilege AWS IAM Policies](https://www.datadoghq.com/blog/iam-least-privilege/)
- [Wiz - 13 Essential AWS IAM Best Practices](https://www.wiz.io/academy/cloud-security/aws-iam-best-practices)

---

## 2. Patrones de Permisos Granulares

### 2.1 Por Módulo/Pantalla

**Concepto:**
Control de acceso a secciones completas del dashboard (módulos, páginas, vistas).

**Implementación:**

```typescript
// Tabla: module_permissions
{
  id: uuid
  role_id: uuid
  module: 'leads' | 'locales' | 'control_pagos' | 'comisiones' | 'validacion_bancaria' | 'aprobaciones'
  can_access: boolean
}
```

**Ejemplo Real Estate:**
- **Vendedor**: Acceso a Leads, Locales (solo propios), Control Pagos (solo propios)
- **Jefe Ventas**: Acceso a todos los módulos de ventas + Comisiones + Aprobaciones
- **Finanzas**: Acceso a Control Pagos (todos), Validación Bancaria, sin acceso a Leads
- **Coordinador**: Acceso a Documentos, Expedientes, sin acceso a Finanzas

**Validación:**
- **Backend**: Middleware verifica module_permissions antes de renderizar página
- **Frontend**: Sidebar oculta opciones no disponibles (UX only)

---

### 2.2 Por Acción (CRUD)

**Concepto:**
Control granular sobre operaciones Create, Read, Update, Delete por entidad.

**Implementación:**

```typescript
// Tabla: entity_permissions
{
  id: uuid
  role_id: uuid
  entity: 'lead' | 'local' | 'pago' | 'contrato' | 'descuento' | 'usuario'
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
  can_export: boolean  // Adicional: exportar Excel/PDF
  can_approve: boolean // Adicional: para workflows
}
```

**Ejemplo Real Estate:**

| Rol | Entidad | Create | Read | Update | Delete | Export | Approve |
|-----|---------|--------|------|--------|--------|--------|---------|
| Vendedor | Lead | ✅ | ✅ (propios) | ✅ (propios) | ❌ | ❌ | ❌ |
| Vendedor | Local | ❌ | ✅ (propios) | ❌ | ❌ | ❌ | ❌ |
| Jefe Ventas | Lead | ✅ | ✅ (todos) | ✅ (todos) | ✅ | ✅ | ✅ |
| Jefe Ventas | Descuento | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Finanzas | Pago | ❌ | ✅ (todos) | ✅ (verificar) | ❌ | ✅ | ✅ |
| Coordinador | Contrato | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

**Validación:**
- **Backend**: Server actions verifican can_create/update/delete antes de ejecutar
- **Frontend**: Botones Create/Edit/Delete condicionalmente renderizados

---

### 2.3 Por Campo (Field-Level Security)

**Concepto:**
Control sobre campos específicos de un registro (inspirado en Salesforce FLS).

**Implementación:**

```typescript
// Tabla: field_permissions
{
  id: uuid
  role_id: uuid
  entity: string
  field: string
  can_read: boolean
  can_edit: boolean
  is_masked: boolean  // Mostrar *** en lugar de valor real
}
```

**Ejemplo Real Estate:**

| Rol | Entidad | Campo | Read | Edit | Masked |
|-----|---------|-------|------|------|--------|
| Vendedor | Lead | nombre, telefono | ✅ | ✅ | ❌ |
| Vendedor | Lead | precio_sugerido | ✅ | ❌ | ❌ |
| Vendedor | Local | precio_venta | ✅ | ❌ | ❌ |
| Vendedor | Pago | monto_total | ✅ | ❌ | ❌ |
| Vendedor Caseta | Lead | telefono | ✅ | ❌ | ✅ (***-***-1234) |
| Finanzas | Lead | telefono | ❌ | ❌ | ❌ |
| Finanzas | Pago | monto_total, banco, voucher | ✅ | ✅ | ❌ |

**Casos de Uso:**
- Ocultar comisiones a vendedores juniors
- Mascarar teléfonos a vendedores de caseta (evitar robo de leads)
- Restringir edición de precio_venta solo a jefe_ventas
- Ocultar información financiera a roles de marketing

**Validación:**
- **Backend**: Select queries excluyen campos no permitidos o retornan masked values
- **Frontend**: Componentes no renderizan campos no permitidos

**Fuentes:**
- [Salesforce - Field-Level Security](https://help.salesforce.com/s/articleView?id=sf.admin_fls.htm)

---

### 2.4 Por Registro (Row-Level Security - RLS)

**Concepto:**
Control sobre registros específicos basado en contexto del usuario (proyecto, equipo, territorio, etc.). Este es el patrón más poderoso y complejo.

#### Implementación en PostgreSQL/Supabase

PostgreSQL soporta RLS nativamente mediante **Security Policies** a nivel de tabla.

**Tipos de Policies:**

1. **Filter Predicates**: Filtran silenciosamente filas en SELECT, UPDATE, DELETE
2. **Permissive Policies**: Se combinan con OR (por defecto)
3. **Restrictive Policies**: Se combinan con AND

**Lógica de Evaluación:**
```
(permissive policies) AND (restrictive policies)
```

**Ejemplo Supabase RLS - ECOPLAZA:**

```sql
-- Habilitar RLS en tabla leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy 1: Vendedores solo ven sus propios leads
CREATE POLICY "vendedores_own_leads"
ON leads
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'vendedor'
  AND vendedor_id = auth.uid()
);

-- Policy 2: Jefe Ventas ve todos los leads de su proyecto
CREATE POLICY "jefe_ventas_all_project_leads"
ON leads
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'jefe_ventas'
  AND proyecto_id = (auth.jwt() ->> 'proyecto_id')::uuid
);

-- Policy 3: Admin ve todo
CREATE POLICY "admin_all_leads"
ON leads
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

-- Policy 4: Vendedores solo actualizan sus leads
CREATE POLICY "vendedores_update_own"
ON leads
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'vendedor'
  AND vendedor_id = auth.uid()
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'vendedor'
  AND vendedor_id = auth.uid()
);
```

#### Patrones RLS Comunes

**1. Isolation por Proyecto:**
```sql
-- Solo ver registros del proyecto seleccionado en login
USING (proyecto_id = (auth.jwt() ->> 'proyecto_id')::uuid)
```

**2. Isolation por Equipo:**
```sql
-- Solo ver registros del equipo del usuario
USING (
  equipo_id IN (
    SELECT equipo_id FROM user_equipos WHERE user_id = auth.uid()
  )
)
```

**3. Isolation por Territorio:**
```sql
-- Real estate: Vendedor solo ve locales de su zona
USING (
  zona IN (
    SELECT zona FROM user_zonas WHERE user_id = auth.uid()
  )
)
```

**4. Hierarchical Access:**
```sql
-- Manager ve sus registros + los de su equipo
USING (
  user_id = auth.uid()
  OR user_id IN (
    SELECT user_id FROM users WHERE manager_id = auth.uid()
  )
)
```

#### Best Practices RLS

1. **Habilitar desde día 1**: No esperar a tener datos en producción
2. **Usar JWT Claims**: Almacenar role/proyecto_id en token para evitar subqueries
3. **Indexar columnas de policies**: Crear índices en columnas usadas (user_id, proyecto_id, etc.)
4. **Mantener policies simples**: Expresiones complejas impactan performance
5. **Schemas separados**: Crear schema aparte para RLS objects (predicate functions, security policies)
6. **Testing exhaustivo**: Probar con diferentes roles antes de deploy

#### Casos de Uso ECOPLAZA

**Leads:**
- Vendedor: Solo sus leads
- Jefe Ventas: Todos los leads del proyecto
- Admin: Todos los leads
- Finanzas: Sin acceso a leads

**Control Pagos:**
- Vendedor: Solo pagos de sus clientes
- Finanzas: Todos los pagos del proyecto (verificación)
- Jefe Ventas: Todos los pagos del proyecto
- Coordinador: Todos los pagos (documentación)

**Comisiones:**
- Vendedor: Solo sus propias comisiones
- Jefe Ventas: Comisiones de su equipo + propias
- Finanzas: Todas las comisiones (cálculo y pago)
- Admin: Todas las comisiones

**Fuentes:**
- [PostgreSQL Docs - Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase - Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Microsoft - Row-Level Security](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security?view=sql-server-ver17)
- [Immuta - Implementing Row-Level Security](https://www.immuta.com/guides/data-security-101/row-level-security/)
- [Medium - Supabase RLS Explained with Real Examples](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)

---

## 3. Mejores Prácticas 2026

### 3.1 Jerarquía y Herencia de Permisos

**Concepto:**
Roles pueden heredar permisos de roles "padre", reduciendo duplicación y simplificando mantenimiento.

**Modelo RBAC1 (con Herencia):**

```
Si role_A ≥ role_B, entonces role_A hereda todos los permisos de role_B
```

**Ejemplo Real Estate:**

```
Admin
  ├── Jefe Ventas
  │     ├── Vendedor Senior
  │     │     └── Vendedor Junior
  │     └── Coordinador
  ├── Jefe Finanzas
  │     └── Analista Finanzas
  └── Marketing Manager
        └── Marketing Analyst
```

**Implementación Database:**

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  parent_role_id UUID REFERENCES roles(id),
  descripcion TEXT,
  nivel INT DEFAULT 0  -- 0 = base, 1 = mid, 2 = senior, etc.
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,  -- 'leads:read', 'contracts:create'
  recurso VARCHAR(50),            -- 'leads', 'contracts'
  accion VARCHAR(50),             -- 'read', 'create', 'update', 'delete', 'approve'
  descripcion TEXT
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- Function para obtener permisos con herencia
CREATE OR REPLACE FUNCTION get_inherited_permissions(input_role_id UUID)
RETURNS TABLE(permission_id UUID) AS $$
WITH RECURSIVE role_hierarchy AS (
  -- Rol actual
  SELECT id, parent_role_id
  FROM roles
  WHERE id = input_role_id

  UNION ALL

  -- Roles padre recursivamente
  SELECT r.id, r.parent_role_id
  FROM roles r
  INNER JOIN role_hierarchy rh ON rh.parent_role_id = r.id
)
SELECT DISTINCT rp.permission_id
FROM role_hierarchy rh
INNER JOIN role_permissions rp ON rp.role_id = rh.id;
$$ LANGUAGE sql;
```

**Ejemplo Herencia:**
- **Vendedor Junior**: `leads:read` (propios), `locales:read` (propios)
- **Vendedor Senior** (hereda de Junior): PLUS `leads:create`, `contratos:create`
- **Jefe Ventas** (hereda de Senior): PLUS `leads:read` (todos), `descuentos:approve`, `comisiones:read` (equipo)
- **Admin** (hereda de Jefe Ventas): PLUS `usuarios:manage`, `proyectos:configure`

**Beneficios:**
- **Reduce redundancia**: No repetir permisos en cada rol
- **Simplifica mantenimiento**: Cambiar permiso en rol base afecta a todos los herederos
- **Modularidad**: Fácil crear nuevos roles componiendo existentes

**Fuentes:**
- [Medium - Designing a Role-Based Access Control System](https://medium.com/@07rohit/designing-a-role-based-access-control-rbac-system-a-scalable-approach-441f05168933)
- [Satori - Comprehensive Guide to RBAC Design](https://satoricyber.com/data-access-control/a-comprehensive-guide-to-role-based-access-control-design/)

---

### 3.2 Permission Sets (Modelo Aditivo)

**Concepto:**
En lugar de roles monolíticos, usar "permission sets" composables que se pueden combinar. Modelo popularizado por Salesforce.

**Modelo Tradicional (Rígido):**
```
Vendedor_A = [leads:read, contratos:create, locales:read]
Vendedor_B = [leads:read, contratos:create, locales:read]
```
Si Vendedor_A necesita aprobar descuentos, duplicas el rol completo.

**Modelo Permission Sets (Flexible):**
```
Base_Vendedor = [leads:read, locales:read]
Contratos_Set = [contratos:create, contratos:download]
Aprobaciones_Set = [descuentos:approve]

Vendedor_A = Base_Vendedor + Contratos_Set
Vendedor_B = Base_Vendedor + Contratos_Set + Aprobaciones_Set
```

**Implementación:**

```sql
CREATE TABLE permission_sets (
  id UUID PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  tipo 'base' | 'addon'  -- base = rol primario, addon = permisos adicionales
);

CREATE TABLE permission_set_permissions (
  permission_set_id UUID REFERENCES permission_sets(id),
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (permission_set_id, permission_id)
);

CREATE TABLE user_permission_sets (
  user_id UUID REFERENCES users(id),
  permission_set_id UUID REFERENCES permission_sets(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, permission_set_id)
);

-- Function: Obtener permisos efectivos de usuario
CREATE OR REPLACE FUNCTION get_user_effective_permissions(input_user_id UUID)
RETURNS TABLE(permission_name VARCHAR) AS $$
SELECT DISTINCT p.nombre
FROM user_permission_sets ups
INNER JOIN permission_set_permissions psp ON psp.permission_set_id = ups.permission_set_id
INNER JOIN permissions p ON p.id = psp.permission_id
WHERE ups.user_id = input_user_id;
$$ LANGUAGE sql;
```

**Ejemplo Real Estate:**

**Permission Sets Base:**
- `base_vendedor`: leads:read, locales:read
- `base_finanzas`: pagos:read, validacion_bancaria:access
- `base_coordinador`: documentos:manage

**Permission Sets Addon:**
- `addon_contratos`: contratos:create, contratos:download
- `addon_aprobaciones`: descuentos:approve
- `addon_comisiones`: comisiones:read
- `addon_export`: leads:export, pagos:export

**Usuarios:**
- **Juan (Vendedor Junior)**: `base_vendedor`
- **María (Vendedor Senior)**: `base_vendedor` + `addon_contratos` + `addon_export`
- **Luis (Jefe Ventas)**: `base_vendedor` + `addon_contratos` + `addon_aprobaciones` + `addon_comisiones`
- **Rosa (Finanzas)**: `base_finanzas` + `addon_aprobaciones` + `addon_export`

**Ventajas Modelo Aditivo:**
1. **Flexibilidad**: Combinar sets según necesidad sin crear roles nuevos
2. **Escalabilidad**: Reducción de 93x en policies según estudios ABAC vs RBAC
3. **Auditoría clara**: Ver exactamente qué sets tiene cada usuario
4. **Tiempo limitado**: Asignar addon temporal (ej: `addon_export` por 1 mes)

**Fuentes:**
- [Salesforce - Permission Set Groups](https://help.salesforce.com/s/articleView?id=sf.perm_sets_overview.htm)
- [Auth0 - RBAC](https://auth0.com/docs/manage-users/access-control/rbac)
- [Kubernetes - RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

---

### 3.3 Auditoría de Permisos

**Concepto:**
Registrar cambios en permisos, asignación de roles y accesos críticos para compliance, debugging y security.

#### Qué Auditar

1. **Cambios de Roles/Permisos:**
   - Usuario X asignado a rol Y por admin Z
   - Permiso P agregado a rol R
   - Permission set S removido de usuario U

2. **Accesos Críticos:**
   - Login/logout
   - Acceso a módulos sensibles (Finanzas, Aprobaciones)
   - Exportación de datos masivos
   - Modificación de configuración de proyecto

3. **Cambios de Datos Sensibles:**
   - Aprobación de descuentos
   - Verificación de pagos
   - Creación/modificación de contratos
   - Cambio de precio de venta

#### Implementación PostgreSQL (pgAudit)

**Opción 1: pgAudit Extension (Recomendado)**

```sql
-- Habilitar pgAudit
CREATE EXTENSION pgaudit;

-- Configuración
ALTER SYSTEM SET pgaudit.log = 'write';  -- Auditar INSERT, UPDATE, DELETE
ALTER SYSTEM SET pgaudit.log_catalog = off;
ALTER SYSTEM SET pgaudit.log_relation = on;
ALTER SYSTEM SET pgaudit.log_parameter = on;

-- Auditar tabla específica
ALTER TABLE role_permissions SET (pgaudit.log = 'write');
ALTER TABLE user_permission_sets SET (pgaudit.log = 'write');
ALTER TABLE aprobaciones_descuento SET (pgaudit.log = 'write');
```

**Opción 2: Trigger-Based Audit (Custom)**

```sql
-- Tabla de auditoría
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla VARCHAR(100) NOT NULL,
  accion 'INSERT' | 'UPDATE' | 'DELETE' NOT NULL,
  registro_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT
);

-- Trigger function genérico
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (tabla, accion, registro_id, user_id, old_values)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, auth.uid(), row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Calcular campos cambiados
    SELECT ARRAY_AGG(key) INTO changed_fields
    FROM jsonb_each(row_to_json(NEW)::jsonb)
    WHERE row_to_json(NEW)::jsonb->key <> row_to_json(OLD)::jsonb->key;

    INSERT INTO audit_logs (tabla, accion, registro_id, user_id, old_values, new_values, changed_fields)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, auth.uid(), row_to_json(OLD), row_to_json(NEW), changed_fields);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (tabla, accion, registro_id, user_id, new_values)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, auth.uid(), row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas críticas
CREATE TRIGGER audit_role_permissions
AFTER INSERT OR UPDATE OR DELETE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_user_permission_sets
AFTER INSERT OR UPDATE OR DELETE ON user_permission_sets
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Opción 3: Application-Level Audit (Server Actions)**

```typescript
// lib/actions-audit.ts
export async function logAuditEvent(params: {
  tabla: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  registro_id: string;
  old_values?: any;
  new_values?: any;
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('audit_logs').insert({
    tabla: params.tabla,
    accion: params.accion,
    registro_id: params.registro_id,
    user_id: user?.id,
    user_email: user?.email,
    old_values: params.old_values,
    new_values: params.new_values,
    timestamp: new Date().toISOString()
  });
}

// Uso en server action
export async function assignPermissionSet(userId: string, permissionSetId: string) {
  // ... lógica de negocio

  await logAuditEvent({
    tabla: 'user_permission_sets',
    accion: 'INSERT',
    registro_id: userId,
    new_values: { user_id: userId, permission_set_id: permissionSetId }
  });
}
```

#### UI de Auditoría

**Dashboard de Auditoría:**
- Filtros: Usuario, tabla, acción, fecha
- Timeline de eventos
- Detalles de cambios (old vs new values)
- Exportar a Excel/PDF

**Alertas:**
- Email a admin cuando se asigna rol "admin"
- WhatsApp cuando se aprueba descuento > $5,000
- Slack cuando se exportan > 1,000 leads

#### Best Practices

1. **Retención de Logs**: 90 días caliente, 1 año archivo, luego eliminar
2. **Logs Inmutables**: Tabla audit_logs sin UPDATE/DELETE permitidos
3. **Streaming a Syslog**: Para compliance estricto, enviar logs a servidor externo
4. **Performance**: Particionar tabla por mes/año si > 1M registros
5. **Compliance**: GDPR, CCPA - permitir exportar datos de usuario

**Fuentes:**
- [Bytebase - Postgres Audit Logging Guide](https://www.bytebase.com/blog/postgres-audit-logging/)
- [PGAudit Extension](https://www.pgaudit.org/)
- [Permit.io - Best Practices for Authorization Audit Logs](https://www.permit.io/blog/audit-logs)
- [PostgreSQL Docs - Trigger-Based Audit](https://www.postgresql.org/docs/current/plpgsql-trigger.html)

---

### 3.4 UI/UX para Gestión de Permisos

**Concepto:**
La complejidad de RBAC debe ser invisible para usuarios finales, pero transparente para administradores.

#### Patrones UX de Clase Mundial

**1. Linear - Speed & Clarity**

Linear demuestra que performance es UX feature:
- Teclado-first (Cmd+K para command palette)
- Zero latency - todo es instantáneo
- Permisos implícitos por contexto (equipo, proyecto)

**Aplicación ECOPLAZA:**
- Filtro de proyecto en login define contexto completo
- Sidebar oculta módulos no accesibles (no mostrar disabled)
- Botones de acción solo aparecen si usuario tiene permiso

**2. Notion - Flexibility & Modularity**

Notion permite construir permisos granulares:
- Share modal con roles (Full Access, Can Edit, Can View)
- Permission inheritance (workspace > page > block)
- Guest access temporal

**Aplicación ECOPLAZA:**
- Modal "Compartir Lead" para asignar acceso temporal a otro vendedor
- Permission sets como "bloques" composables en UI
- Indicador visual de permisos heredados vs directos

**3. Stripe - Clean Hierarchy**

Stripe Dashboard muestra data-heavy sin overwhelm:
- Tabs para separar secciones (Payments, Payouts, Disputes)
- Customización de charts (pero con defaults sensatos)
- Breadcrumbs claros

**Aplicación ECOPLAZA:**
- Tabs en Configuración: Roles / Permission Sets / Usuarios / Auditoría
- Defaults: Nuevo vendedor = base_vendedor (automático)
- Breadcrumbs: Configuración > Roles > Vendedor Senior > Permisos

#### Componentes UI Esenciales

**1. Permission Matrix Visual**

```typescript
// components/admin/PermissionMatrix.tsx
interface PermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
}

// Render tabla:
//              | Leads:Read | Leads:Create | Contratos:Create | ...
// -------------|------------|--------------|------------------|----
// Vendedor Jr  |     ✅     |      ❌      |        ❌        |
// Vendedor Sr  |     ✅     |      ✅      |        ✅        |
// Jefe Ventas  |     ✅     |      ✅      |        ✅        |
```

**2. Role Assignment Modal**

```typescript
// components/admin/AssignRoleModal.tsx
<Modal>
  <Select label="Usuario" options={users} />
  <Select label="Rol Base" options={baseRoles} />

  <Divider label="Permission Sets Adicionales (opcional)" />

  <CheckboxGroup>
    {permissionSets.map(set => (
      <Checkbox key={set.id} label={set.nombre} description={set.descripcion} />
    ))}
  </CheckboxGroup>

  <DatePicker label="Expiración (opcional)" />

  <Button onClick={handleAssign}>Asignar Permisos</Button>
</Modal>
```

**3. User Permissions Card**

```typescript
// components/admin/UserPermissionsCard.tsx
<Card>
  <Avatar user={user} />
  <Text>{user.nombre}</Text>

  <Badge color="blue">{user.rol_base}</Badge>

  <Divider label="Permission Sets" />
  {user.permission_sets.map(set => (
    <Chip
      key={set.id}
      label={set.nombre}
      onDelete={() => handleRemoveSet(set.id)}
    />
  ))}

  <Button variant="outline" onClick={() => setShowDetails(true)}>
    Ver Permisos Detallados
  </Button>
</Card>
```

**4. Conditional Rendering en UI**

```typescript
// Hook personalizado
function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    // Leer permisos del JWT claim
    const perms = user?.app_metadata?.permissions || [];
    setPermissions(perms);
  }, [user]);

  const can = (permission: string) => {
    return permissions.includes(permission);
  };

  return { can, permissions };
}

// Uso en componente
export function LeadsPage() {
  const { can } = usePermissions();

  return (
    <div>
      <Table data={leads} />

      {can('leads:create') && (
        <Button onClick={openCreateModal}>Crear Lead</Button>
      )}

      {can('leads:export') && (
        <Button onClick={exportToExcel}>Exportar Excel</Button>
      )}
    </div>
  );
}
```

**5. Permission Gate Component**

```typescript
// components/auth/PermissionGate.tsx
interface PermissionGateProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ permission, fallback, children }: PermissionGateProps) {
  const { can } = usePermissions();

  if (!can(permission)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Uso
<PermissionGate permission="descuentos:approve">
  <AprobarDescuentoButton />
</PermissionGate>
```

#### Best Practices UX

1. **Invisible Success**: Si usuario tiene permiso, no mostrar badges/indicators (solo mostrar cuando NO tiene)
2. **Progressive Disclosure**: No mostrar matriz completa de permisos a usuarios normales
3. **Contextual Help**: Tooltips explicando por qué cierto botón está disabled
4. **Mobile-First**: Permission management debe funcionar en tablets (supervisores en campo)
5. **Keyboard Shortcuts**: Cmd+K para búsqueda rápida de usuarios/roles
6. **Real-time Updates**: Cuando admin cambia permisos, usuario ve cambio sin relogin (WebSocket)

**Fuentes:**
- [LogRocket - Dashboard UI Best Practices](https://blog.logrocket.com/ux-design/dashboard-ui-best-practices-examples/)
- [Lazarev - Dashboard UX Design Best Practices](https://www.lazarev.agency/articles/dashboard-ux-design)
- [Medium - 20 Best Dashboard UI/UX Design Principles 2025](https://medium.com/@allclonescript/20-best-dashboard-ui-ux-design-principles-you-need-in-2025-30b661f2f795)
- [Design Studio UI/UX - 8 CRM UX Design Best Practices](https://www.designstudiouiux.com/blog/crm-ux-design-best-practices/)

---

## 4. Patrones de Implementación

### 4.1 Estructura de Base de Datos

**Schema Completo RBAC:**

```sql
-- =============================================
-- CORE: Usuarios
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre_completo VARCHAR(255),
  proyecto_id UUID REFERENCES proyectos(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ROLES
-- =============================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  parent_role_id UUID REFERENCES roles(id),
  nivel INT DEFAULT 0,
  es_sistema BOOLEAN DEFAULT false,  -- Roles del sistema no editables
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- PERMISSIONS
-- =============================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,  -- 'leads:read'
  recurso VARCHAR(50) NOT NULL,         -- 'leads'
  accion VARCHAR(50) NOT NULL,          -- 'read', 'create', 'update', etc.
  descripcion TEXT,
  es_sistema BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_permissions_recurso_accion ON permissions(recurso, accion);

-- =============================================
-- ROLE -> PERMISSIONS (Many-to-Many)
-- =============================================
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  PRIMARY KEY (role_id, permission_id)
);

-- =============================================
-- PERMISSION SETS
-- =============================================
CREATE TABLE permission_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(20) DEFAULT 'addon',  -- 'base' | 'addon'
  es_sistema BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permission_set_permissions (
  permission_set_id UUID REFERENCES permission_sets(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (permission_set_id, permission_id)
);

-- =============================================
-- USER ASSIGNMENTS
-- =============================================
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_permission_sets (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_set_id UUID REFERENCES permission_sets(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  PRIMARY KEY (user_id, permission_set_id)
);

-- =============================================
-- FIELD-LEVEL SECURITY
-- =============================================
CREATE TABLE field_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  tabla VARCHAR(100) NOT NULL,
  campo VARCHAR(100) NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  is_masked BOOLEAN DEFAULT false,
  UNIQUE(role_id, tabla, campo)
);

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla VARCHAR(100) NOT NULL,
  accion VARCHAR(20) NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  registro_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tabla ON audit_logs(tabla);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Obtener permisos efectivos de usuario (con herencia de roles)
CREATE OR REPLACE FUNCTION get_user_permissions(input_user_id UUID)
RETURNS TABLE(permission_name VARCHAR) AS $$
WITH RECURSIVE role_hierarchy AS (
  -- Roles directos del usuario
  SELECT r.id, r.parent_role_id
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = input_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())

  UNION ALL

  -- Roles padre (herencia)
  SELECT r.id, r.parent_role_id
  FROM roles r
  INNER JOIN role_hierarchy rh ON rh.parent_role_id = r.id
),
role_perms AS (
  -- Permisos de roles (con herencia)
  SELECT DISTINCT p.nombre
  FROM role_hierarchy rh
  INNER JOIN role_permissions rp ON rp.role_id = rh.id
  INNER JOIN permissions p ON p.id = rp.permission_id
),
set_perms AS (
  -- Permisos de permission sets
  SELECT DISTINCT p.nombre
  FROM user_permission_sets ups
  INNER JOIN permission_set_permissions psp ON psp.permission_set_id = ups.permission_set_id
  INNER JOIN permissions p ON p.id = psp.permission_id
  WHERE ups.user_id = input_user_id
    AND (ups.expires_at IS NULL OR ups.expires_at > NOW())
)
-- Union de ambos
SELECT * FROM role_perms
UNION
SELECT * FROM set_perms;
$$ LANGUAGE sql STABLE;

-- Verificar si usuario tiene permiso específico
CREATE OR REPLACE FUNCTION user_has_permission(
  input_user_id UUID,
  input_permission VARCHAR
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM get_user_permissions(input_user_id)
    WHERE permission_name = input_permission
  );
$$ LANGUAGE sql STABLE;
```

#### Seeders - Roles y Permisos Base

```sql
-- Roles del sistema
INSERT INTO roles (nombre, descripcion, nivel, es_sistema) VALUES
  ('admin', 'Administrador del sistema - acceso total', 99, true),
  ('jefe_ventas', 'Jefe de ventas - gestiona equipo y aprobaciones', 50, true),
  ('vendedor', 'Vendedor - gestiona leads y ventas', 10, true),
  ('vendedor_caseta', 'Vendedor de caseta - acceso limitado', 5, true),
  ('finanzas', 'Equipo de finanzas - pagos y validación', 30, true),
  ('coordinador', 'Coordinador - documentación y expedientes', 20, true),
  ('marketing', 'Marketing - solo lectura de leads', 5, true);

-- Configurar herencia
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE nombre = 'vendedor')
WHERE nombre = 'jefe_ventas';

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE nombre = 'vendedor')
WHERE nombre = 'vendedor_caseta';

-- Permisos granulares
INSERT INTO permissions (nombre, recurso, accion, descripcion, es_sistema) VALUES
  -- Leads
  ('leads:read', 'leads', 'read', 'Ver leads', true),
  ('leads:create', 'leads', 'create', 'Crear leads', true),
  ('leads:update', 'leads', 'update', 'Editar leads', true),
  ('leads:delete', 'leads', 'delete', 'Eliminar leads', true),
  ('leads:export', 'leads', 'export', 'Exportar leads a Excel', true),

  -- Locales
  ('locales:read', 'locales', 'read', 'Ver locales', true),
  ('locales:update_precio', 'locales', 'update_precio', 'Cambiar precio de venta', true),

  -- Contratos
  ('contratos:create', 'contratos', 'create', 'Generar contratos', true),
  ('contratos:download', 'contratos', 'download', 'Descargar contratos', true),

  -- Pagos
  ('pagos:read', 'pagos', 'read', 'Ver pagos', true),
  ('pagos:create', 'pagos', 'create', 'Registrar pagos', true),
  ('pagos:verify', 'pagos', 'verify', 'Verificar pagos (finanzas)', true),

  -- Descuentos
  ('descuentos:request', 'descuentos', 'request', 'Solicitar aprobación de descuento', true),
  ('descuentos:approve', 'descuentos', 'approve', 'Aprobar descuentos', true),

  -- Comisiones
  ('comisiones:read_own', 'comisiones', 'read_own', 'Ver comisiones propias', true),
  ('comisiones:read_team', 'comisiones', 'read_team', 'Ver comisiones del equipo', true),
  ('comisiones:read_all', 'comisiones', 'read_all', 'Ver todas las comisiones', true),

  -- Usuarios
  ('usuarios:read', 'usuarios', 'read', 'Ver usuarios', true),
  ('usuarios:manage', 'usuarios', 'manage', 'Crear/editar usuarios', true),

  -- Módulos
  ('modulo:validacion_bancaria', 'modulos', 'access', 'Acceso a Validación Bancaria', true),
  ('modulo:aprobaciones', 'modulos', 'access', 'Acceso a Aprobaciones', true);

-- Asignar permisos a roles
DO $$
DECLARE
  admin_id UUID := (SELECT id FROM roles WHERE nombre = 'admin');
  jefe_id UUID := (SELECT id FROM roles WHERE nombre = 'jefe_ventas');
  vendedor_id UUID := (SELECT id FROM roles WHERE nombre = 'vendedor');
  finanzas_id UUID := (SELECT id FROM roles WHERE nombre = 'finanzas');
BEGIN
  -- Admin: todos los permisos
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT admin_id, id FROM permissions;

  -- Vendedor: permisos básicos
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT vendedor_id, id FROM permissions
  WHERE nombre IN (
    'leads:read', 'leads:create', 'leads:update',
    'locales:read',
    'contratos:create', 'contratos:download',
    'pagos:read', 'pagos:create',
    'descuentos:request',
    'comisiones:read_own'
  );

  -- Jefe Ventas: permisos de vendedor + adicionales (hereda automáticamente)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT jefe_id, id FROM permissions
  WHERE nombre IN (
    'leads:export',
    'locales:update_precio',
    'descuentos:approve',
    'comisiones:read_team',
    'modulo:aprobaciones'
  );

  -- Finanzas
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT finanzas_id, id FROM permissions
  WHERE nombre IN (
    'pagos:read', 'pagos:verify',
    'modulo:validacion_bancaria',
    'descuentos:approve',
    'comisiones:read_all'
  );
END $$;
```

**Fuentes:**
- [Darwin Biler - Role-Based Access Control ERD](https://www.darwinbiler.com/role-based-access-control-erd/)
- [Tutorials24x7 - Guide to Design Database for RBAC in MySQL](https://mysql.tutorials24x7.com/blog/guide-to-design-database-for-rbac-in-mysql)
- [GitHub dwyl/auth - RBAC Schema](https://github.com/dwyl/auth/blob/main/role-based-access-control.md)

---

### 4.2 Cacheo de Permisos (Performance)

**Problema:**
Consultar permisos en cada request es costoso (múltiples JOINs, queries recursivas).

**Solución:**
Cachear permisos en JWT claims, localStorage, o Redis.

#### Estrategia 1: JWT Claims (Recomendado para Supabase)

**Supabase Auth - Custom Access Token Hook:**

```sql
-- Function ejecutada cuando Supabase genera access token
CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
  user_permissions text[];
  user_role text;
BEGIN
  -- Extraer claims existentes
  claims := event->'claims';

  -- Obtener rol principal del usuario
  SELECT r.nombre INTO user_role
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = (event->>'user_id')::uuid
  ORDER BY r.nivel DESC
  LIMIT 1;

  -- Obtener todos los permisos efectivos
  SELECT ARRAY_AGG(permission_name) INTO user_permissions
  FROM get_user_permissions((event->>'user_id')::uuid);

  -- Agregar al JWT
  claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  claims := jsonb_set(claims, '{permissions}', to_jsonb(user_permissions));

  -- Retornar evento modificado
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Configurar el hook en Supabase
-- Dashboard > Authentication > Hooks > Custom Access Token
```

**Frontend - Leer Claims:**

```typescript
// lib/auth.ts
export async function getUserPermissions(): Promise<string[]> {
  const supabase = createBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) return [];

  // Decodificar JWT
  const payload = JSON.parse(atob(session.access_token.split('.')[1]));

  return payload.permissions || [];
}

export async function userCan(permission: string): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions.includes(permission);
}

// Hook React
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserPermissions().then(perms => {
      setPermissions(perms);
      setLoading(false);
    });
  }, []);

  const can = (permission: string) => permissions.includes(permission);

  return { can, permissions, loading };
}
```

**Backend - Validar Claims:**

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Decodificar JWT
  const payload = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString());
  const permissions: string[] = payload.permissions || [];

  // Validar permiso para ruta
  if (req.nextUrl.pathname.startsWith('/aprobaciones')) {
    if (!permissions.includes('modulo:aprobaciones')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  return NextResponse.next();
}
```

#### Estrategia 2: Redis Cache (Para Sistemas de Alto Tráfico)

```typescript
// lib/redis-permissions.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedPermissions(userId: string): Promise<string[]> {
  const cacheKey = `user:${userId}:permissions`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // Query database
  const { data } = await supabase.rpc('get_user_permissions', { input_user_id: userId });
  const permissions = data?.map((row: any) => row.permission_name) || [];

  // Cache por 15 minutos
  await redis.setex(cacheKey, 900, JSON.stringify(permissions));

  return permissions;
}

export async function invalidatePermissionsCache(userId: string) {
  await redis.del(`user:${userId}:permissions`);
}

// Llamar a invalidatePermissionsCache cuando se cambian roles/permisos
```

#### Best Practices Cacheo

1. **TTL Corto**: 15-30 minutos para JWT claims, 5 minutos para Redis
2. **Invalidación Activa**: Cuando admin cambia permisos, invalidar cache inmediatamente
3. **Fallback a DB**: Si cache falla, siempre querrear DB directamente
4. **No cachear en frontend**: Solo usar para UX, backend siempre valida
5. **Comprimir JWT**: Usar permission IDs en lugar de nombres largos si JWT > 4KB

**Fuentes:**
- [Supabase - Custom Access Token Hook](https://supabase.com/docs/guides/auth/server-side/custom-access-token-hook)
- [Medium - Backend Caching Performance](https://medium.com/@karthickrajaraja424/how-do-you-implement-caching-to-improve-backend-performance-ec7624dbf5a0)

---

### 4.3 Validación en Frontend y Backend

**Principio Fundamental:**
> **Frontend = UX only. Backend = Security.**

#### Validación Frontend (React/Next.js)

**Propósito:**
- Mejorar UX (ocultar botones no permitidos)
- Reducir requests inútiles
- **NO es seguridad** (puede ser bypasseado)

**Implementación:**

```typescript
// components/leads/LeadsTable.tsx
export function LeadsTable() {
  const { can } = usePermissions();

  return (
    <div>
      <Table data={leads}>
        {/* ... columnas ... */}

        <TableColumn
          header="Acciones"
          render={(lead) => (
            <div className="flex gap-2">
              {can('leads:update') && (
                <Button onClick={() => editLead(lead.id)}>Editar</Button>
              )}

              {can('leads:delete') && (
                <Button variant="danger" onClick={() => deleteLead(lead.id)}>
                  Eliminar
                </Button>
              )}
            </div>
          )}
        />
      </Table>

      {can('leads:create') && (
        <Button onClick={openCreateModal}>Crear Lead</Button>
      )}

      {can('leads:export') && (
        <Button onClick={exportToExcel}>Exportar Excel</Button>
      )}
    </div>
  );
}
```

**Higher-Order Component (HOC):**

```typescript
// components/auth/withPermission.tsx
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string,
  fallback?: React.ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    const { can, loading } = usePermissions();

    if (loading) return <Spinner />;

    if (!can(requiredPermission)) {
      return fallback || <div>No tienes permiso para ver esto.</div>;
    }

    return <Component {...props} />;
  };
}

// Uso
const ProtectedAprobacionesPage = withPermission(
  AprobacionesPage,
  'modulo:aprobaciones',
  <div>Solo Jefe Ventas y Admin pueden aprobar descuentos.</div>
);
```

#### Validación Backend (Next.js Server Actions)

**Middleware - Route-Level:**

```typescript
// middleware.ts
import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/aprobaciones': 'modulo:aprobaciones',
  '/validacion-bancaria': 'modulo:validacion_bancaria',
  '/usuarios': 'usuarios:read',
};

export async function middleware(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const pathname = req.nextUrl.pathname;
  const requiredPermission = ROUTE_PERMISSIONS[pathname];

  if (requiredPermission) {
    const payload = JSON.parse(
      Buffer.from(session.access_token.split('.')[1], 'base64').toString()
    );
    const permissions: string[] = payload.permissions || [];

    if (!permissions.includes(requiredPermission)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/aprobaciones/:path*',
    '/validacion-bancaria/:path*',
    '/usuarios/:path*',
  ],
};
```

**Server Actions - Operation-Level:**

```typescript
// lib/actions-leads.ts
'use server';

import { createServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

async function checkPermission(permission: string) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado');

  const { data, error } = await supabase.rpc('user_has_permission', {
    input_user_id: user.id,
    input_permission: permission
  });

  if (error || !data) {
    throw new Error(`Permiso denegado: ${permission}`);
  }

  return true;
}

export async function createLead(input: CreateLeadInput) {
  await checkPermission('leads:create');

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('leads')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/leads');
  return data;
}

export async function updateLead(leadId: string, updates: UpdateLeadInput) {
  await checkPermission('leads:update');

  // Verificar ownership si no es admin/jefe_ventas
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: lead } = await supabase
    .from('leads')
    .select('vendedor_id')
    .eq('id', leadId)
    .single();

  if (lead?.vendedor_id !== user?.id) {
    await checkPermission('leads:update_all'); // Solo admin/jefe_ventas
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/leads');
  return data;
}

export async function deleteLead(leadId: string) {
  await checkPermission('leads:delete');

  const supabase = createServerClient();

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId);

  if (error) throw error;

  revalidatePath('/leads');
}

export async function exportLeads() {
  await checkPermission('leads:export');

  // ... lógica de exportación
}
```

**API Routes - External Access:**

```typescript
// app/api/leads/route.ts
import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

async function validateApiPermission(req: Request, permission: string) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing token' };
  }

  const token = authHeader.substring(7);
  const supabase = createServerClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { authorized: false, error: 'Invalid token' };
  }

  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    input_user_id: user.id,
    input_permission: permission
  });

  if (!hasPermission) {
    return { authorized: false, error: `Missing permission: ${permission}` };
  }

  return { authorized: true, user };
}

export async function GET(req: Request) {
  const { authorized, user, error } = await validateApiPermission(req, 'leads:read');

  if (!authorized) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const supabase = createServerClient();

  // RLS automáticamente filtra por permisos
  const { data, error: dbError } = await supabase
    .from('leads')
    .select('*');

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { authorized, error } = await validateApiPermission(req, 'leads:create');

  if (!authorized) {
    return NextResponse.json({ error }, { status: 403 });
  }

  // ... lógica de creación
}
```

#### Best Practices Validación

1. **Defense in Depth**: Validar en múltiples capas (Middleware + Server Actions + RLS)
2. **Fail Secure**: Si hay duda, denegar acceso
3. **Log Unauthorized Attempts**: Registrar intentos de acceso no autorizado
4. **Clear Error Messages**: "Permiso denegado: leads:create" (útil para debugging)
5. **Rate Limiting**: Limitar requests de usuarios sin permisos (evitar brute force)

**Fuentes:**
- [Medium - Building RBAC in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa)
- [Clerk - Implement RBAC in Next.js 15](https://clerk.com/blog/nextjs-role-based-access-control)
- [Permit.io - Implementing RBAC Authorization in Next.js](https://www.permit.io/blog/how-to-add-rbac-in-nextjs)
- [Auth.js - Role Based Access Control](https://authjs.dev/guides/role-based-access-control)

---

## 5. Aplicación Específica: Dashboard CRM Inmobiliario

### 5.1 Roles Típicos en Real Estate

**Basado en investigación de plataformas CRM inmobiliarias:**

1. **Admin** - Configuración total del sistema
2. **Gerente General / Jefe Ventas** - Supervisión de equipos, aprobaciones
3. **Vendedor Senior** - Ventas completas + mentoring
4. **Vendedor Junior** - Ventas básicas
5. **Vendedor Caseta** - Captación de leads en campo (acceso limitado)
6. **Transaction Coordinator** - Gestión de contratos y documentación
7. **Listing Coordinator** - Gestión de locales/propiedades
8. **Finanzas / Contabilidad** - Validación de pagos, facturación
9. **Marketing** - Campañas, análisis de leads
10. **ISA (Inside Sales Agent)** - Calificación de leads

**Fuentes:**
- [Kee Technology - Real Estate Team CRM](https://keetechnology.com/blog/real-estate-team-crm)
- [Salesforce - Real Estate CRM Guide](https://www.salesforce.com/crm/real-estate-crm/)
- [HousingWire - Best Real Estate CRM 2026](https://www.housingwire.com/articles/best-real-estate-crm/)

---

### 5.2 Matriz de Permisos ECOPLAZA

**Módulos del Dashboard:**

| Módulo | Admin | Jefe Ventas | Vendedor | Caseta | Finanzas | Coordinador | Marketing |
|--------|-------|-------------|----------|--------|----------|-------------|-----------|
| **Leads** |
| Ver todos | ✅ | ✅ | ❌ (propios) | ❌ (propios) | ❌ | ✅ (lectura) | ✅ (lectura) |
| Crear | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ✅ (propios) | ✅ (propios) | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Exportar | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Locales** |
| Ver todos | ✅ | ✅ | ❌ (propios) | ❌ (disponibles) | ✅ | ✅ | ✅ (lectura) |
| Cambiar precio | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cambiar estado | ✅ | ✅ | ✅ (separar) | ❌ | ❌ | ❌ | ❌ |
| **Control Pagos** |
| Ver todos | ✅ | ✅ | ❌ (propios) | ❌ | ✅ | ✅ | ❌ |
| Registrar pago | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Verificar pago | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Pago consolidado | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Documentos** |
| Ver documentos | ✅ | ✅ | ✅ (propios) | ❌ | ✅ | ✅ | ❌ |
| Generar contrato | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Generar constancia | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Expediente digital | ✅ | ✅ | ✅ (propios) | ❌ | ✅ | ✅ | ❌ |
| **Descuentos** |
| Solicitar aprobación | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Aprobar descuento | ✅ | ✅ | ❌ | ❌ | ✅ (si configurado) | ❌ | ❌ |
| **Comisiones** |
| Ver propias | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver equipo | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ver todas | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Validación Bancaria** |
| Acceder módulo | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Importar Excel | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Matching manual | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Usuarios** |
| Ver usuarios | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear/editar | ✅ | ✅ (su equipo) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Asignar roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Proyectos** |
| Ver configuración | ✅ | ✅ | ❌ | ❌ | ✅ (lectura) | ❌ | ❌ |
| Editar configuración | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Repulse** |
| Ver campaña | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Configurar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Reuniones IA** |
| Ver módulo | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Programar reunión | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Leyenda:**
- ✅ = Acceso completo
- ❌ = Sin acceso
- (propios) = Solo registros asignados al usuario
- (lectura) = Solo lectura, sin modificación

---

### 5.3 Field-Level Security - Casos Específicos

**Tabla: leads**

| Campo | Admin | Jefe Ventas | Vendedor | Caseta | Finanzas | Marketing |
|-------|-------|-------------|----------|--------|----------|-----------|
| nombre | R/W | R/W | R/W | R/W | - | R |
| telefono | R/W | R/W | R/W | R (masked) | - | R (masked) |
| email | R/W | R/W | R/W | R (masked) | - | R (masked) |
| presupuesto | R/W | R/W | R | R | - | R |
| vendedor_id | R/W | R/W | R | R | - | R |
| utm_source | R/W | R/W | R | R | - | R/W |
| notas_internas | R/W | R/W | R/W | R | - | R |

**Tabla: locales**

| Campo | Admin | Jefe Ventas | Vendedor | Caseta | Finanzas | Coordinador |
|-------|-------|-------------|----------|--------|----------|-------------|
| codigo | R/W | R/W | R | R | R | R |
| precio_lista | R/W | R/W | R | R | R | R |
| precio_venta | R/W | R/W | R | - | R | R |
| descuento | R/W | R/W | R | - | R | R |
| estado | R/W | R/W | R/W | R | R | R |
| proyecto_id | R/W | R | R | R | R | R |

**Tabla: control_pagos**

| Campo | Admin | Jefe Ventas | Vendedor | Finanzas | Coordinador |
|-------|-------|-------------|----------|----------|-------------|
| monto_total | R/W | R | R | R/W | R |
| monto_pagado | R/W | R | R | R/W | R |
| saldo | R/W | R | R | R | R |
| banco | R/W | R | R | R/W | R |
| numero_operacion | R/W | R | R (masked) | R/W | R |
| comprobante_deposito_url | R/W | R | R | R/W | R/W |
| verificado | R/W | R | R | R/W | R |
| verificado_por | R | R | R | R | R |

**Tabla: comisiones**

| Campo | Admin | Jefe Ventas | Vendedor | Finanzas |
|-------|-------|-------------|----------|----------|
| vendedor_id | R | R | R (own) | R |
| comision_vendedor | R/W | R (team) | R (own) | R/W |
| comision_gestion | R/W | R (team) | - | R/W |
| total | R/W | R (team) | R (own) | R/W |
| estado_pago | R/W | R | R (own) | R/W |

**Leyenda:**
- R = Read
- W = Write
- R/W = Read and Write
- (masked) = Mostrar parcialmente (ej: ***-***-1234)
- (own) = Solo propios registros
- (team) = Solo registros del equipo

---

### 5.4 RLS Policies - Ejemplos ECOPLAZA

**Policy 1: Leads - Vendedores solo ven los suyos**

```sql
CREATE POLICY "vendedores_own_leads"
ON leads
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role' = 'vendedor' AND vendedor_id = auth.uid())
  OR
  (auth.jwt() ->> 'role' = 'vendedor_caseta' AND vendedor_id = auth.uid())
  OR
  (auth.jwt() ->> 'role' IN ('jefe_ventas', 'admin'))
);
```

**Policy 2: Control Pagos - Isolation por Proyecto**

```sql
CREATE POLICY "control_pagos_proyecto_isolation"
ON control_pagos
FOR SELECT
TO authenticated
USING (
  proyecto_id = (auth.jwt() ->> 'proyecto_id')::uuid
  AND (
    -- Admin/Jefe Ventas: todos
    auth.jwt() ->> 'role' IN ('admin', 'jefe_ventas')
    OR
    -- Finanzas: todos del proyecto
    auth.jwt() ->> 'role' = 'finanzas'
    OR
    -- Vendedor: solo sus clientes
    (
      auth.jwt() ->> 'role' = 'vendedor'
      AND EXISTS (
        SELECT 1 FROM locales l
        WHERE l.codigo_local = control_pagos.codigo_local
          AND l.vendedor_id = auth.uid()
      )
    )
    OR
    -- Coordinador: todos (documentación)
    auth.jwt() ->> 'role' = 'coordinador'
  )
);
```

**Policy 3: Comisiones - Hierarchical Access**

```sql
CREATE POLICY "comisiones_hierarchical"
ON comisiones
FOR SELECT
TO authenticated
USING (
  -- Admin/Finanzas: todas
  auth.jwt() ->> 'role' IN ('admin', 'finanzas')
  OR
  -- Jefe Ventas: propias + equipo
  (
    auth.jwt() ->> 'role' = 'jefe_ventas'
    AND (
      vendedor_id = auth.uid()
      OR vendedor_id IN (
        SELECT id FROM usuarios WHERE manager_id = auth.uid()
      )
    )
  )
  OR
  -- Vendedor: solo propias
  (
    auth.jwt() ->> 'role' IN ('vendedor', 'vendedor_caseta')
    AND vendedor_id = auth.uid()
  )
);
```

**Policy 4: Validación Bancaria - Solo Finanzas**

```sql
CREATE POLICY "validacion_bancaria_finanzas_only"
ON transacciones_bancarias
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('admin', 'finanzas', 'jefe_ventas')
);
```

---

## 6. Recomendaciones Finales

### 6.1 Roadmap de Implementación

**FASE 1: Base (2 semanas)**
1. Crear schema de base de datos (roles, permissions, user_roles, role_permissions)
2. Seeders con roles básicos (admin, jefe_ventas, vendedor, finanzas)
3. Migrar usuarios existentes a nuevo sistema
4. Implementar función `get_user_permissions()`
5. Configurar JWT claims con custom access token hook

**FASE 2: Middleware y Backend (1 semana)**
1. Implementar middleware para rutas protegidas
2. Crear función `checkPermission()` en server actions
3. Refactorizar server actions existentes para validar permisos
4. Testing exhaustivo de permisos en backend

**FASE 3: Frontend (1 semana)**
1. Crear hook `usePermissions()`
2. Crear componente `<PermissionGate>`
3. Refactorizar componentes para conditional rendering
4. Testing de UX (botones ocultos, rutas bloqueadas)

**FASE 4: RLS Policies (1 semana)**
1. Habilitar RLS en tablas críticas (leads, locales, control_pagos, comisiones)
2. Crear policies para isolation por proyecto
3. Crear policies hierarchical para equipos
4. Testing con diferentes roles

**FASE 5: Permission Sets (Opcional, 1 semana)**
1. Crear tabla permission_sets y permission_set_permissions
2. Crear UI de administración para asignar sets
3. Refactorizar función `get_user_permissions()` para incluir sets
4. Migrar casos de uso complejos a permission sets

**FASE 6: Auditoría (1 semana)**
1. Implementar tabla audit_logs
2. Crear triggers o application-level logging
3. Crear dashboard de auditoría para admins
4. Configurar alertas críticas

**FASE 7: Field-Level Security (Opcional avanzado, 2 semanas)**
1. Crear tabla field_permissions
2. Implementar función `get_allowed_fields()`
3. Refactorizar queries para filtrar campos
4. UI para configurar field permissions

---

### 6.2 Quick Wins

**Semana 1:**
1. ✅ Crear roles básicos en DB
2. ✅ Agregar columna `role` a tabla `usuarios`
3. ✅ Configurar JWT claim `role` en Supabase
4. ✅ Implementar hook `usePermissions()` básico

**Impacto inmediato:**
- Sidebar oculta módulos no accesibles
- Botones Create/Edit/Delete condicionalmente renderizados
- Middleware bloquea rutas no autorizadas

---

### 6.3 Costos y Performance

**Costos:**
- RLS en Supabase: **Gratis** (nativo PostgreSQL)
- JWT Claims: **Gratis** (incluido en Supabase Auth)
- pgAudit Extension: **Gratis** (open source)
- Redis Cache (opcional): **$5-20/mes** (Upstash free tier: 10K requests/día)

**Performance:**
- JWT Claims: **0 ms** de latencia (leído localmente)
- RLS Policies bien indexadas: **< 10 ms** overhead
- Function `get_user_permissions()`: **50-200 ms** (con herencia recursiva)
- Cache Redis: **< 5 ms** hit, **50-200 ms** miss

**Optimizaciones:**
1. Indexar columnas usadas en RLS (user_id, proyecto_id, vendedor_id)
2. Evitar subqueries complejas en policies (usar JWT claims)
3. Cachear permisos en JWT (renovar cada 15 min)
4. Usar Redis solo si > 1000 requests/min

---

### 6.4 Recursos Adicionales

**Herramientas Útiles:**
- [Sourcetable - Role Based Access Control Matrix Template](https://sourcetable.com/excel-templates/role-based-access-control-matrix) - Excel template para permission matrix
- [ClickUp - Roles and Permission Matrix Template](https://clickup.com/templates/roles-and-permission-matrix-t-200633907) - Gestión de permisos
- [GitHub - react-access-control](https://github.com/schester44/react-access-control) - Librería React para RBAC
- [GitHub - Permify/react-role](https://github.com/Permify/react-role) - Lightweight RBAC para React

**Documentación Oficial:**
- [PostgreSQL - Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase - Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Auth0 - Enable RBAC for APIs](https://auth0.com/docs/get-started/apis/enable-role-based-access-control-for-apis)
- [AWS - IAM Best Practices](https://aws.amazon.com/iam/resources/best-practices/)

---

## 7. Conclusiones

### Hallazgos Clave

1. **Modelo Aditivo es Estándar**: Todos los sistemas enterprise (SAP, Salesforce, AWS, Auth0) usan modelo donde permisos se suman (nunca se restan), permitiendo composición flexible.

2. **Herencia Reduce Complejidad**: RBAC1 con herencia de roles reduce 93% el número de policies necesarias vs RBAC tradicional.

3. **Permission Sets > Roles Monolíticos**: Salesforce demostró que permission sets composables son más escalables que roles rígidos.

4. **RLS es Crítico**: Row-Level Security en PostgreSQL/Supabase es la capa de seguridad más importante - defense in depth.

5. **JWT Claims para Performance**: Cachear permisos en JWT reduce latencia a 0 ms vs 50-200 ms por query DB.

6. **Auditoría es Obligatoria**: pgAudit + audit_logs table es requisito para compliance y debugging.

7. **Frontend = UX, Backend = Security**: Validación frontend solo mejora UX, backend siempre debe validar.

### Recomendaciones ECOPLAZA

**Implementación Recomendada (Orden de Prioridad):**

1. **FASE 1** - Roles básicos + JWT Claims + Middleware (2 semanas) - **CRÍTICO**
2. **FASE 2** - RLS Policies en tablas críticas (1 semana) - **CRÍTICO**
3. **FASE 3** - Hook usePermissions() + Conditional Rendering (1 semana) - **IMPORTANTE**
4. **FASE 4** - Auditoría básica (audit_logs) (1 semana) - **IMPORTANTE**
5. **FASE 5** - Permission Sets (Opcional) (1 semana) - **NICE TO HAVE**
6. **FASE 6** - Field-Level Security (Avanzado) (2 semanas) - **FUTURO**

**Stack Recomendado:**
- **Database**: PostgreSQL (Supabase) con RLS nativo
- **Auth**: Supabase Auth con JWT Claims custom hook
- **Frontend**: React hook `usePermissions()` + `<PermissionGate>` component
- **Backend**: Middleware + Server Actions con `checkPermission()`
- **Auditoría**: pgAudit Extension + audit_logs table
- **Cache** (opcional): Redis (Upstash) si > 1000 req/min

**Tiempo Total Estimado:** 6-8 semanas (con testing y refinamiento)

**Costo Total:** **$0-20/mes** (gratis si no usas Redis)

---

## Fuentes Completas

### Sistemas Enterprise

- [SafePaaS - Understanding SAP Authorization](https://www.safepaas.com/articles/understanding-sap-authorization/)
- [Aglea - SAP Roles and Profiles](https://www.aglea.com/en/blog/sap-roles-and-profiles-what-are-they)
- [Pathlock - SAP Authorization Handling](https://pathlock.com/role-adjustments-for-technical-sap-users-how-to-handle-sap-authorizations-safely-and-efectively/)
- [Salesforce - Permission Sets Overview](https://help.salesforce.com/s/articleView?id=sf.perm_sets_overview.htm)
- [Salesforce Admins - Move From Profiles to Permission Sets](https://admin.salesforce.com/blog/2025/get-agentforce-ready-move-from-profiles-to-permission-sets-how-i-solved-it)
- [Salesforce Ben - Salesforce to Retire Permissions on Profiles](https://www.salesforceben.com/salesforce-to-retire-permissions-on-profiles-whats-next/)
- [Okta Learning - Secure Your API with Auth0 RBAC](https://learning.okta.com/secure-your-api-with-auth0-role-based-access-control)
- [Auth0 Docs - Enable RBAC for APIs](https://auth0.com/docs/get-started/apis/enable-role-based-access-control-for-apis)
- [AWS - IAM Best Practices](https://aws.amazon.com/iam/resources/best-practices/)
- [AWS Docs - Policies and Permissions](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [Datadog - Best Practices for Least-Privilege AWS IAM Policies](https://www.datadoghq.com/blog/iam-least-privilege/)
- [Wiz - 13 Essential AWS IAM Best Practices](https://www.wiz.io/academy/cloud-security/aws-iam-best-practices)

### Row-Level & Field-Level Security

- [PostgreSQL Docs - Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Microsoft - Row-Level Security SQL Server](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security?view=sql-server-ver17)
- [Immuta - Implementing Row-Level Security](https://www.immuta.com/guides/data-security-101/row-level-security/)
- [Supabase - Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Medium - Supabase RLS Explained with Real Examples](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)

### Permission Hierarchy & Inheritance

- [Medium - Designing a Role-Based Access Control System](https://medium.com/@07rohit/designing-a-role-based-access-control-rbac-system-a-scalable-approach-441f05168933)
- [Satori - Comprehensive Guide to RBAC Design](https://satoricyber.com/data-access-control/a-comprehensive-guide-to-role-based-access-control-design/)
- [Kubernetes - RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Microsoft Azure - Azure RBAC Overview](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview)

### Auditoría y Logging

- [Bytebase - Postgres Audit Logging Guide](https://www.bytebase.com/blog/postgres-audit-logging/)
- [PGAudit Extension](https://www.pgaudit.org/)
- [Permit.io - Best Practices for Authorization Audit Logs](https://www.permit.io/blog/audit-logs)
- [Severalnines - PostgreSQL Audit Logging Best Practices](https://severalnines.com/blog/postgresql-audit-logging-best-practices/)

### Performance y Caching

- [Medium - Backend Caching Performance](https://medium.com/@karthickrajaraja424/how-do-you-implement-caching-to-improve-backend-performance-ec7624dbf5a0)
- [Supabase - Custom Access Token Hook](https://supabase.com/docs/guides/auth/server-side/custom-access-token-hook)
- [DEV - Mastering Next.js API Caching](https://dev.to/melvinprince/mastering-nextjs-api-caching-improve-performance-with-middleware-and-headers-176p)

### UX/UI Best Practices

- [LogRocket - Dashboard UI Best Practices](https://blog.logrocket.com/ux-design/dashboard-ui-best-practices-examples/)
- [Lazarev - Dashboard UX Design Best Practices](https://www.lazarev.agency/articles/dashboard-ux-design)
- [Medium - 20 Best Dashboard UI/UX Design Principles 2025](https://medium.com/@allclonescript/20-best-dashboard-ui-ux-design-principles-you-need-in-2025-30b661f2f795)
- [Design Studio UI/UX - 8 CRM UX Design Best Practices](https://www.designstudiouiux.com/blog/crm-ux-design-best-practices/)

### Implementación Next.js/React

- [Medium - Building RBAC in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa)
- [Clerk - Implement RBAC in Next.js 15](https://clerk.com/blog/nextjs-role-based-access-control)
- [Permit.io - Implementing RBAC Authorization in Next.js](https://www.permit.io/blog/how-to-add-rbac-in-nextjs)
- [Auth.js - Role Based Access Control](https://authjs.dev/guides/role-based-access-control)
- [DEV - Practical Guide to Role-Based Permissions in React](https://dev.to/victoryndukwu/a-practical-guide-to-role-based-permissions-in-react-1g4m)
- [GitHub - react-access-control](https://github.com/schester44/react-access-control)
- [GitHub - Permify/react-role](https://github.com/Permify/react-role)

### Database Schema Design

- [Darwin Biler - Role-Based Access Control ERD](https://www.darwinbiler.com/role-based-access-control-erd/)
- [Tutorials24x7 - Guide to Design Database for RBAC in MySQL](https://mysql.tutorials24x7.com/blog/guide-to-design-database-for-rbac-in-mysql)
- [GitHub dwyl/auth - RBAC Schema](https://github.com/dwyl/auth/blob/main/role-based-access-control.md)

### Real Estate CRM

- [Kee Technology - Real Estate Team CRM](https://keetechnology.com/blog/real-estate-team-crm)
- [Salesforce - Real Estate CRM Guide](https://www.salesforce.com/crm/real-estate-crm/)
- [HousingWire - Best Real Estate CRM 2026](https://www.housingwire.com/articles/best-real-estate-crm/)
- [iHomeFinder - Top Real Estate CRM Features 2026](https://www.ihomefinder.com/blog/agent-and-broker-resources/real-estate-crm-features-2026/)

### Tools & Templates

- [Sourcetable - Role Based Access Control Matrix Template](https://sourcetable.com/excel-templates/role-based-access-control-matrix)
- [ClickUp - Roles and Permission Matrix Template](https://clickup.com/templates/roles-and-permission-matrix-t-200633907)
- [Argon Digital - Roles and Permissions Matrices](https://argondigital.com/resource/tools-templates/rml-people-models/roles-and-permissions-matrices/)

---

**Fin del Reporte**

**Próximos pasos sugeridos:**
1. Revisar reporte con stakeholders técnicos (CTO, Tech Lead)
2. Aprobar roadmap de implementación (6-8 semanas)
3. Crear tickets en Jira/Linear para cada fase
4. Iniciar FASE 1: Roles básicos + JWT Claims
5. Testing exhaustivo en PROYECTO PRUEBAS antes de producción

**Contacto:** Strategic Researcher Agent | ECOPLAZA Projects
**Fecha:** 11 Enero 2026
