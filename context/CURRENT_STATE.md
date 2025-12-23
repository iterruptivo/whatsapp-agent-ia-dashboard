# CURRENT_STATE - EcoPlaza Dashboard

> Estado detallado del proyecto. Actualizado cada sesion.

---

## Credenciales de Testing

> REGLA MANDATORIA: SIEMPRE usar **PROYECTO PRUEBAS** al iniciar sesion para testing.

| Rol | Email | Password |
|-----|-------|----------|
| **Admin** | `gerencia@ecoplaza.com` | `q0#CsgL8my3$` |
| **Jefe Ventas** | `leojefeventas@ecoplaza.com` | `67hgs53899#` |
| **Vendedor** | `alonso@ecoplaza.com` | `Q0KlC36J4M_y` |
| **Vendedor Caseta** | `leocaseta@ecoplaza.com` | `y62$3904h%$$3` |
| **Finanzas** | `rosaquispef@ecoplaza.com` | `u$432##faYh1` |

---

## Estado de Modulos

### Autenticacion
- **Estado:** ESTABLE (Sesion 45I)
- **Uptime:** 100%
- **Session duration:** 2+ horas sin problemas
- **Tecnologia:** Supabase Auth + Middleware validation

### Leads
- **Estado:** OPERATIVO
- **Total:** ~20,000 leads
- **Features:** Import manual, import Excel, keyset pagination
- **Ultima sesion:** 44

### Locales
- **Estado:** OPERATIVO
- **Total:** 823 locales
- **Features:** Semaforo 4 estados, Real-time, Monto venta, PDF financiamiento
- **Ultima sesion:** 52H

### Usuarios
- **Estado:** OPERATIVO
- **Total:** 24 usuarios activos
- **Roles:** admin, jefe_ventas, vendedor, vendedor_caseta, coordinador, finanzas, marketing
- **Ultima sesion:** 69

### Proyectos
- **Estado:** OPERATIVO
- **Total:** 7 proyectos
- **Features:** Configuracion TEA, cuotas, porcentajes
- **Ultima sesion:** 51

### Control de Pagos
- **Estado:** OPERATIVO
- **Features:** Calendario cuotas, abonos, verificacion finanzas
- **Ultima sesion:** 67

### Comisiones
- **Estado:** OPERATIVO
- **Features:** Desglose mensual, split vendedor/gestion, RLS policies
- **Ultima sesion:** 62

### Repulse
- **Estado:** OPERATIVO
- **Features:** Re-engagement leads, cron diario 3:00 AM, exclusion permanente
- **Ultima sesion:** 68

### Documentos
- **Estado:** EN DESARROLLO (6/8 fases)
- **Features:** Logo dinamico, PDF ficha inscripcion, Contratos Word (docx-templates)
- **Ultima sesion:** 66

---

## Arquitectura Tecnica

### Stack
- **Frontend:** Next.js 15.5.4, TypeScript, Tailwind CSS, Recharts
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Integraciones:** n8n (3 flujos activos), GPT-4o-mini (chatbot)
- **Deployment:** Vercel

### Patrones Clave
- Client Components con `useAuth()` hook
- Middleware.ts para RBAC
- Server Actions con Supabase client (cookies)
- RLS policies en todas las tablas

---

## Flujos n8n Activos

1. **Victoria - Eco - Callao - PROD** - Captura leads WhatsApp
2. **Victoria - Eco - Urb. San Gabriel** - Proyecto apertura
3. **Repulse Webhook** - Re-engagement automatico

---

## Integraciones Externas

- **WhatsApp:** Via WATI + n8n
- **OpenAI:** GPT-4o-mini para chatbot Victoria
- **Supabase Storage:** Logos, documentos, evidencias

---

**Ultima Actualizacion:** 23 Diciembre 2025
**Sesion:** 74+
