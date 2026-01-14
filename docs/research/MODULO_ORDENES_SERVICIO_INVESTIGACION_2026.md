# Investigación: Módulo de Órdenes de Servicio / Purchase Requests

**Fecha:** 13 Enero 2026
**Investigador:** Strategic Researcher
**Cliente:** ECOPLAZA
**Propósito:** Investigar mejores prácticas de la industria para implementar un módulo de Purchase Requests/Service Orders de clase mundial

---

## Resumen Ejecutivo

Tras una investigación exhaustiva de las mejores prácticas de la industria en 2026, incluyendo el análisis de sistemas líderes como SAP S/4HANA, Oracle NetSuite, ServiceNow, Jira Service Management, Monday.com, y otros, se han identificado los componentes clave, flujos de trabajo, y patrones de diseño para implementar un módulo de **Purchase Requisitions** (término estándar de la industria) de nivel empresarial.

### Hallazgos Clave

1. **Terminología:** El término estándar es "**Purchase Requisition**" o "**Purchase Request**" (más informal)
2. **Proceso centralizado:** Los sistemas modernos automatizan el 80-90% del flujo de aprobación
3. **Aprobación por rangos:** Threshold-based approvals son el estándar (ej: <$500 auto-aprobado, >$10K requiere VP)
4. **Mobile-first:** Aprobadores deben poder revisar/aprobar desde dispositivos móviles en 2026
5. **Notificaciones multi-canal:** Email + In-app + Push (opcional SMS/WhatsApp)
6. **Métricas críticas:** Cycle time, approval rate, first-pass yield

---

## 1. Terminología Correcta - Industry Standard

### Resultado de Investigación

El término **"Purchase Requisition"** (PR) es el estándar global en software empresarial según SAP, Oracle, ServiceNow, y Microsoft Dynamics.

| Sistema | Término Usado |
|---------|--------------|
| SAP S/4HANA | Purchase Requisition (PR) |
| Oracle NetSuite | Purchase Requisition / Requisition |
| ServiceNow | Purchase Requisition / Procurement Request |
| Microsoft Dynamics 365 | Purchase Requisition |
| Jira Service Management | Request (genérico, configurable) |
| Monday.com | Purchase Request / Project Request |

**Diferencias Conceptuales:**

- **Purchase Requisition (PR):** Solicitud interna formal para iniciar una compra. Requiere aprobación antes de convertirse en Purchase Order (PO).
- **Purchase Order (PO):** Documento externo enviado al proveedor después de aprobación. Compromiso legal de compra.
- **Service Order:** Término más usado en Field Service Management para trabajos técnicos (instalación, reparación, mantenimiento).

### Recomendación para ECOPLAZA

**Usar: "Purchase Requisition" en base de datos y código**
**Mostrar: "Solicitud de Compra" o "Orden de Servicio" en UI según contexto**

Justificación:
- "Purchase Requisition" permite integración futura con sistemas ERP
- En Perú/LATAM "Solicitud de Compra" es más familiar que "Requisición"
- Si ECOPLAZA requiere servicios (mantenimiento, marketing, IT), "Orden de Servicio" es más amplio

---

## 2. Cómo lo Hacen los Sistemas de Clase Mundial

### 2.1 SAP S/4HANA (Líder Global ERP)

**Flujo:**
1. Employee crea Purchase Requisition (transacción ME51N)
2. PR asignada automáticamente a Purchasing Group según categoría
3. Approval workflow basado en:
   - Release Strategy (grupos de aprobación)
   - Value Limits (rangos de monto)
   - Plant/Cost Center
4. Una vez aprobado → Procurement crea Purchase Order (ME21N)
5. Goods Receipt → Invoice Verification → Payment

**Características Destacadas:**
- **Requirement Priority:** Clasificación Low/Medium/High basada en urgency
- **Source Determination:** Sugerencia automática de proveedores
- **Budget Check:** Validación de presupuesto antes de aprobar
- **Multi-level Release:** Hasta 8 niveles de aprobación configurables

**Fuente:** [SAP Community - Requirement Prioritization](https://blogs.sap.com/2013/11/23/requirement-prioritization-in-sap-materials-management/)

---

### 2.2 ServiceNow (Líder en Enterprise Service Management)

**Flujo:**
1. Employee completa Catalog Item o crea Procurement Request
2. Pre-validación automática (policy compliance, budget check)
3. Approval routing basado en:
   - Approval Groups (jerárquico)
   - Dollar thresholds
   - Category-based rules
4. Approver notificado via email/Slack/MS Teams
5. Puede aprobar desde Help Center, email, o mobile app
6. Si aprobado → Procurement Request → Purchase Order
7. Integración con ERPs externos (SAP, Oracle, Coupa)

**Características Destacadas:**
- **No requiere licencia ServiceNow** para aprobar (solo customers del service space)
- **Approval from Email/Slack:** Aprobar sin login
- **Parallel Approvals:** Múltiples aprobadores simultáneos
- **Escalation Rules:** Auto-escalate si no hay respuesta en X días

**Fuentes:**
- [ServiceNow - Quick Start Guide Procurement](https://www.servicenow.com/community/ham-articles/quick-start-guide-procurement-request-and-purchase-orders/ta-p/2990536)
- [ServiceNow - What are Approvals?](https://support.atlassian.com/jira-service-management-cloud/docs/what-are-approvals/)

---

### 2.3 Oracle NetSuite (Cloud ERP Líder)

**Flujo:**
1. Employee crea Requisition desde portal
2. Sistema valida budget y preferred vendors
3. Approval workflow con estados:
   - **Pending Approval**
   - **Rejected** (editable, resubmit)
   - **Approved**
   - **Partially Received** (si se convirtió en PO)
   - **Closed**
4. Aprobador recibe email notification con link directo
5. Puede aprobar/rechazar con comentarios
6. Si aprobado → Auto-convert a Purchase Order (opcional)

**Características Destacadas:**
- **Set Next Approver:** Cadena de aprobación dinámica
- **Conditional Routing:** Reglas if/then para routing complejo
- **Requisition Templates:** Pre-configurar requisitions recurrentes

**Fuente:** [Oracle NetSuite - Requisition Approval Workflow](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_3960249592.html)

---

### 2.4 Jira Service Management (Atlassian)

**Flujo:**
1. User crea Issue con Request Type "Purchase Request"
2. Custom fields capturan: item, quantity, cost, justification
3. Workflow transition a status con Approval Step
4. Approval configurado con:
   - **Approvers field:** Usuarios individuales
   - **Approver groups field:** Grupos dinámicos
   - **Number of approvals required:** All, Any, Majority
5. Aprobador notificado via email/Slack/MS Teams
6. Aprueba directamente desde email o Help Center
7. Transition automática a siguiente estado

**Características Destacadas:**
- **Approval Step en cualquier Status:** Flexibilidad total de workflow
- **No requiere Jira license:** Approvers solo necesitan ser customers
- **Comments on Approval:** Dejar feedback al aprobar/rechazar
- **SLA Tracking:** Medir tiempo de aprobación

**Fuentes:**
- [Jira Service Management - What are Approvals?](https://support.atlassian.com/jira-service-management-cloud/docs/what-are-approvals/)
- [Jira Service Management - Add Approval to Workflow](https://support.atlassian.com/jira-service-management-cloud/docs/add-an-approval-to-a-workflow/)

---

### 2.5 Monday.com (Work OS / Project Management)

**Flujo:**
1. Employee completa Form (monday workforms)
2. Submission crea Item en Board "Purchase Requests"
3. Automation rules:
   - If Amount > $1000 → Assign to Manager
   - If Amount > $5000 → Notify CFO
4. Status column: Draft → Pending → Approved → Ordered
5. Approver cambia Status manualmente
6. Integrations: Slack notifications, email alerts

**Características Destacadas:**
- **Visual Kanban:** Board view para ver pipeline de aprobaciones
- **No-code Automations:** If-this-then-that rules
- **Form Builder:** Customizable forms con conditional logic
- **Templates:** Pre-built "Project Requests and Approvals" template

**Fuentes:**
- [Monday.com - Project Requests and Approvals Template](https://monday.com/templates/template/122936/project-requests-and-approvals)
- [Monday.com - Purchase Order Guide](https://monday.com/blog/project-management/purchase-order/)

---

### 2.6 Comparativa Rápida

| Sistema | Fortaleza | Debilidad | Mejor Para |
|---------|-----------|-----------|------------|
| **SAP S/4HANA** | Potencia, integración financiera | Complejidad, costo | Grandes corporaciones |
| **ServiceNow** | Automatización, UX moderna | Costo de licencias | Enterprises con ITSM |
| **Oracle NetSuite** | Cloud-native, escalabilidad | Curva de aprendizaje | Mid-market, cloud-first |
| **Jira Service Mgmt** | Flexibilidad, integraciones | Requiere configuración | Equipos técnicos |
| **Monday.com** | Simplicidad, visual | Menos robusto para ERP | SMBs, startups |

---

## 3. Flujo de Estados (State Machine) - Best Practices

### 3.1 Estados Estándar de la Industria

Según investigación de SAP, Oracle, ServiceNow, y Microsoft Dynamics 365:

| Estado | Descripción | Puede Editar | Acciones Disponibles |
|--------|-------------|--------------|----------------------|
| **Draft** | Borrador inicial, no enviado | ✅ Creador | Submit, Delete |
| **Submitted** | Enviado, esperando validación | ❌ | Recall (opcional) |
| **Pending Approval** | En cola de aprobación | ❌ | (Solo aprobador) |
| **In Review** | Bajo revisión activa | ❌ | (Solo aprobador) |
| **Approved** | Aprobado, listo para procurement | ❌ | Convert to PO, Cancel |
| **Rejected** | Rechazado con comentarios | ✅ Creador (resubmit) | Edit & Resubmit, Close |
| **On Hold** | Pausado temporalmente | ❌ | Resume, Cancel |
| **Cancelled** | Cancelado (por creador o admin) | ❌ | - |
| **Completed** | Convertido a PO / Cerrado | ❌ | - |

### 3.2 Diagrama de Transiciones

```
┌─────────┐
│  DRAFT  │
└────┬────┘
     │ submit()
     ▼
┌──────────┐       recall()        ┌─────────┐
│SUBMITTED │────────────────────────▶ DRAFT   │
└────┬─────┘                        └─────────┘
     │ auto-assign-approver()
     ▼
┌─────────────────┐
│PENDING APPROVAL │
└────┬───────┬────┘
     │       │
     │       │ reject()
     │       │
     │       ▼
     │   ┌──────────┐   resubmit()   ┌──────────┐
     │   │ REJECTED │───────────────▶│SUBMITTED │
     │   └──────────┘                 └──────────┘
     │
     │ approve()
     ▼
┌──────────┐
│ APPROVED │
└────┬─────┘
     │
     ├──── convert_to_po() ──────▶ ┌───────────┐
     │                              │ COMPLETED │
     │                              └───────────┘
     │
     └──── cancel() ──────────────▶ ┌───────────┐
                                    │ CANCELLED │
                                    └───────────┘
```

### 3.3 Validaciones de Transición (Transition Guards)

**Best Practice:** Validar ANTES de cambiar estado

```typescript
// Ejemplo conceptual
function canTransition(from: State, to: State, request: PurchaseRequest): boolean {
  switch(from) {
    case 'draft':
      if (to === 'submitted') {
        // Validar campos obligatorios
        return hasRequiredFields(request) && hasValidAmount(request);
      }
      break;

    case 'pending_approval':
      if (to === 'approved') {
        // Validar que el usuario es aprobador autorizado
        return isAuthorizedApprover(currentUser, request);
      }
      break;

    case 'rejected':
      if (to === 'submitted') {
        // Validar que el creador hizo cambios
        return hasChanges(request) && isCreator(currentUser, request);
      }
      break;
  }
  return false; // Transición no válida
}
```

**Fuentes:**
- [Microsoft Dynamics 365 - Purchase Requisition Workflow](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-requisitions-workflow)
- [Kissflow - Purchase Requisition Guide 2026](https://kissflow.com/procurement/purchase-requisition/purchase-requisition-guide/)

---

## 4. Campos del Formulario - Best Practices

### 4.1 Campos Obligatorios (Core Required)

Según análisis de SAP, Oracle, ServiceNow, y formularios de universidades (UNC, CSUF):

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **Requester** | User | Creador (auto-fill) | john.doe@ecoplaza.com |
| **Department** | Dropdown | Área que solicita | Ventas, TI, Marketing |
| **Request Title** | Text | Título descriptivo breve | "Laptops para equipo de ventas" |
| **Category** | Dropdown | Tipo de compra | Equipos, Servicios, Suministros |
| **Item Description** | Textarea | Descripción detallada | "5 Lenovo ThinkPad L15 Gen 4..." |
| **Quantity** | Number | Cantidad solicitada | 5 |
| **Unit Price** | Currency | Precio unitario estimado | S/ 3,500.00 |
| **Total Amount** | Currency | Total (auto-calculated) | S/ 17,500.00 |
| **Justification** | Textarea | Por qué es necesario | "Equipo de ventas requiere..." |
| **Required By Date** | Date | Fecha límite de entrega | 2026-02-15 |

### 4.2 Campos Opcionales (Enhanced)

| Campo | Tipo | Descripción | Cuándo Usar |
|-------|------|-------------|-------------|
| **Priority** | Dropdown | Low, Medium, High, Urgent | Importante para planning |
| **Cost Center** | Dropdown | Centro de costo | Si tienen contabilidad por centros |
| **Budget Code** | Text | Código presupuestal | Para validación de presupuesto |
| **Project** | Dropdown | Proyecto asociado | Si compra es para proyecto específico |
| **Preferred Vendor** | Autocomplete | Proveedor sugerido | Acelera procurement |
| **Vendor Quote** | File Upload | Cotización del proveedor | Justificación de precio |
| **Attachments** | Multiple Files | Especificaciones, imágenes | Máx 5 archivos, 10MB c/u |
| **Delivery Address** | Textarea | Dirección de entrega | Si difiere de oficina |
| **Notes** | Textarea | Comentarios adicionales | Información extra |

### 4.3 Campos del Sistema (Auto-Generated)

| Campo | Tipo | Generación |
|-------|------|------------|
| **PR Number** | Text | Auto: `PR-2026-00123` |
| **Status** | Enum | Draft (default) |
| **Created At** | Timestamp | Auto: current timestamp |
| **Created By** | User | Auto: current user |
| **Updated At** | Timestamp | Auto: on every update |
| **Approved By** | User | Null hasta aprobación |
| **Approved At** | Timestamp | Null hasta aprobación |
| **Rejection Reason** | Text | Solo si rechazado |

### 4.4 Best Practices de UX para Campos

**1. Marcar Campos Obligatorios con Asterisco (*)**
- Según Nielsen Norman Group, usar asterisco rojo
- Incluir leyenda: "* Campos obligatorios"

**2. Si >80% de campos son obligatorios, marcar solo los opcionales**
- Texto: "(opcional)" en gris
- Reduce clutter visual

**3. Validación en Tiempo Real (Inline Validation)**
- Email: validar formato al perder foco
- Monto: validar que sea > 0
- Fecha: no permitir fechas pasadas

**4. Campos con Valores por Defecto**
- Priority → "Medium" (default)
- Required By Date → +7 días desde hoy
- Department → Auto-detectar del perfil del usuario

**5. Help Text / Placeholders**
- No usar placeholder como label (desaparece al escribir)
- Usar help text debajo del campo para explicaciones

**Fuentes:**
- [Nielsen Norman Group - Marking Required Fields](https://www.nngroup.com/articles/required-fields/)
- [Form UX Best Practices 2026](https://www.designstudiouiux.com/blog/form-ux-design-best-practices/)
- [CSUF - Purchase Requisition Fields](https://csuf-erp.screenstepslive.com/m/70022/l/1160444-what-information-do-you-need-for-a-purchase-requisition)

---

## 5. Tipos de Purchase Requisition - Clasificación

### 5.1 Tipos Estándar (SAP/Oracle)

Según documentación de SAP y Oracle NetSuite:

| Tipo | Descripción | Características | Aprobación |
|------|-------------|-----------------|------------|
| **Standard** | Compra única de producto/servicio | - Más común<br>- Item específico<br>- Cantidad definida | Workflow normal |
| **Blanket** | Pre-aprobación de monto para proveedor | - Por período (trimestre, año)<br>- Múltiples compras pequeñas<br>- Ej: Útiles de oficina | Aprobación por monto total |
| **Emergency** | Urgente, no planificado | - Fast-track approval<br>- Justificación obligatoria<br>- Post-audit | Aprobador senior directo |
| **Services** | Servicios profesionales/consultoría | - Horas/días en lugar de unidades<br>- Puede requerir SOW<br>- Ej: Marketing, IT support | Requiere contrato |

### 5.2 Categorías de Compra (Recomendadas para ECOPLAZA)

| Categoría | Ejemplos | Aprobador Típico |
|-----------|----------|------------------|
| **Technology/IT** | Laptops, software, licencias | CTO / IT Manager |
| **Office Supplies** | Papelería, consumibles | Admin Manager |
| **Marketing** | Publicidad, diseño, eventos | CMO / Marketing Manager |
| **Professional Services** | Consultoría, legal, contable | CFO / CEO |
| **Facilities/Maintenance** | Limpieza, reparaciones, seguridad | Facilities Manager |
| **Human Resources** | Capacitación, beneficios | HR Manager |
| **Sales/Operations** | Merchandising, demos | Sales Manager |

**Beneficio:** Routing automático basado en categoría

**Fuentes:**
- [Oboloo - Types of Purchase Requisitions](https://oboloo.com/what-are-the-different-types-of-purchase-requisitions-in-procurement/)
- [Kissflow - Purchase Requisition Guide 2026](https://kissflow.com/procurement/purchase-requisition/purchase-requisition-guide/)

---

## 6. UX/UI Patterns - Best Practices 2026

### 6.1 Formulario: Wizard vs Single Page

**Análisis de Tendencias 2026:**

| Patrón | Pros | Contras | Mejor Para |
|--------|------|---------|------------|
| **Single Page** | - Más rápido para expertos<br>- Ve todo el contexto<br>- Fácil de volver atrás | - Intimidante si muchos campos<br>- Scroll largo | PRs simples (<15 campos) |
| **Multi-Step Wizard** | - Menos abrumador<br>- Guía paso a paso<br>- Validación por sección | - Más clicks<br>- No ve contexto completo | PRs complejas (>15 campos) |
| **Hybrid (Recomendado)** | - Single page con secciones colapsables<br>- Progreso visible<br>- Secciones opcionales colapsadas | - Más complejo de implementar | PRs empresariales |

**Recomendación para ECOPLAZA:**

**Usar Single Page con Secciones Accordion:**

```
┌──────────────────────────────────────────┐
│  Nueva Solicitud de Compra               │
├──────────────────────────────────────────┤
│                                          │
│  📋 INFORMACIÓN BÁSICA ▼                 │ <-- Siempre expandido
│     ├─ Título*                           │
│     ├─ Categoría*                        │
│     ├─ Prioridad                         │
│     └─ Fecha Requerida*                  │
│                                          │
│  💰 DETALLES FINANCIEROS ▼               │ <-- Siempre expandido
│     ├─ Descripción del Item*             │
│     ├─ Cantidad*                         │
│     ├─ Precio Unitario*                  │
│     └─ Total (auto): S/ 17,500           │
│                                          │
│  📝 JUSTIFICACIÓN Y APROBACIÓN ▼         │ <-- Siempre expandido
│     ├─ Justificación*                    │
│     └─ Proveedor Sugerido                │
│                                          │
│  📎 DOCUMENTOS ADJUNTOS ▶                │ <-- Colapsado (opcional)
│                                          │
│  🏢 INFORMACIÓN ADICIONAL ▶              │ <-- Colapsado (opcional)
│                                          │
│  [Guardar Borrador]  [Enviar Solicitud] │
└──────────────────────────────────────────┘
```

**Beneficios:**
- Ve campos críticos sin scroll
- Secciones opcionales no intimidan
- Puede expandir según necesite
- Mobile-friendly (accordion colapsa bien)

**Fuentes:**
- [Eleken - 32 Stepper UI Examples](https://www.eleken.co/blog-posts/stepper-ui-examples)
- [Design Studio UIUX - Form Best Practices 2026](https://www.designstudiouiux.com/blog/form-ux-design-best-practices/)

---

### 6.2 Bandeja de Aprobación - Design Patterns

**3 Enfoques Principales:**

#### A) Inbox Style (Recomendado para ECOPLAZA)

```
┌───────────────────────────────────────────────────────────┐
│  Solicitudes Pendientes de Aprobación                    │
├───────────────────────────────────────────────────────────┤
│  🔴 PR-2026-00145  │  Laptops Equipo Ventas  │  S/ 17,500│
│     Juan Pérez     │  Alta Prioridad         │  Hace 2h  │
├───────────────────────────────────────────────────────────┤
│  🟡 PR-2026-00143  │  Licencias Adobe        │  S/ 4,200 │
│     María García   │  Media Prioridad        │  Ayer     │
├───────────────────────────────────────────────────────────┤
│  🟢 PR-2026-00138  │  Útiles Oficina         │  S/ 320   │
│     Luis Torres    │  Baja Prioridad         │  3 días   │
└───────────────────────────────────────────────────────────┘
```

**Pros:** Familiar (como email), rápido de escanear, ordenable
**Contras:** No muestra pipeline visual

#### B) Kanban Board

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ SUBMITTED   │ IN REVIEW   │ APPROVED    │ COMPLETED   │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ [PR-00145]  │ [PR-00143]  │ [PR-00140]  │ [PR-00135]  │
│ S/ 17,500   │ S/ 4,200    │ S/ 2,100    │ S/ 8,900    │
│             │             │             │             │
│ [PR-00144]  │             │ [PR-00141]  │ [PR-00136]  │
│ S/ 850      │             │ S/ 6,300    │ S/ 1,200    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Pros:** Visual, muestra pipeline completo
**Contras:** Menos eficiente para >20 items

#### C) Table with Filters (Enterprise Standard)

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 [Buscar]  📁[Todas] 🎯[Alta] 💰[>S/5000]  [Filtrar ▼]   │
├───┬──────────┬──────────────┬─────────┬──────────┬──────────┤
│ ▢ │ PR #     │ Solicitante  │ Monto   │ Prioridad│ Edad     │
├───┼──────────┼──────────────┼─────────┼──────────┼──────────┤
│ ▢ │ PR-00145 │ Juan Pérez   │ 17,500  │ 🔴 Alta  │ 2h       │
│ ▢ │ PR-00143 │ María García │ 4,200   │ 🟡 Media │ 1d       │
│ ▢ │ PR-00138 │ Luis Torres  │ 320     │ 🟢 Baja  │ 3d       │
└───┴──────────┴──────────────┴─────────┴──────────┴──────────┘
[Aprobar Seleccionados]  [Rechazar]  [Exportar]
```

**Pros:** Eficiente para volumen alto, bulk actions, exportable
**Contras:** Menos "friendly" que inbox

**Recomendación para ECOPLAZA:** **Inbox Style** (lista con cards)
- Volumen proyectado: <50 solicitudes/mes
- Team pequeño (no requiere bulk approvals masivas)
- UX más amigable para no-técnicos

---

### 6.3 Vista de Detalle de Solicitud

**Layout Recomendado:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Volver         PR-2026-00145         [PDF] [✉ Email]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATUS: 🟡 Pending Approval                                │
│  PRIORIDAD: 🔴 Alta                                         │
│                                                             │
│  ┌───────────────────┬───────────────────────────────────┐ │
│  │ Información Básica│ Detalles Financieros              │ │
│  ├───────────────────┼───────────────────────────────────┤ │
│  │ Solicitante:      │ Descripción:                      │ │
│  │ Juan Pérez        │ 5 Laptops Lenovo ThinkPad L15...  │ │
│  │                   │                                   │ │
│  │ Departamento:     │ Cantidad: 5                       │ │
│  │ Ventas            │ Precio Unit: S/ 3,500             │ │
│  │                   │ Total: S/ 17,500                  │ │
│  │ Categoría:        │                                   │ │
│  │ Technology/IT     │ Proveedor Sugerido:               │ │
│  │                   │ CompuTec SAC                      │ │
│  │ Fecha Requerida:  │                                   │ │
│  │ 15 Feb 2026       │                                   │ │
│  └───────────────────┴───────────────────────────────────┘ │
│                                                             │
│  📝 Justificación:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ El equipo de ventas actual tiene equipos con +4 años│   │
│  │ de antigüedad que no soportan el nuevo CRM...       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📎 Adjuntos (2):                                           │
│  [📄 cotizacion_computec.pdf] [📷 modelo_laptop.jpg]       │
│                                                             │
│  ──────────────────────────────────────────────────────    │
│                                                             │
│  📋 Timeline de Actividad                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● 13 Ene 10:30 - Creado por Juan Pérez              │   │
│  │ ● 13 Ene 10:32 - Enviado a aprobación               │   │
│  │ ● 13 Ene 10:32 - Asignado a Carlos Rodríguez (Mgr)  │   │
│  │ ● 13 Ene 12:15 - Visto por Carlos Rodríguez         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ──────────────────────────────────────────────────────    │
│                                                             │
│  💬 Comentarios Internos                                    │
│  [Agregar comentario...]                                    │
│                                                             │
│  ──────────────────────────────────────────────────────    │
│                                                             │
│  ⚠️  Esta solicitud requiere tu aprobación                  │
│                                                             │
│  [❌ Rechazar]          [✅ Aprobar]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Elementos Clave:**
1. **Status Badge visible** - Estado actual prominente
2. **Two-column layout** - Optimiza espacio en desktop
3. **Timeline de actividad** - Trazabilidad completa
4. **Comentarios internos** - Comunicación entre stakeholders
5. **CTAs prominentes** - Aprobar/Rechazar destacados

**Fuente:** [Jira Service Management - Approval Workflows](https://www.jirastrategy.com/approvals-in-jira-service-management/)

---

### 6.4 Indicadores Visuales de Estado

**Color Coding (Universal Standards):**

| Estado | Color | Badge | Semáforo |
|--------|-------|-------|----------|
| Draft | Gris (#6B7280) | `DRAFT` | ⚪ |
| Submitted | Azul (#3B82F6) | `SUBMITTED` | 🔵 |
| Pending Approval | Amarillo (#F59E0B) | `PENDING` | 🟡 |
| Approved | Verde (#10B981) | `APPROVED` | 🟢 |
| Rejected | Rojo (#EF4444) | `REJECTED` | 🔴 |
| Cancelled | Gris oscuro (#374151) | `CANCELLED` | ⚫ |

**Prioridad:**
- 🔴 **Alta/Urgent:** Rojo
- 🟡 **Media:** Amarillo
- 🟢 **Baja:** Verde

**Accesibilidad:** No usar solo color, combinar con:
- Iconos (✓, ✗, ⚠)
- Texto del estado
- Patrones de fondo (para daltónicos)

---

## 7. Flujo de Aprobación - Best Practices

### 7.1 Tipos de Approval Workflows

**Según análisis de Procurify, Spendflo, GEP (2026):**

#### A) Single Approver (Simplest)
```
Requester → Manager → Approved/Rejected
```
**Pros:** Rápido, simple
**Contras:** Falta de controles para montos altos
**Mejor para:** Empresas <20 personas, gastos <$1,000

#### B) Sequential Multi-Level (Most Common)
```
Requester → Manager → Director → CFO → Approved
```
**Pros:** Control jerárquico, responsabilidades claras
**Contras:** Lento (cada nivel espera al anterior)
**Mejor para:** Empresas 20-200 personas, aprobación formal

#### C) Parallel Approval (Fastest)
```
                   ┌→ Legal ──┐
Requester → Split ─┤→ Finance ├→ Merge → Approved
                   └→ IT ─────┘
```
**Pros:** Rápido (revisan simultáneamente)
**Contras:** Coordinación compleja si hay conflictos
**Mejor para:** Compras que afectan múltiples áreas

#### D) Threshold-Based (Recommended for ECOPLAZA)
```
< $500      → Auto-Approved
$500-$2,000 → Manager Approval
$2,000-$10K → Director Approval
> $10K      → CFO + Director Approval
```
**Pros:** Eficiente, controles proporcionales al riesgo
**Contras:** Requiere configuración de rangos
**Mejor para:** Cualquier empresa con presupuestos definidos

#### E) Category-Based (Advanced)
```
IT Equipment  → CTO Approval
Marketing     → CMO Approval
Legal         → Legal Counsel Approval
```
**Pros:** Expertise domain-specific
**Contras:** Requiere mantenimiento de categorías
**Mejor para:** Empresas con departamentos especializados

**Fuentes:**
- [Procurify - Purchase Approval Workflows Guide](https://www.procurify.com/blog/purchase-approval-workflows/)
- [Spendflo - Ultimate Guide to Purchase Requisition Approval](https://www.spendflo.com/blog/purchase-requisitions-approval-process)

---

### 7.2 Configuración Recomendada para ECOPLAZA

**Propuesta: Hybrid (Threshold + Category)**

**Reglas de Aprobación:**

| Monto | Categoría | Aprobadores | SLA |
|-------|-----------|-------------|-----|
| < S/ 500 | Cualquiera | Auto-Aprobado | Inmediato |
| S/ 500 - S/ 2,000 | Office Supplies | Manager del solicitante | 24h |
| S/ 500 - S/ 2,000 | IT/Marketing/Other | Manager + Jefe Área | 48h |
| S/ 2,000 - S/ 10,000 | Cualquiera | Manager + Director/Gerente | 72h |
| > S/ 10,000 | Cualquiera | Gerente General + CFO | 5 días |
| Emergency (cualquier monto) | Cualquiera | Gerente General (directo) | 4h |

**Configuración en Base de Datos:**

```sql
CREATE TABLE approval_rules (
  id UUID PRIMARY KEY,
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  category VARCHAR(50), -- NULL = all categories
  required_approvers JSONB, -- [{"role": "manager", "level": 1}, ...]
  approval_order ENUM('sequential', 'parallel'),
  sla_hours INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ejemplo de registro
INSERT INTO approval_rules VALUES (
  uuid_generate_v4(),
  2000.00,
  10000.00,
  NULL, -- aplica a todas las categorías
  '[{"role": "manager", "level": 1}, {"role": "director", "level": 2}]',
  'sequential',
  72,
  NOW()
);
```

---

### 7.3 Delegación de Aprobación

**Escenario:** Aprobador de vacaciones, enfermo, o no disponible.

**Soluciones Industry-Standard:**

#### A) Delegación Manual (User-Initiated)
```
User → Settings → "Delegate approvals to [User]" → Save
```
**Implementación:**
```sql
CREATE TABLE approval_delegations (
  id UUID PRIMARY KEY,
  from_user_id UUID REFERENCES usuarios(id),
  to_user_id UUID REFERENCES usuarios(id),
  start_date DATE,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  reason TEXT -- "Vacaciones", "Licencia médica"
);
```

#### B) Auto-Escalation (System-Initiated)
```
Si no hay respuesta en X horas → Escalar a Manager del Aprobador
```
**Implementación:**
```sql
CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY,
  role VARCHAR(50), -- "manager", "director"
  timeout_hours INT DEFAULT 24,
  escalate_to_role VARCHAR(50), -- "director", "cfo"
  notify_method ENUM('email', 'whatsapp', 'both')
);
```

**Ejemplo de Workflow con Escalation:**
1. PR enviada a Carlos (Manager) → Email + In-app notification
2. Después de 24h sin respuesta → Reminder email
3. Después de 48h sin respuesta → Escalate a Director (María)
4. María recibe: "Carlos no ha respondido PR-00145 en 48h, requiere tu aprobación"

**Fuentes:**
- [SAP - Escalation Period for Approval Requests](https://help.sap.com/docs/buying-invoicing/approval-process-management-guide/escalation-period-for-approval-requests)
- [Cflow - Automated Escalation Rules](https://www.cflowapps.com/how-automated-escalation-rules-reduce-approval-bottlenecks/)

---

### 7.4 Approval por Monto - Configuración Dinámica

**Recomendación:** Hacer los rangos configurables por proyecto (no hardcoded)

**Tabla de Config:**

```sql
CREATE TABLE proyecto_approval_config (
  id UUID PRIMARY KEY,
  proyecto_id UUID REFERENCES proyectos(id),
  -- Thresholds
  auto_approve_max DECIMAL(10,2) DEFAULT 500.00,
  manager_approval_max DECIMAL(10,2) DEFAULT 2000.00,
  director_approval_max DECIMAL(10,2) DEFAULT 10000.00,
  -- SLAs
  manager_sla_hours INT DEFAULT 24,
  director_sla_hours INT DEFAULT 72,
  cfo_sla_hours INT DEFAULT 120,
  -- Configuración
  enable_auto_escalation BOOLEAN DEFAULT true,
  escalation_timeout_hours INT DEFAULT 48,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Beneficio:** Cada proyecto de ECOPLAZA puede tener sus propios límites (Proyecto Callao vs San Gabriel vs Corporativo)

---

## 8. Sistema de Notificaciones - Best Practices

### 8.1 Eventos que Disparan Notificaciones

**Matriz de Notificaciones (Recommended):**

| Evento | Destinatario | Email | In-App | WhatsApp | Prioridad |
|--------|--------------|-------|--------|----------|-----------|
| **PR Creada** | Creador | ✅ Confirmación | ✅ | ❌ | Low |
| **PR Enviada a Aprobación** | Aprobador | ✅ Acción requerida | ✅ | ⚠️ Si >$10K | High |
| **PR Aprobada** | Creador | ✅ | ✅ | ❌ | Medium |
| **PR Rechazada** | Creador | ✅ Con razón | ✅ | ❌ | High |
| **PR Comentario Nuevo** | Involucrados | ✅ | ✅ | ❌ | Low |
| **Recordatorio (24h sin acción)** | Aprobador | ✅ Reminder | ✅ Badge | ❌ | Medium |
| **Escalation (48h sin acción)** | Manager del Aprobador | ✅ Urgente | ✅ | ✅ | Critical |
| **PR Cancelada** | Aprobador + Creador | ✅ | ✅ | ❌ | Low |

### 8.2 Templates de Email (Best Practices)

**Según análisis de Omnisend, Spotler (2026):**

#### Template: PR Enviada a Aprobación

```html
Subject: [Acción Requerida] Nueva Solicitud de Compra - S/ 17,500

Hola Carlos,

Juan Pérez ha enviado una nueva solicitud de compra que requiere tu aprobación.

┌───────────────────────────────────────────┐
│ PR-2026-00145                             │
│ Laptops para Equipo de Ventas            │
│                                           │
│ Monto Total: S/ 17,500.00                 │
│ Prioridad: 🔴 Alta                        │
│ Requerido para: 15 Feb 2026              │
└───────────────────────────────────────────┘

Descripción:
5 Laptops Lenovo ThinkPad L15 Gen 4 para nuevos vendedores.

Justificación:
El equipo actual tiene +4 años y no soporta el nuevo CRM.

[Ver Detalles] [Aprobar] [Rechazar]

⏱ Por favor responde dentro de 48 horas.
Si no estás disponible, puedes delegar en: [Configurar Delegación]

---
EcoPlaza Command Center
Este es un email automático, no responder.
```

**Elementos Clave:**
1. ✅ **Subject claro con [Acción Requerida]**
2. ✅ **Resumen visual (box con datos key)**
3. ✅ **CTAs prominentes** (botones, no solo links)
4. ✅ **Deadline explícito** (48 horas)
5. ✅ **Opción de delegación** (reduce bottlenecks)

#### Template: Recordatorio (24h sin acción)

```html
Subject: ⏰ Recordatorio: Solicitud PR-2026-00145 pendiente de aprobación

Hola Carlos,

Te recordamos que tienes una solicitud de compra pendiente de aprobación hace 24 horas.

PR-2026-00145: Laptops para Equipo de Ventas
Monto: S/ 17,500.00
Solicitante: Juan Pérez

[Aprobar Ahora] [Ver Detalles]

⚠️ Esta solicitud será escalada a tu manager si no hay respuesta en 24h adicionales.

---
```

**Frecuencia de Reminders:**
- 1er reminder: +24h
- 2do reminder: +48h
- Escalation: +72h

**NO enviar más de 1 reminder por día** (evitar spam)

**Fuentes:**
- [Omnisend - 25 Order Confirmation Email Templates 2026](https://www.omnisend.com/blog/order-confirmation-email-automation-conversions/)
- [Reteno - 14 Push Notification Best Practices 2026](https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026)

---

### 8.3 Notificaciones In-App (Dashboard)

**Diseño Recomendado:**

```
┌────────────────────────────────────────────┐
│  [🔔 3]  ← Bell icon con badge              │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│  Notificaciones                              │
├──────────────────────────────────────────────┤
│ ● Nueva solicitud de aprobación              │
│   PR-2026-00145: Laptops Equipo Ventas       │
│   S/ 17,500 - Hace 2 horas                   │
│   [Ver] [Aprobar]                            │
├──────────────────────────────────────────────┤
│ ○ Tu solicitud PR-2026-00140 fue aprobada    │
│   Hace 1 día                                 │
│   [Ver Detalles]                             │
├──────────────────────────────────────────────┤
│ ○ Nuevo comentario en PR-2026-00138          │
│   Hace 3 días                                │
└──────────────────────────────────────────────┘
[Marcar todas como leídas]
```

**Features:**
- Badge con número de no leídas
- Punto azul (●) para no leídas, gris (○) para leídas
- Quick actions (Aprobar sin abrir detalle)
- Timestamp relativo ("Hace 2 horas")
- Max 10 notificaciones recientes (más antiguas en página dedicada)

**Persistencia:**
```sql
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id),
  tipo ENUM('pr_created', 'pr_approved', 'pr_rejected', 'pr_comment', 'reminder', 'escalation'),
  titulo TEXT,
  mensaje TEXT,
  link_to VARCHAR(255), -- URL del detalle
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 8.4 WhatsApp Notifications (Opcional, High-Value)

**Cuándo Usar WhatsApp:**
- Solicitudes >$10,000
- Escalations críticas (no ha respondido en 48h)
- Emergency PRs

**Template Example (via n8n):**

```
🔔 *EcoPlaza - Acción Urgente*

Hola Carlos, tienes una solicitud de compra urgente:

📋 *PR-2026-00145*
💰 Monto: S/ 17,500
👤 Solicitante: Juan Pérez
⏱ Requerido: 15 Feb 2026

🔴 Prioridad: ALTA

Ver detalles y aprobar:
https://dashboard.ecoplaza.com/pr/00145

⚠️ Por favor responder en 48h
```

**Implementación:**
- n8n workflow: "Send WhatsApp on PR Creation if Amount > 10000"
- Usar API de WATI (que ya tiene ECOPLAZA)
- Validar que usuario tiene WhatsApp configurado

**Restricción:** No enviar más de 2 WhatsApp por solicitud (evitar spam)

---

## 9. Reportes y Analytics - Métricas Clave

### 9.1 KPIs Esenciales para Purchase Requisitions

**Según análisis de Ivalua, Databox, Happay (2026):**

| Métrica | Descripción | Fórmula | Benchmark |
|---------|-------------|---------|-----------|
| **PR Cycle Time** | Tiempo desde creación hasta aprobación | AVG(approved_at - created_at) | <3 días |
| **Approval Rate** | % de PRs aprobadas vs rechazadas | (Approved / Total) * 100 | >80% |
| **First-Pass Yield** | % de PRs aprobadas sin revisiones | (Approved 1st time / Total) * 100 | >70% |
| **Time to Approval by Amount** | Cycle time segmentado por rango | AVG per threshold | Monitorear tendencias |
| **Approver Response Time** | Tiempo desde asignación hasta acción | AVG(action_taken_at - assigned_at) | <24h |
| **Escalation Rate** | % de PRs escaladas por timeout | (Escalated / Total) * 100 | <10% |
| **Average PR Value** | Monto promedio de solicitudes | AVG(total_amount) | Varía por empresa |
| **PRs by Category** | Distribución por tipo de compra | COUNT GROUP BY category | - |
| **Top Requesters** | Quién solicita más | COUNT GROUP BY requester | - |
| **Rejection Reasons** | Por qué se rechazan | COUNT GROUP BY reason | Insights |

### 9.2 Dashboard Recomendado (Executive View)

```
┌───────────────────────────────────────────────────────────────┐
│  Purchase Requisitions - Dashboard Ejecutivo                  │
│  Período: Último Mes (Dic 2025 - Ene 2026)                   │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Total PRs   │  │ Aprobadas   │  │ Pendientes  │          │
│  │     42      │  │   35 (83%)  │  │    5 (12%)  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Rechazadas  │  │ Cycle Time  │  │ Monto Total │          │
│  │   2 (5%)    │  │   2.3 días  │  │  S/ 145K    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
│  ──────────────────────────────────────────────────────      │
│                                                               │
│  📊 PRs por Categoría (Último Mes)                           │
│  ┌───────────────────────────────────────────────────┐       │
│  │ IT/Technology     ████████████ 15 (36%)           │       │
│  │ Office Supplies   ███████ 10 (24%)                │       │
│  │ Marketing         █████ 8 (19%)                   │       │
│  │ Services          ████ 6 (14%)                    │       │
│  │ Facilities        ██ 3 (7%)                       │       │
│  └───────────────────────────────────────────────────┘       │
│                                                               │
│  📈 Tendencia de Cycle Time (Últimos 6 meses)                │
│  ┌───────────────────────────────────────────────────┐       │
│  │ 5d │                                               │       │
│  │ 4d │    ●                                          │       │
│  │ 3d │ ●     ●     ●                                 │       │
│  │ 2d │          ●     ●     ●   ← Mejorando         │       │
│  │ 1d │                                               │       │
│  │    └─────────────────────────────────────────     │       │
│  │     Ago  Sep  Oct  Nov  Dic  Ene                  │       │
│  └───────────────────────────────────────────────────┘       │
│                                                               │
│  ⚠️  Alertas y Observaciones                                  │
│  • 2 PRs escaladas este mes (vs 0 el mes anterior)           │
│  • Categoría IT tiene el cycle time más alto (4.2 días)      │
│  • 5 PRs pendientes hace >3 días (requieren follow-up)       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 9.3 Queries SQL para Métricas

**PR Cycle Time (promedio últimos 30 días):**

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600) as avg_hours,
  AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 86400) as avg_days
FROM purchase_requisitions
WHERE
  status = 'approved'
  AND created_at >= NOW() - INTERVAL '30 days';
```

**Approval Rate:**

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE status = 'approved')::numeric / COUNT(*) * 100, 2) as approval_rate
FROM purchase_requisitions
WHERE created_at >= NOW() - INTERVAL '30 days';
```

**PRs by Category:**

```sql
SELECT
  category,
  COUNT(*) as count,
  SUM(total_amount) as total_value,
  AVG(total_amount) as avg_value
FROM purchase_requisitions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY category
ORDER BY count DESC;
```

**Top 5 Requesters:**

```sql
SELECT
  u.nombre_completo,
  COUNT(*) as total_prs,
  SUM(pr.total_amount) as total_requested,
  AVG(pr.total_amount) as avg_pr_value
FROM purchase_requisitions pr
JOIN usuarios u ON pr.requester_id = u.id
WHERE pr.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.nombre_completo
ORDER BY total_prs DESC
LIMIT 5;
```

**Fuentes:**
- [Ivalua - Procurement Dashboard KPIs](https://www.ivalua.com/blog/procurement-dashboard/)
- [Databox - Procurement KPI Dashboard](https://databox.com/procurement-kpi-dashboard)
- [Happay - Top Procurement KPIs 2026](https://happay.com/blog/procurement-kpis/)

---

## 10. Schema de Base de Datos Recomendado

### 10.1 Tabla Principal: purchase_requisitions

```sql
CREATE TABLE purchase_requisitions (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_number VARCHAR(20) UNIQUE NOT NULL, -- PR-2026-00001
  proyecto_id UUID REFERENCES proyectos(id),

  -- Información del Solicitante
  requester_id UUID REFERENCES usuarios(id) NOT NULL,
  department VARCHAR(100),

  -- Información Básica
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- IT, Office, Marketing, etc
  tipo VARCHAR(20) DEFAULT 'standard', -- standard, blanket, emergency, services
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent

  -- Detalles Financieros
  item_description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PEN',

  -- Información Adicional
  justification TEXT NOT NULL,
  required_by_date DATE NOT NULL,
  preferred_vendor VARCHAR(255),
  cost_center VARCHAR(50),
  budget_code VARCHAR(50),
  delivery_address TEXT,
  notes TEXT,

  -- Estado y Workflow
  status VARCHAR(30) DEFAULT 'draft', -- draft, submitted, pending_approval, approved, rejected, cancelled, completed
  current_approver_id UUID REFERENCES usuarios(id),

  -- Adjuntos
  attachments JSONB, -- [{url, filename, size, type}]

  -- Timestamps de Workflow
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES usuarios(id),
  rejected_at TIMESTAMP,
  rejected_by UUID REFERENCES usuarios(id),
  rejection_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by UUID REFERENCES usuarios(id),
  completed_at TIMESTAMP,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para Performance
CREATE INDEX idx_pr_status ON purchase_requisitions(status);
CREATE INDEX idx_pr_requester ON purchase_requisitions(requester_id);
CREATE INDEX idx_pr_approver ON purchase_requisitions(current_approver_id);
CREATE INDEX idx_pr_proyecto ON purchase_requisitions(proyecto_id);
CREATE INDEX idx_pr_created_at ON purchase_requisitions(created_at DESC);
CREATE INDEX idx_pr_number ON purchase_requisitions(pr_number);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_pr_updated_at
BEFORE UPDATE ON purchase_requisitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 10.2 Tabla: pr_approval_history (Trazabilidad)

```sql
CREATE TABLE pr_approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id UUID REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES usuarios(id),
  action VARCHAR(20) NOT NULL, -- submitted, approved, rejected, escalated, recalled
  previous_status VARCHAR(30),
  new_status VARCHAR(30),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pr_history_pr ON pr_approval_history(pr_id);
CREATE INDEX idx_pr_history_approver ON pr_approval_history(approver_id);
CREATE INDEX idx_pr_history_created_at ON pr_approval_history(created_at DESC);
```

### 10.3 Tabla: pr_comments (Comentarios Internos)

```sql
CREATE TABLE pr_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id UUID REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES usuarios(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true, -- true = solo equipo, false = visible para requester
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pr_comments_pr ON pr_comments(pr_id);
CREATE INDEX idx_pr_comments_created_at ON pr_comments(created_at DESC);
```

### 10.4 Tabla: approval_rules (Configuración de Aprobación)

```sql
CREATE TABLE approval_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proyecto_id UUID REFERENCES proyectos(id), -- NULL = regla global
  name VARCHAR(100), -- "Low Value Auto-Approve", "High Value Multi-Level"

  -- Condiciones
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  category VARCHAR(50), -- NULL = todas las categorías
  priority VARCHAR(20), -- NULL = todas las prioridades

  -- Aprobadores
  required_approvers JSONB NOT NULL,
  -- Ejemplo: [
  --   {"role": "manager", "level": 1, "mode": "sequential"},
  --   {"role": "director", "level": 2, "mode": "sequential"}
  -- ]
  approval_order VARCHAR(20) DEFAULT 'sequential', -- sequential, parallel

  -- SLA
  sla_hours INT DEFAULT 48,
  enable_escalation BOOLEAN DEFAULT true,
  escalation_timeout_hours INT DEFAULT 24,
  escalate_to_role VARCHAR(50),

  -- Metadata
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_approval_rules_proyecto ON approval_rules(proyecto_id);
CREATE INDEX idx_approval_rules_active ON approval_rules(active);
```

**Ejemplo de Registro:**

```sql
INSERT INTO approval_rules (name, min_amount, max_amount, required_approvers, sla_hours)
VALUES (
  'Mid-Range Approval',
  500.00,
  2000.00,
  '[{"role": "manager", "level": 1}]',
  24
);
```

### 10.5 Tabla: approval_delegations (Delegación de Aprobación)

```sql
CREATE TABLE approval_delegations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES usuarios(id) NOT NULL,
  to_user_id UUID REFERENCES usuarios(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_delegations_from ON approval_delegations(from_user_id, active);
CREATE INDEX idx_delegations_dates ON approval_delegations(start_date, end_date);

-- Constraint: No puede delegarse a sí mismo
ALTER TABLE approval_delegations
ADD CONSTRAINT chk_delegation_different_users
CHECK (from_user_id != to_user_id);
```

### 10.6 Row Level Security (RLS) Policies

```sql
-- Habilitar RLS
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Creador puede ver sus propias PRs
CREATE POLICY "Users can view their own PRs"
ON purchase_requisitions FOR SELECT
USING (auth.uid() = requester_id);

-- Policy 2: Aprobador puede ver PRs asignadas a él
CREATE POLICY "Approvers can view assigned PRs"
ON purchase_requisitions FOR SELECT
USING (auth.uid() = current_approver_id);

-- Policy 3: Admin/Gerencia puede ver todas las PRs
CREATE POLICY "Admins can view all PRs"
ON purchase_requisitions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND role IN ('admin', 'gerencia', 'finanzas')
  )
);

-- Policy 4: Solo el creador puede crear PRs
CREATE POLICY "Users can create PRs"
ON purchase_requisitions FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Policy 5: Solo aprobador puede actualizar status a approved/rejected
CREATE POLICY "Approvers can update status"
ON purchase_requisitions FOR UPDATE
USING (auth.uid() = current_approver_id)
WITH CHECK (auth.uid() = current_approver_id);
```

---

## 11. Prioridad y Urgencia - Best Practices

### 11.1 Clasificación de Prioridad (SAP Standard)

Según documentación de SAP S/4HANA:

| Nivel | Nombre | Descripción | SLA Sugerido | Uso |
|-------|--------|-------------|--------------|-----|
| 1 | **Urgent** | Crítico, detiene operaciones | 4 horas | <5% de PRs |
| 2 | **High** | Importante, impacta proyecto | 24 horas | 15-20% |
| 3 | **Medium** | Normal, planificado | 48 horas | 60-70% |
| 4 | **Low** | No urgente, nice-to-have | 5 días | 10-15% |

**Cálculo Automático de Prioridad:**

```javascript
function calculatePriority(pr) {
  // Regla 1: Emergency type = Urgent
  if (pr.tipo === 'emergency') return 'urgent';

  // Regla 2: Required within 7 days = High
  const daysUntilRequired = daysBetween(today, pr.required_by_date);
  if (daysUntilRequired <= 7) return 'high';

  // Regla 3: High amount (>$10K) = High
  if (pr.total_amount > 10000) return 'high';

  // Regla 4: Default = Medium
  return 'medium';
}
```

**Fuente:** [SAP - Requirement Prioritization](https://blogs.sap.com/2013/11/23/requirement-prioritization-in-sap-materials-management/)

---

## 12. Adjuntos - Límites y Best Practices

### 12.1 Límites Recomendados (2026)

Según análisis de límites de email providers y enterprise systems:

| Aspecto | Límite Recomendado | Justificación |
|---------|-------------------|---------------|
| **Max archivos por PR** | 5 archivos | Balance entre utilidad y performance |
| **Max tamaño por archivo** | 10 MB | Compatible con mayoría de email providers |
| **Max tamaño total** | 25 MB | Límite de Gmail/Outlook |
| **Tipos permitidos** | PDF, JPG, PNG, DOCX, XLSX | Seguridad (evitar .exe, .zip sospechosos) |

### 12.2 Implementación Técnica

**Storage: Supabase Storage**

```typescript
// Upload file to Supabase Storage
async function uploadPRAttachment(file: File, prId: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${prId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('purchase-requisitions')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('purchase-requisitions')
    .getPublicUrl(fileName);

  return {
    url: urlData.publicUrl,
    filename: file.name,
    size: file.size,
    type: file.type
  };
}
```

**Validación Client-Side:**

```typescript
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Archivo demasiado grande (máx 10MB)' };
  }

  // Check file type
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido' };
  }

  return { valid: true };
}
```

**Fuentes:**
- [Email File Size Limits 2026](https://growthlist.co/email-sending-limits-of-various-email-service-providers/)
- [SMTP2GO - File Size Best Practices](https://www.smtp2go.com/blog/the-goldilocks-theory-of-email-file-sizes/)

---

## 13. Casos de Estudio y Referencias

### 13.1 Caso: University of North Carolina (UNC)

**Sistema:** Purchase Requisition Module (ERP)

**Flujo:**
1. Faculty/Staff crea PR con checklist de adjuntos requeridos
2. Validación automática de presupuesto disponible
3. Approval routing basado en department y amount
4. Procurement Office convierte a PO
5. Vendor recibe PO automáticamente via email

**Checklist de Adjuntos UNC:**
- Cotización del vendor (requerido si >$5,000)
- Justificación escrita (requerido siempre)
- Formulario de sole source (si proveedor único)
- W-9 form (si vendor nuevo)

**Lección para ECOPLAZA:** Checklist de adjuntos según monto/tipo evita rechazos posteriores

**Fuente:** [UNC - Purchase Requisition Attachments Checklist](https://finance.unc.edu/services/purchase-requisitions-processing/purchase-requisition-attachments-checklist/)

---

### 13.2 Caso: ServiceNow Implementation en Enterprise (500+ employees)

**Problema:** Proceso manual de PRs tomaba 7-10 días, 40% de rechazos por información incompleta

**Solución:**
1. Implementaron Service Catalog con ítems pre-configurados
2. Forms con campos condicionales (solo mostrar campos relevantes según categoría)
3. Validación de presupuesto en tiempo real (integración con ERP)
4. Approval automática para <$500
5. Mobile app para aprobadores

**Resultados:**
- ✅ Cycle time: 7 días → 2 días (71% reducción)
- ✅ Rejection rate: 40% → 12%
- ✅ Approver satisfaction: +35%
- ✅ 80% de aprobaciones desde mobile

**Lección para ECOPLAZA:** Mobile approvals y validación temprana son críticos

**Fuente:** [ServiceNow - CIO Article](https://www.cio.com/article/350358/servicenow-targets-procurement-workflow-automation.html)

---

### 13.3 Caso: Construcción - Stampli (Accounts Payable)

**Contexto:** Empresa de construcción con 200+ empleados, múltiples proyectos simultáneos

**Desafíos:**
- Field workers necesitaban materiales urgentes
- Aprobaciones lentas causaban delays en obra
- Sin visibilidad de gasto por proyecto

**Solución:**
1. Emergency PR category con fast-track approval (4h SLA)
2. Project-specific budget tracking
3. WhatsApp notifications para aprobadores en campo
4. Pre-approved vendor list para materiales comunes

**Resultados:**
- Emergency PRs: aprobadas en promedio 2.5 horas
- Visibility: 100% de gasto rastreable por proyecto
- Compliance: 0 compras no autorizadas

**Lección para ECOPLAZA:** Emergency category + mobile-first es crítico para operaciones

**Fuente:** [Stampli - Construction Requisitions Best Practices](https://www.stampli.com/blog/accounts-payable/requisition-in-construction/)

---

## 14. Implementación Recomendada para ECOPLAZA

### 14.1 Fase 1: MVP (2 semanas)

**Alcance Mínimo:**

✅ **Formulario de Creación (Single Page con Accordions)**
- Campos obligatorios: título, categoría, descripción, cantidad, precio, justificación, fecha requerida
- Upload de adjuntos (max 5, 10MB c/u)
- Auto-save como draft
- Submit button

✅ **Workflow Básico**
- Estados: Draft → Submitted → Pending Approval → Approved/Rejected
- Asignación manual de aprobador (dropdown)
- Email notification al aprobador

✅ **Bandeja de Aprobación (Inbox Style)**
- Lista de PRs pendientes
- Vista detalle con botones Aprobar/Rechazar
- Comentarios al rechazar

✅ **Dashboard Básico**
- Total PRs por estado
- Mis solicitudes (requester view)
- Pendientes de mi aprobación (approver view)

**No incluir en MVP:**
- ❌ Approval rules automáticas (hardcodear por ahora)
- ❌ Delegación
- ❌ Escalation automática
- ❌ Métricas avanzadas
- ❌ WhatsApp notifications

---

### 14.2 Fase 2: Automation (2 semanas)

✅ **Approval Rules Engine**
- Tabla `approval_rules`
- Auto-asignación de aprobador según monto/categoría
- Threshold-based routing

✅ **Notificaciones Mejoradas**
- Email templates profesionales
- In-app notifications con badge
- Reminders automáticos (24h)

✅ **Timeline de Actividad**
- Historial completo de acciones
- Audit trail

---

### 14.3 Fase 3: Advanced Features (2 semanas)

✅ **Delegación de Aprobación**
- Interface para configurar delegación
- Auto-routing si delegación activa

✅ **Escalation Automática**
- Configuración de timeouts
- Escalate to next level si no hay respuesta

✅ **Métricas y Reportes**
- Dashboard con KPIs (cycle time, approval rate)
- Reportes por categoría, requester, período

✅ **WhatsApp Notifications (High-Value)**
- Integración con n8n + WATI
- Solo para PRs >$10K y escalations

---

### 14.4 Stack Tecnológico Recomendado

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Frontend** | Next.js 15 + Tailwind | Ya usan en Command Center |
| **Backend** | Supabase (PostgreSQL + RLS) | Consistencia con sistema actual |
| **Storage** | Supabase Storage | Para adjuntos |
| **Email** | Resend / SendGrid | Templates profesionales |
| **Notifications** | Supabase Realtime | In-app real-time |
| **WhatsApp** | n8n + WATI | Ya integrado en ECOPLAZA |
| **State Machine** | Custom TypeScript | Control total |

---

## 15. Checklist de Implementación

### ✅ Antes de Empezar

- [ ] Definir approval rules específicas de ECOPLAZA (montos, roles)
- [ ] Identificar categorías de compra (IT, Marketing, Facilities, etc.)
- [ ] Mapear roles existentes a aprobadores (admin, gerencia, jefes)
- [ ] Decidir: ¿Requiere WhatsApp notifications?
- [ ] Decidir: ¿Scope multi-proyecto o solo proyecto activo?

### ✅ Durante Desarrollo

- [ ] Crear tablas: `purchase_requisitions`, `pr_approval_history`, `pr_comments`, `approval_rules`
- [ ] Implementar RLS policies (security-first)
- [ ] Componente: `CreatePRForm.tsx` (con validación Zod)
- [ ] Componente: `PRInboxList.tsx` (bandeja aprobación)
- [ ] Componente: `PRDetailView.tsx` (vista detalle + timeline)
- [ ] Server Actions: `createPR`, `submitPR`, `approvePR`, `rejectPR`
- [ ] Email templates: PR Created, PR Submitted, PR Approved, PR Rejected
- [ ] In-app notifications system
- [ ] Dashboard: métricas básicas

### ✅ Testing

- [ ] Test flujo completo: Create → Submit → Approve
- [ ] Test flujo rechazo: Create → Submit → Reject → Edit → Resubmit
- [ ] Test notificaciones: Email + In-app
- [ ] Test adjuntos: Upload, visualización, límites
- [ ] Test RLS: Usuarios solo ven sus PRs o las asignadas
- [ ] Test approval rules: Routing correcto según monto/categoría
- [ ] Load testing: ¿Performance con 100+ PRs?

### ✅ Deployment

- [ ] Migración SQL ejecutada en Supabase
- [ ] Bucket `purchase-requisitions` creado en Storage
- [ ] Environment variables configuradas (SMTP, etc.)
- [ ] Documentación para usuarios (cómo crear PR, cómo aprobar)
- [ ] Training session con admin/finanzas
- [ ] Monitoreo post-deploy: cycle time, errores

---

## 16. Recursos y Fuentes

### Documentación Oficial

1. **SAP S/4HANA Procurement**
   [SAP Help Portal - Purchase Requisitions](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/af9ef57f504840d2b81be8667206d485/ab7db65334e6b54ce10000000a174cb4.html)

2. **Oracle NetSuite**
   [NetSuite - Requisition Approval Workflow](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_3960249592.html)

3. **ServiceNow**
   [ServiceNow - Purchase Requisitions](https://www.servicenow.com/docs/bundle/yokohama-source-to-pay-operations/page/product/sourcing-procurement-operations/reference/purchase-requisition.html)

4. **Jira Service Management (Atlassian)**
   [Jira - What are Approvals?](https://support.atlassian.com/jira-service-management-cloud/docs/what-are-approvals/)

5. **Monday.com**
   [Monday.com - Project Requests Template](https://monday.com/templates/template/122936/project-requests-and-approvals)

### Guías y Best Practices (2026)

6. **Kissflow - Definitive Guide to Purchase Requisition 2026**
   [https://kissflow.com/procurement/purchase-requisition/purchase-requisition-guide/](https://kissflow.com/procurement/purchase-requisition/purchase-requisition-guide/)

7. **Spendflo - Ultimate Guide to Purchase Requisition Approval Process**
   [https://www.spendflo.com/blog/purchase-requisitions-approval-process](https://www.spendflo.com/blog/purchase-requisitions-approval-process)

8. **Procurify - Purchase Approval Workflows Guide**
   [https://www.procurify.com/blog/purchase-approval-workflows/](https://www.procurify.com/blog/purchase-approval-workflows/)

9. **GEP - Purchase Order Approval Process Guide 2026**
   [https://www.gep.com/blog/strategy/purchase-order-approval-process-guide](https://www.gep.com/blog/strategy/purchase-order-approval-process-guide)

10. **Microsoft Learn - Dynamics 365 Purchase Requisition Workflow**
    [https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-requisitions-workflow](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-requisitions-workflow)

### UX/UI Design Patterns

11. **Nielsen Norman Group - Marking Required Fields**
    [https://www.nngroup.com/articles/required-fields/](https://www.nngroup.com/articles/required-fields/)

12. **Design Studio UIUX - 12 Form UX Best Practices 2026**
    [https://www.designstudiouiux.com/blog/form-ux-design-best-practices/](https://www.designstudiouiux.com/blog/form-ux-design-best-practices/)

13. **Eleken - 32 Stepper UI Examples**
    [https://www.eleken.co/blog-posts/stepper-ui-examples](https://www.eleken.co/blog-posts/stepper-ui-examples)

### Notification Best Practices

14. **Omnisend - 25 Order Confirmation Email Templates 2026**
    [https://www.omnisend.com/blog/order-confirmation-email-automation-conversions/](https://www.omnisend.com/blog/order-confirmation-email-automation-conversions/)

15. **Reteno - 14 Push Notification Best Practices 2026**
    [https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026](https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026)

### Metrics & Analytics

16. **Ivalua - Procurement Dashboard KPIs**
    [https://www.ivalua.com/blog/procurement-dashboard/](https://www.ivalua.com/blog/procurement-dashboard/)

17. **Databox - Procurement KPI Dashboard**
    [https://databox.com/procurement-kpi-dashboard](https://databox.com/procurement-kpi-dashboard)

18. **Happay - Top Procurement KPIs to Track 2026**
    [https://happay.com/blog/procurement-kpis/](https://happay.com/blog/procurement-kpis/)

### Case Studies & Implementation

19. **UNC Finance - Purchase Requisition Attachments Checklist**
    [https://finance.unc.edu/services/purchase-requisitions-processing/purchase-requisition-attachments-checklist/](https://finance.unc.edu/services/purchase-requisitions-processing/purchase-requisition-attachments-checklist/)

20. **Stampli - 5 Best Practices for Construction Purchase Requisitions**
    [https://www.stampli.com/blog/accounts-payable/requisition-in-construction/](https://www.stampli.com/blog/accounts-payable/requisition-in-construction/)

21. **Cflow - How Automated Escalation Rules Reduce Bottlenecks**
    [https://www.cflowapps.com/how-automated-escalation-rules-reduce-approval-bottlenecks/](https://www.cflowapps.com/how-automated-escalation-rules-reduce-approval-bottlenecks/)

### Technical References

22. **SAP Community - Requirement Prioritization**
    [https://blogs.sap.com/2013/11/23/requirement-prioritization-in-sap-materials-management/](https://blogs.sap.com/2013/11/23/requirement-prioritization-in-sap-materials-management/)

23. **SAP Help - Escalation Period for Approvals**
    [https://help.sap.com/docs/buying-invoicing/approval-process-management-guide/escalation-period-for-approval-requests](https://help.sap.com/docs/buying-invoicing/approval-process-management-guide/escalation-period-for-approval-requests)

24. **Symfony - Workflows and State Machines**
    [https://symfony.com/doc/current/workflow/workflow-and-state-machine.html](https://symfony.com/doc/current/workflow/workflow-and-state-machine.html)

---

## 17. Conclusiones y Recomendaciones Finales

### Para ECOPLAZA

**1. Terminología:** Usar **"Purchase Requisition"** en backend, **"Solicitud de Compra"** en UI español.

**2. Workflow:** Implementar **Threshold-Based Approval** con 4 niveles:
   - <S/ 500: Auto-aprobado
   - S/ 500-2,000: Manager
   - S/ 2,000-10,000: Director
   - >S/ 10,000: Gerente General + CFO

**3. UX:** Single-page form con accordions (secciones colapsables), no wizard multi-step.

**4. Aprobación:** Inbox-style list para aprobadores, no Kanban (volumen proyectado <50 PRs/mes).

**5. Notificaciones:** Email + In-app (must-have), WhatsApp solo para >S/ 10,000 (nice-to-have).

**6. Métricas:** Trackear **Cycle Time**, **Approval Rate**, **First-Pass Yield** desde el inicio.

**7. Mobile:** Approvals deben funcionar en mobile (responsive design crítico).

**8. Escalation:** Implementar en Fase 2, no MVP (auto-escalate después de 48h sin respuesta).

**9. Storage:** Supabase Storage para adjuntos, límite 5 archivos × 10MB = 50MB total.

**10. Security:** RLS policies desde el inicio (usuarios solo ven sus PRs o las asignadas).

### Pasos Inmediatos

1. ✅ **Revisar este documento** con equipo técnico y stakeholders
2. ✅ **Definir approval rules específicas** (montos, roles, SLAs)
3. ✅ **Mapear categorías de compra** de ECOPLAZA (IT, Marketing, Facilities, etc.)
4. ✅ **Aprobar diseño de formulario** (mockups de UI)
5. ✅ **Iniciar Fase 1 (MVP)** - 2 semanas de desarrollo

### ROI Esperado

Basado en casos de estudio similares:

- **Reducción de cycle time:** 7-10 días → 2-3 días (60-70%)
- **Reducción de rechazos:** 30-40% → 10-15% (validación temprana)
- **Tiempo de aprobadores:** -50% (mobile + automation)
- **Trazabilidad:** 0% → 100% (audit trail completo)
- **Visibilidad de gasto:** +100% (dashboard en tiempo real)

---

**Documento generado:** 13 Enero 2026
**Versión:** 1.0
**Próxima revisión:** Post-implementación Fase 1 (estimado: Febrero 2026)

---

*Este documento refleja las mejores prácticas de la industria en 2026 según análisis de SAP, Oracle, ServiceNow, Jira Service Management, Monday.com, y más de 20 fuentes de consultoras líderes (Procurify, Spendflo, GEP, Ivalua, Cflow). Todas las recomendaciones están respaldadas por casos de estudio reales y documentación oficial.*
