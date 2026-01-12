# NEXT_STEPS - EcoPlaza Dashboard

> Proximas acciones a ejecutar. Actualizar al cerrar cada sesion.

---

## INVESTIGACIÓN: RBAC Best Practices 2026 ✅ COMPLETADA

**Archivo:** `docs/research/RBAC_BEST_PRACTICES_2026.md`
**Fecha:** 11 Enero 2026

### Reporte Completo Generado (600+ líneas)

**Contenido del reporte:**

1. **Cómo lo Hacen los Grandes:**
   - ✅ SAP - Authorization Objects, Profiles, Roles (herencia jerárquica)
   - ✅ Salesforce - Permission Sets, Permission Set Groups (modelo aditivo 2026)
   - ✅ Auth0/Okta - RBAC con Scopes, Claims, JWT integration
   - ✅ AWS IAM - Policies, Roles, Groups, Permission Boundaries

2. **Patrones de Permisos Granulares:**
   - ✅ Por Módulo/Pantalla (control de acceso a secciones)
   - ✅ Por Acción CRUD (Create/Read/Update/Delete por entidad)
   - ✅ Por Campo - Field-Level Security (mostrar/ocultar/mascarar campos)
   - ✅ Por Registro - Row-Level Security (RLS policies PostgreSQL/Supabase)

3. **Mejores Prácticas 2026:**
   - ✅ Jerarquía y Herencia de Permisos (RBAC1 - 93% menos policies)
   - ✅ Permission Sets (modelo aditivo composable inspirado en Salesforce)
   - ✅ Auditoría de Permisos (pgAudit + audit_logs table, compliance)
   - ✅ UI/UX para Gestión (Linear, Notion, Stripe patterns)

4. **Patrones de Implementación:**
   - ✅ Estructura de Base de Datos (schema completo + seeders SQL)
   - ✅ Cacheo de Permisos (JWT Claims + Redis para performance)
   - ✅ Validación Frontend y Backend (defense in depth)

5. **Aplicación Específica CRM Inmobiliario:**
   - ✅ Roles típicos en Real Estate (10 roles identificados)
   - ✅ Matriz de Permisos ECOPLAZA (7 roles × 12 módulos)
   - ✅ Field-Level Security - Casos específicos (leads, locales, pagos, comisiones)
   - ✅ RLS Policies - Ejemplos SQL para ECOPLAZA

6. **Recomendaciones Finales:**
   - ✅ Roadmap de Implementación (7 fases, 6-8 semanas)
   - ✅ Quick Wins (Semana 1 - impacto inmediato)
   - ✅ Costos y Performance (JWT: 0ms, RLS: <10ms, Total: $0-20/mes)
   - ✅ Recursos Adicionales (25+ herramientas y templates)

**Hallazgos Clave:**

1. **Modelo Aditivo es Estándar**: SAP, Salesforce, AWS, Auth0 todos usan permisos que se suman (nunca se restan)
2. **Herencia Reduce Complejidad**: RBAC1 reduce 93% el número de policies vs RBAC tradicional
3. **Permission Sets > Roles Monolíticos**: Salesforce demostró que sets composables son más escalables
4. **RLS es Crítico**: Row-Level Security en PostgreSQL/Supabase es capa de seguridad más importante
5. **JWT Claims para Performance**: Cachear permisos en JWT reduce latencia a 0ms vs 50-200ms query DB
6. **Auditoría Obligatoria**: pgAudit + audit_logs es requisito para compliance y debugging
7. **Frontend = UX, Backend = Security**: Validación frontend solo mejora UX, backend siempre valida

**Fuentes Consultadas:** 50+ artículos, documentación oficial, tutoriales 2025-2026

---

## PROYECTO ACTIVO: Sistema RBAC (Permisos Granulares)

**Documento Arquitectura:** `docs/architecture/RBAC_ARCHITECTURE.md`
**Documento Investigación:** `docs/research/RBAC_BEST_PRACTICES_2026.md` ✅
**Fecha inicio:** 11 Enero 2026
**Estimado:** 6 semanas (74 horas dev + 4 semanas rollout)

### Estado: Arquitectura + Investigación Completas - Pendiente Aprobación

---

## FASE 0: Validación y Aprobación (ACTUAL)

**Objetivo:** Validar arquitectura con stakeholders y aprobar implementación

**Tareas:**

- [ ] **Presentar arquitectura RBAC a stakeholders técnicos**
  - Revisar documento con backend-dev
  - Revisar con security-auth specialist
  - Validar timeline con equipo
  - Aprobar presupuesto (74 horas)

- [ ] **Coordinar con QA Specialist**
  - Definir plan de testing completo
  - Crear checklist de validación por rol
  - Preparar casos de prueba E2E

- [ ] **Comunicación al equipo**
  - Informar cambios en sistema de permisos
  - Preparar documentación para usuarios
  - Timeline de rollout gradual

**Entregables:**
- Aprobación formal de arquitectura
- Plan de testing documentado
- Comunicación enviada al equipo

---

## FASE 1: Setup Base de Datos ✅ COMPLETADA (11 Enero 2026)

**Objetivo:** Crear tablas, seed inicial, sin impacto en producción

**Tareas:**

- [x] **Crear migración completa:**
  - [x] Creado `supabase/migrations/20260111_rbac_complete.sql` (25 KB)
  - [x] Ejecutado exitosamente en base de datos
  - [x] Migración idempotente (puede ejecutarse múltiples veces sin error)

- [x] **Tablas creadas:**
  - [x] `roles` (8 roles con jerarquías)
  - [x] `permisos` (62 permisos granulares modulo:accion)
  - [x] `rol_permisos` (relación N:N)
  - [x] `usuario_permisos_extra` (Permission Sets)
  - [x] `permisos_audit` (auditoría completa)
  - [x] `usuarios.rol_id` (columna agregada)

- [x] **Índices creados:**
  - [x] 20+ índices optimizados en todas las tablas RBAC
  - [x] Performance < 5ms en queries de validación

- [x] **Funciones PostgreSQL:**
  - [x] `check_permiso(usuario_id, modulo, accion)` - validación individual
  - [x] `get_permisos_usuario(usuario_id)` - permisos efectivos

- [x] **Vista consolidada:**
  - [x] `user_effective_permissions` - permisos efectivos por usuario

- [x] **Seed data:**
  - [x] 8 roles insertados (vendedor y vendedor_caseta ambos jerarquía 60)
  - [x] 62 permisos insertados
  - [x] Relaciones rol-permisos mapeadas completamente
  - [x] 81 usuarios migrados (100%)

- [x] **Políticas RLS:**
  - [x] 10 políticas RLS configuradas y activas

- [x] **Validación completa:**
  - [x] Script `scripts/run-migration-simple.mjs` ejecutado exitosamente
  - [x] Script `scripts/validate-rbac.mjs` - validación exhaustiva
  - [x] Admin tiene 62 permisos ✓
  - [x] Jefe Ventas tiene 43 permisos ✓
  - [x] Vendedor tiene 12 permisos ✓
  - [x] Vendedor Caseta tiene 5 permisos ✓
  - [x] Funciones funcionando correctamente ✓

- [x] **Documentación:**
  - [x] `docs/RBAC_QUERIES_UTILES.md` - 12 secciones con queries de validación
  - [x] Queries de testing, auditoría, performance, administración

**Tiempo real:** 3 horas

**Resultado:** Base de datos completamente configurada y lista para Fase 2

---

## FASE 2: Backend (Semana 2)

**Objetivo:** Crear helpers y funciones de validación

**Tareas:**

- [ ] **Crear estructura:**
  - [ ] Carpeta `lib/permissions/`

- [ ] **Archivos backend:**
  - [ ] `lib/permissions/permissions-db.ts` (queries BD)
  - [ ] `lib/permissions/permissions-cache.ts` (cache en memoria)
  - [ ] `lib/permissions/check-permission.ts` (helpers server actions)
  - [ ] `lib/permissions/route-permissions.ts` (mapeo rutas)

- [ ] **Testing unitario:**
  - [ ] Test `getUserPermissions()`
  - [ ] Test `hasPermission()`
  - [ ] Test cache (hit/miss)
  - [ ] Test `requirePermission()`

**Tiempo estimado:** 12 horas

---

## FASE 3: Frontend (Semana 2-3)

**Objetivo:** Context y hooks para componentes

**Tareas:**

- [ ] **Archivos frontend:**
  - [ ] `lib/permissions/permissions-context.tsx` (Context React)
  - [ ] `lib/permissions/permissions-client.ts` (fetch permisos)

- [ ] **Integración:**
  - [ ] Agregar `<PermissionsProvider>` en `app/layout.tsx`
  - [ ] Testing de hook `usePermissions()`

- [ ] **Componentes de prueba:**
  - [ ] Crear componente demo con `can()` y `canAny()`
  - [ ] Validar en diferentes roles

**Tiempo estimado:** 8 horas

---

## FASE 4: Middleware (Semana 3)

**Objetivo:** Actualizar middleware con feature flag

**Tareas:**

- [ ] **Variables de entorno:**
  - [ ] Agregar `ENABLE_RBAC=false` en Vercel (staging)
  - [ ] Agregar `RBAC_MODULES=` (vacío por defecto)
  - [ ] Agregar `PERMISSIONS_CACHE_TTL=300000` (opcional)

- [ ] **Actualizar `middleware.ts`:**
  - [ ] Implementar lógica dual (hardcoded vs RBAC)
  - [ ] Función `hasRouteAccess()`
  - [ ] Mantener código hardcoded como fallback

- [ ] **Testing de rutas:**
  - [ ] Probar con `ENABLE_RBAC=false` (debe funcionar igual)
  - [ ] Probar con `ENABLE_RBAC=true` (nueva lógica)
  - [ ] Validar todos los roles en todas las rutas

**Tiempo estimado:** 6 horas

---

## FASE 5: Server Actions (Semana 3-4)

**Objetivo:** Actualizar ~50 server actions con `requirePermission()`

**Tareas:**

### Módulo LEADS
- [ ] `lib/actions.ts` - leads CRUD
  - [ ] `createLead()` → requirePermission('leads', 'crear')
  - [ ] `updateLead()` → requirePermission('leads', 'editar')
  - [ ] `deleteLead()` → requirePermission('leads', 'eliminar')
  - [ ] `exportLeads()` → requirePermission('leads', 'exportar')

### Módulo LOCALES
- [ ] `lib/actions-locales.ts`
  - [ ] `updateLocal()` → requirePermission('locales', 'editar')
  - [ ] `cambiarEstadoLocal()` → requirePermission('locales', 'cambiar_estado')
  - [ ] `asignarVendedor()` → requirePermission('locales', 'asignar_vendedor')

### Módulo VENTAS
- [ ] `lib/actions-locales.ts` (registro venta)
  - [ ] `registrarVenta()` → requirePermission('ventas', 'crear')
  - [ ] `updatePrecioVenta()` → requirePermission('ventas', 'cambiar_precio')

### Módulo CONTROL_PAGOS
- [ ] `lib/actions-control-pagos.ts`
  - [ ] `registrarAbono()` → requirePermission('control_pagos', 'crear')
  - [ ] `verificarAbono()` → requirePermission('control_pagos', 'verificar')

### Módulo COMISIONES
- [ ] `lib/actions-comisiones.ts`
  - [ ] `getComisiones()` → requireAnyPermission(['comisiones.ver_todas', 'comisiones.ver_propias'])
  - [ ] `calcularComisiones()` → requirePermission('comisiones', 'calcular')

### Módulo USUARIOS
- [ ] `lib/actions-usuarios.ts`
  - [ ] `createUsuario()` → requirePermission('usuarios', 'crear')
  - [ ] `updateUsuario()` → requirePermission('usuarios', 'editar')
  - [ ] `resetPassword()` → requirePermission('usuarios', 'resetear_password')

### Módulo PROYECTOS
- [ ] `lib/actions-proyecto-config.ts`
  - [ ] `updateProyectoConfig()` → requirePermission('proyectos', 'configurar')

### Módulo APROBACIONES
- [ ] `lib/actions-aprobaciones.ts`
  - [ ] `aprobarDescuento()` → requirePermission('aprobaciones', 'aprobar')
  - [ ] `saveConfigAprobaciones()` → requirePermission('aprobaciones', 'configurar_rangos')

### Módulo REPULSE
- [ ] `lib/actions-repulse.ts`
  - [ ] `ejecutarRepulse()` → requirePermission('repulse', 'ejecutar_campana')

### Módulo VALIDACION_BANCARIA
- [ ] `lib/actions-validacion-bancaria.ts`
  - [ ] `importarEstadoCuenta()` → requirePermission('validacion_bancaria', 'importar')

### Módulo REUNIONES
- [ ] `lib/actions-reuniones.ts`
  - [ ] `createReunion()` → requirePermission('reuniones', 'crear')
  - [ ] `transcribirReunion()` → requirePermission('reuniones', 'transcribir')

**Tiempo estimado:** 20 horas

---

## FASE 6: Testing Completo (Semana 5)

**Objetivo:** QA exhaustivo con todos los roles

**Tareas:**

- [ ] **Testing manual con credenciales:**
  - [ ] Admin (`gerencia@ecoplaza.com`)
  - [ ] Jefe Ventas (`leojefeventas@ecoplaza.com`)
  - [ ] Vendedor (`alonso@ecoplaza.com`)
  - [ ] Caseta (`leocaseta@ecoplaza.com`)
  - [ ] Finanzas (`rosaquispef@ecoplaza.com`)

- [ ] **Checklist por rol:**
  - [ ] Validar rutas accesibles
  - [ ] Validar botones visibles/ocultos
  - [ ] Validar server actions (permitidas/denegadas)
  - [ ] Validar mensajes de error

- [ ] **Activar RBAC en staging:**
  - [ ] Setear `ENABLE_RBAC=true` en staging
  - [ ] Smoke testing completo (todas las rutas)
  - [ ] Monitoreo de logs (permisos denegados)

- [ ] **Testing E2E (Playwright):**
  - [ ] Crear suite de tests por rol
  - [ ] Validar flujos críticos (crear lead, venta, pago)

**Tiempo estimado:** 16 horas

---

## FASE 7: Rollout Gradual (Semana 6-9)

**Objetivo:** Desplegar a producción gradualmente

### Semana 6: Módulo LEADS
- [ ] Setear `RBAC_MODULES=leads` en producción
- [ ] Monitoreo activo (24h)
- [ ] Validar que leads funciona correctamente
- [ ] Rollback si hay issues críticos

### Semana 7: LEADS + LOCALES + VENTAS
- [ ] Setear `RBAC_MODULES=leads,locales,ventas`
- [ ] Monitoreo activo (48h)
- [ ] Validar flujo completo de venta

### Semana 8: Agregar CONTROL_PAGOS + COMISIONES
- [ ] Setear `RBAC_MODULES=leads,locales,ventas,control_pagos,comisiones`
- [ ] Monitoreo de rol finanzas
- [ ] Validar cálculo de comisiones

### Semana 9: TODO (Feature Flag ON)
- [ ] Setear `ENABLE_RBAC=true` en producción
- [ ] Todos los módulos con RBAC
- [ ] Monitoreo intensivo (1 semana)
- [ ] Documentar issues y resolverlos

**Criterios de rollback por módulo:**
- Error rate > 5% en logs
- Usuario reporta bug crítico
- Permiso denegado incorrectamente

---

## FASE 8: Limpieza (Semana 10-11)

**Objetivo:** Remover código hardcoded

**Tareas:**

- [ ] **Remover feature flags:**
  - [ ] Eliminar lógica dual en middleware
  - [ ] Remover `ENABLE_RBAC` check en código
  - [ ] Consolidar funciones

- [ ] **Remover código hardcoded:**
  - [ ] Buscar y eliminar validaciones `rol === 'admin'`
  - [ ] Grep de strings hardcoded
  - [ ] Limpiar comentarios obsoletos

- [ ] **Documentación:**
  - [ ] Actualizar `docs/modulos/` con nuevos permisos
  - [ ] Crear guía de usuario "Cómo funcionan los permisos"
  - [ ] Actualizar README.md

- [ ] **Code review final:**
  - [ ] Solicitar revisión de backend-dev
  - [ ] Solicitar revisión de security-auth
  - [ ] Merge a main

**Tiempo estimado:** 8 horas

---

## Otros Proyectos en Backlog

### COMBOBOX/AUTOCOMPLETE FILTROS (Pendiente)

**Plan:** `docs/research/COMBOBOX_AUTOCOMPLETE_FILTROS_2026.md`
**Objetivo:** Implementar filtros con shadcn/ui Combobox

**Tareas:**
- [ ] Instalar shadcn/ui components (popover, command)
- [ ] Crear `components/shared/UtmFilterCombobox.tsx`
- [ ] Integrar en `LeadsClient` y `OperativoClient`
- [ ] Agregar chips para filtros activos
- [ ] Testing funcional

**Tiempo estimado:** 2.5 horas

---

### IA CONVERSACIONAL PARA DATOS (Futuro)

**Plan:** `docs/research/IA_Conversacional_Datos_2026.md`
**Recomendación:** LangChain SQL Agent + FastAPI + Next.js

**Fases:**
- FASE 1: Supabase AI Assistant (gratis, 4-6 horas)
- FASE 2: LangChain MVP (20-30 horas)
- FASE 3: Multi-modal (40-60 horas)

**Requiere:**
- Validación con stakeholders
- Aprobación de budget ($60-120/mes)

---

### Mejoras Futuras (Prioridad Baja)

- [ ] Analytics de conversión
- [ ] Dashboard morosidad
- [ ] Exportar comisiones a PDF/Excel
- [ ] Swagger UI variables en Vercel

---

## Notas Importantes

- **Regla de Proyecto:** TODO se filtra por proyecto seleccionado en login
- **Testing:** Siempre usar PROYECTO PRUEBAS
- **Commits:** NO incluir "Generated with Claude Code" ni "Co-Authored-By"
- **Feature Flags:** Mantener rollback fácil durante 4 semanas

---

**Ultima Actualizacion:** 11 Enero 2026
**Sesion:** 86 - Investigación RBAC Best Practices 2026 completada. Reporte generado en docs/research/RBAC_BEST_PRACTICES_2026.md
