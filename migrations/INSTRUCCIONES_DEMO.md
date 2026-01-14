# INSTRUCCIONES PARA DEMO - Purchase Requisitions

## ESTADO: ✅ LISTO PARA DEMO

La migración 009 ha sido aplicada exitosamente. El error de RLS al enviar PRs a aprobación ha sido corregido.

---

## FLUJO A DEMOSTRAR

### 1. Login como Usuario Normal

```
Email: alonso@ecoplaza.com
Password: Q0KlC36J4M_y
Proyecto: PRUEBAS (SIEMPRE)
```

### 2. Crear Purchase Requisition

1. Ir a `/solicitudes-compra`
2. Click en "Nueva Solicitud"
3. Llenar formulario:
   - **Título:** "Laptop Dell Inspiron para desarrollo"
   - **Categoría:** Tecnología & Sistemas
   - **Prioridad:** Normal
   - **Fecha requerida:** [Una semana desde hoy]
   - **Descripción:** "Laptop para nuevo desarrollador en equipo de TI"
   - **Cantidad:** 1
   - **Precio unitario:** S/ 3,500.00
   - **Justificación:** "Necesaria para incorporación de nuevo desarrollador junior"
4. Click en "Guardar Borrador"

**Resultado esperado:** ✅ PR creada en estado `draft`

### 3. Enviar a Aprobación

1. En la lista de PRs, encontrar la PR recién creada
2. Click en la PR para ver detalles
3. Click en botón "Enviar a Aprobación"

**Resultado esperado:**
- ✅ Status cambia de `draft` a `pending_approval`
- ✅ NO hay error RLS (este era el bug corregido)
- ✅ Se asigna automáticamente un aprobador según las reglas
- ✅ Se envía notificación al aprobador
- ✅ Mensaje de éxito: "Solicitud enviada a [Nombre Aprobador] para aprobación"

### 4. Login como Aprobador

```
Email: gerente.ti@ecoplaza.com.pe
Password: H#TJf8M%xjpTK@Vn
Proyecto: PRUEBAS
```

### 5. Aprobar la PR

1. Ir a `/solicitudes-compra`
2. Ver sección "Pendientes de mi Aprobación"
3. Click en la PR
4. Revisar detalles
5. Click en "Aprobar"
6. Agregar comentario: "Aprobado según presupuesto Q1"
7. Confirmar

**Resultado esperado:**
- ✅ Status cambia de `pending_approval` a `approved`
- ✅ Se registra en historial
- ✅ Se envía notificación al solicitante
- ✅ Mensaje de éxito: "Solicitud aprobada exitosamente"

---

## ESCENARIOS ALTERNATIVOS

### Rechazo de PR

1. Como aprobador, en lugar de aprobar:
2. Click en "Rechazar"
3. Ingresar razón: "Presupuesto excedido este mes, reenviar en Q2"
4. Confirmar

**Resultado:** Status cambia a `rejected`, notificación enviada

### Cancelación de PR

1. Como solicitante (usuario normal)
2. En una PR en estado `pending_approval`
3. Click en "Cancelar Solicitud"
4. Ingresar razón: "Ya no es necesario"
5. Confirmar

**Resultado:** Status cambia a `cancelled`

### Auto-aprobación

1. Crear PR con monto **menor a S/ 500**
2. Enviar a aprobación

**Resultado:** Se auto-aprueba inmediatamente según regla configurada

---

## REGLAS DE APROBACIÓN ACTIVAS

| Monto | Aprobador | SLA |
|-------|-----------|-----|
| < S/ 500 | Auto | Inmediato |
| S/ 500 - S/ 2,000 | Admin | 24h |
| S/ 2,000 - S/ 10,000 | Gerencia | 72h |
| > S/ 10,000 | Superadmin | 120h |

**NOTA:** Prioridad "Urgente" escala directamente a Superadmin sin importar el monto.

---

## CATEGORÍAS DISPONIBLES

1. 💻 Tecnología & Sistemas
2. 📢 Marketing & Publicidad
3. 🏗️ Construcción & Obra
4. 👔 Servicios Profesionales
5. 🪑 Mobiliario & Equipamiento
6. 🔧 Operaciones & Mantenimiento
7. 👥 Recursos Humanos
8. 🏪 Ventas & Comercial
9. 🚚 Transporte & Logística
10. 📦 Gastos Generales

---

## FEATURES A DESTACAR EN DEMO

### 1. Workflow Automatizado
- Asignación automática de aprobador según monto
- Escalación por prioridad
- Auto-aprobación configurable

### 2. Notificaciones en Tiempo Real
- Bell icon en navbar muestra notificaciones
- Click para ver detalles
- Badge de conteo en tiempo real

### 3. Timeline de Auditoría
- Historial completo de acciones
- Timestamp de cada cambio
- Usuario que realizó cada acción

### 4. Comentarios Colaborativos
- Comentarios públicos (visibles para todos)
- Comentarios internos (solo aprobadores)
- Thread de conversación

### 5. Filtros y Búsqueda
- Filtrar por status
- Filtrar por categoría
- Filtrar por rango de monto
- Búsqueda por título/descripción

### 6. Dashboard de Estadísticas
- Total de PRs
- PRs por status (gráfico de dona)
- Monto total aprobado
- Tasa de aprobación
- Tiempo promedio de aprobación

### 7. Seguridad RLS
- Cada usuario solo ve SUS PRs
- + Las PRs asignadas a él para aprobar
- + Admins ven todas
- Aislamiento total por RLS

---

## TROUBLESHOOTING

### Si no aparecen notificaciones

1. Verificar que el módulo de notificaciones está activo
2. Check en tabla `notifications` que se crearon registros
3. Verificar WebSocket connection en DevTools

### Si RLS falla al enviar a aprobación

1. Verificar que la migración 009 está aplicada:
   ```bash
   node migrations/verify-009.js
   ```

2. Verificar política en Supabase:
   - Dashboard → Database → Policies
   - Buscar "Requester can update own PR..."
   - Debe estar ENABLED

### Si no se encuentra aprobador

1. Verificar que hay usuarios activos con rol requerido:
   ```sql
   SELECT nombre, rol, activo FROM usuarios WHERE rol IN ('admin', 'gerencia', 'superadmin');
   ```

2. Verificar reglas de aprobación activas:
   ```sql
   SELECT * FROM pr_approval_rules WHERE is_active = TRUE ORDER BY priority;
   ```

---

## CHECKLIST PRE-DEMO

- [ ] Migración 009 aplicada y verificada
- [ ] Al menos 1 usuario normal activo
- [ ] Al menos 1 aprobador activo (admin/gerencia/superadmin)
- [ ] Reglas de aprobación configuradas
- [ ] Categorías activas
- [ ] Módulo de notificaciones funcionando
- [ ] Login en proyecto PRUEBAS
- [ ] Browser cache limpio
- [ ] DevTools abierto para mostrar logs (opcional)

---

## DESPUÉS DE LA DEMO

### Recolectar Feedback

- ¿El flujo es intuitivo?
- ¿Faltan campos en el formulario?
- ¿Las reglas de aprobación son correctas?
- ¿Se necesitan más categorías?
- ¿El workflow necesita ajustes?

### Posibles Mejoras Post-Demo

1. **Bulk Actions:** Aprobar múltiples PRs a la vez
2. **Templates:** Plantillas de PRs recurrentes
3. **Budget Tracking:** Integración con presupuestos
4. **Purchase Orders:** Generar PO automática después de aprobación
5. **Vendor Management:** Catálogo de proveedores aprobados
6. **Receipt Upload:** Adjuntar comprobante al completar
7. **Export to Excel:** Exportar reportes de PRs
8. **Email Notifications:** Además de notificaciones in-app

---

**Preparado por:** DataDev (Database Architect)
**Fecha:** 14 Enero 2026
**Demo:** HOY
**Estado:** ✅ LISTO
