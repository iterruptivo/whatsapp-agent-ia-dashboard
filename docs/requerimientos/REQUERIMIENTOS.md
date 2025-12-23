# REQUERIMIENTOS - EcoPlaza Dashboard

> Documento de requerimientos extraido del proyecto existente.

---

## 1. CONTEXTO DEL PROYECTO

### Cliente
**EcoPlaza** - Empresa inmobiliaria que vende locales comerciales en Peru.

### Problema a Resolver
Gestionar leads capturados por un chatbot de WhatsApp (Victoria) y hacer seguimiento del proceso de venta de locales comerciales.

### Objetivo Principal
Dashboard web para que el equipo de ventas gestione leads, locales, y todo el ciclo de venta hasta el cierre.

---

## 2. USUARIOS Y ROLES

### Roles del Sistema

| Rol | Descripcion | Acceso Principal |
|-----|-------------|-----------------|
| **admin** | Gerencia, acceso total | Todo el sistema |
| **jefe_ventas** | Supervision del equipo | Operativo, Locales, Control Pagos |
| **vendedor** | Vendedor de campo | Operativo (sus leads) |
| **vendedor_caseta** | Vendedor en caseta | Operativo, Locales |
| **coordinador** | Coordinador de ventas | Locales |
| **finanzas** | Control de pagos | Solo Control Pagos |
| **marketing** | Equipo de marketing | Insights, Operativo |

---

## 3. MODULOS FUNCIONALES

### 3.1 Modulo de Leads
**Objetivo:** Captura y gestion de clientes potenciales.

**Requerimientos:**
- Captura automatica desde chatbot WhatsApp (via n8n)
- Import manual (formulario uno por uno)
- Import masivo (Excel/CSV)
- Asignacion de vendedor
- Tipificacion en 3 niveles
- Exportacion a Excel
- Busqueda y filtros avanzados
- Historial de cambios

### 3.2 Modulo de Locales
**Objetivo:** Gestion del inventario y proceso de venta.

**Requerimientos:**
- Semaforo de 4 estados (verde, amarillo, naranja, rojo)
- Monto de venta editable inline
- Tracking de leads por local
- Real-time updates
- Import masivo de locales
- Ficha de inscripcion con datos del cliente
- PDF de financiamiento

### 3.3 Modulo de Control de Pagos
**Objetivo:** Gestion post-venta de pagos y cuotas.

**Requerimientos:**
- Calendario de cuotas
- Registro de abonos
- Verificacion por finanzas
- Estados: pendiente, parcial, completado
- Vista por local

### 3.4 Modulo de Comisiones
**Objetivo:** Gestion de comisiones de vendedores.

**Requerimientos:**
- Calculo automatico basado en reglas
- Estados: pendiente_inicial, disponible, pagada
- Desglose mensual
- Vista dual (mis comisiones / control de todas)
- Split por fase (vendedor/gestion)

### 3.5 Modulo de Documentos
**Objetivo:** Generacion automatica de documentos.

**Requerimientos:**
- Ficha de inscripcion (PDF)
- Contratos de venta (Word)
- Logo dinamico por proyecto
- Documentos adjuntos (DNI, comprobantes)

### 3.6 Modulo Repulse
**Objetivo:** Re-engagement de leads inactivos.

**Requerimientos:**
- Deteccion automatica de leads inactivos
- Envio batch via n8n
- Exclusion permanente
- Historial visible
- Cron diario 3:00 AM

### 3.7 Modulo de Reporteria
**Objetivo:** Reportes multi-proyecto.

**Requerimientos:**
- Vista de todos los proyectos
- Filtros por fecha, proyecto, vendedor
- Exportacion Excel
- Acceso sin sidebar

---

## 4. INTEGRACIONES

### n8n (Automatizacion)
- **Webhook entrada:** Recibir leads de chatbot
- **Webhook salida:** Notificar asignaciones
- **Repulse:** Enviar leads a re-engagement

### WhatsApp (via WATI)
- Chatbot Victoria (GPT-4o-mini)
- Notificaciones de asignacion

### Supabase
- Base de datos PostgreSQL
- Autenticacion (JWT)
- Real-time subscriptions
- Storage (logos, documentos)

---

## 5. REQUISITOS NO FUNCIONALES

### Seguridad
- Autenticacion con Supabase Auth
- RLS policies en todas las tablas
- Validacion server-side obligatoria
- RBAC en middleware y frontend

### Performance
- Tiempo de carga dashboard < 3s
- Soporte para 20,000+ leads
- Real-time updates < 1s

### Disponibilidad
- Uptime 99.9%
- Deployment en Vercel
- Recovery < 1 hora

### Usabilidad
- Responsive (mobile, tablet, desktop)
- Interfaz en espanol
- Colores corporativos: Verde #1b967a, Azul #192c4d, Amarillo #fbde17

---

## 6. PROYECTOS GESTIONADOS

1. **Trapiche** - Proyecto principal
2. **San Gabriel** - Urbanizacion
3. **Callao** - Proyecto comercial
4. **PROYECTO PRUEBAS** - Ambiente de testing

---

## 7. METRICAS DE EXITO

- Leads procesados: 20,000+
- Locales gestionados: 823
- Usuarios activos: 24
- Uptime: 99.9%
- Session loss: 0% (resuelto Sesion 45I)

---

**Documento generado:** 23 Diciembre 2025
**Basado en:** Documentacion existente del proyecto (74+ sesiones)
