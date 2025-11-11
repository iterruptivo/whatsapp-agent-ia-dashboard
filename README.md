# 📊 Dashboard de Gestión de Leads - EcoPlaza

Dashboard web interno para visualizar y gestionar leads capturados por chatbot de WhatsApp Business con IA (GPT-4o-mini) integrado con n8n.

---

## 🎯 Descripción del Proyecto

Sistema completo de gestión de leads inmobiliarios que integra:
- **Chatbot WhatsApp** con IA (Victoria) para captura automática de leads
- **Dashboard Web** para visualización, gestión y análisis de datos
- **Sistema de Notificaciones** para vendedores vía WhatsApp
- **Gestión de Locales Comerciales** con seguimiento en tiempo real

---

## 🏗️ Stack Tecnológico

### **Frontend:**
- **Framework:** Next.js 15.5.4 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v3.4.1
- **Gráficos:** Recharts
- **Íconos:** Lucide React
- **UI Components:** Custom components con Tailwind

### **Backend:**
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Real-Time:** Supabase Realtime (WebSockets)
- **API:** Next.js Server Actions + Supabase REST API

### **Automatización:**
- **n8n:** Flujos de automatización para WhatsApp
- **OpenAI GPT-4o-mini:** Procesamiento de lenguaje natural
- **WhatsApp Business API:** Comunicación con clientes

### **Deployment:**
- **Hosting:** Vercel
- **Database:** Supabase Cloud
- **Repository:** Git

---

## 🎨 Paleta de Colores (Marca EcoPlaza)

```css
/* Verde Esmeralda (Primario) */
#1b967a

/* Azul Marino (Secundario) */
#192c4d

/* Amarillo (Acento) */
#fbde17
```

---

## 🚀 Setup del Proyecto

### **1. Clonar Repositorio**
```bash
git clone [repository-url]
cd dashboard
```

### **2. Instalar Dependencias**
```bash
npm install
```

### **3. Configurar Variables de Entorno**

Crear archivo `.env.local` en la raíz:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]

# n8n Webhook URLs (opcional)
N8N_WEBHOOK_URL=https://[your-n8n-instance]/webhook/...
```

### **4. Ejecutar en Desarrollo**
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📁 Estructura del Proyecto

```
dashboard/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Dashboard principal
│   ├── operativo/               # Vista operativa de leads
│   ├── locales/                 # Gestión de locales comerciales
│   ├── config/                  # Configuración (admin only)
│   └── login/                   # Página de autenticación
├── components/
│   ├── dashboard/               # Componentes del dashboard
│   │   ├── DashboardClient.tsx
│   │   ├── LeadsTable.tsx
│   │   ├── LeadDetailPanel.tsx
│   │   ├── StatsCard.tsx
│   │   └── PieChart.tsx
│   ├── locales/                 # Componentes de locales
│   │   ├── LocalesClient.tsx
│   │   ├── LocalesTable.tsx
│   │   └── LocalImportModal.tsx
│   └── shared/                  # Componentes compartidos
│       ├── Sidebar.tsx
│       └── ConfirmModal.tsx
├── lib/
│   ├── db.ts                    # Queries a Supabase
│   ├── actions.ts               # Server Actions (leads)
│   ├── actions-locales.ts       # Server Actions (locales)
│   ├── auth-context.tsx         # Context de autenticación
│   └── supabase.ts             # Cliente Supabase
├── consultas-leo/               # Documentación técnica y SQL
│   ├── SQL_*.sql               # Scripts SQL
│   ├── GUIA_*.md               # Guías operativas
│   └── *.md                    # Análisis y especificaciones
├── CLAUDE.md                    # 📋 Historial completo de desarrollo
├── CONTEXTO_PROYECTO.md         # Arquitectura y contexto del sistema
└── README.md                    # Este archivo
```

---

## 🔑 Roles de Usuario

| Rol | Dashboard | Operativo | Locales | Config | Gestión Usuarios |
|-----|-----------|-----------|---------|--------|------------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Jefe Ventas** | ❌ | ❌ | ✅ (view) | ❌ | ❌ |
| **Vendedor** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Vendedor Caseta** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Gerente** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 📊 Features Principales

### **Dashboard de Leads**
- Visualización de leads capturados por WhatsApp
- Estadísticas en tiempo real (KPIs, gráficos)
- Búsqueda y filtrado avanzado
- Asignación de leads a vendedores
- Notificaciones automáticas vía WhatsApp
- Exportación a Excel

### **Gestión de Locales Comerciales**
- Sistema de estados (Verde → Amarillo → Naranja → Rojo)
- Real-time updates con Supabase Realtime
- Vinculación de leads con locales
- Captura de monto de venta
- Historial de cambios (audit trail)
- Importación masiva desde CSV

### **Autenticación y Seguridad**
- Login con Supabase Auth
- Row Level Security (RLS) policies
- Protección de rutas por rol
- Session management con refresh automático
- Validación de usuarios activos

### **Integración n8n**
- Flujos automatizados de WhatsApp
- Captura automática de datos
- Notificaciones a vendedores
- Procesamiento con GPT-4o-mini

---

## 🛠️ Comandos Útiles

### **Desarrollo:**
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Ejecutar build
npm run lint         # Linter ESLint
```

### **Database (Supabase):**
```bash
# Ejecutar migrations SQL desde consultas-leo/
# Usar Supabase Dashboard SQL Editor
```

---

## 📚 Documentación

### **Archivo Principal:**
- **CLAUDE.md** - Historial completo de desarrollo (Sesiones 24-41B)
  - 2,900+ líneas de documentación técnica
  - Decisiones arquitectónicas
  - Bugs resueltos
  - Features implementadas
  - Lecciones aprendidas

### **Referencia Arquitectónica:**
- **CONTEXTO_PROYECTO.md** - Arquitectura del sistema completo
  - Descripción de n8n workflows
  - Stack tecnológico detallado
  - Flujo de datos completo
  - Integraciones

### **Documentación Técnica (consultas-leo/):**
- Guías de configuración n8n
- Scripts SQL para migrations
- Análisis de problemas resueltos
- Especificaciones de features
- Guías de setup

---

## 🔧 Troubleshooting

### **Problema: Sesión se pierde frecuentemente**
**Solución:** Verificar que middleware NO ejecute queries bloqueantes. Ver Sesión 29 en CLAUDE.md.

### **Problema: Dashboard muestra solo 1000 leads**
**Solución:** Verificar paginación keyset en lib/db.ts. Ver Sesión 33C en CLAUDE.md.

### **Problema: Notificaciones WhatsApp no llegan**
**Solución:** Verificar configuración de webhook n8n. Ver GUIA_N8N_NOTIFICACION_VENDEDOR.md.

### **Problema: RLS policy blocking queries**
**Solución:** Verificar policies en Supabase. Ver RLS_SECURITY_GUIDE.md en consultas-leo.

---

## 🚀 Deployment

### **Vercel (Recomendado):**
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático con cada push a main

### **Variables de Entorno en Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 👥 Equipo

- **Desarrollador Principal:** EcoPlaza Dev Team
- **Cliente:** EcoPlaza (Perú)
- **Asistencia:** Claude Code (Anthropic)

---

## 📝 Notas Importantes

1. **Backup Regular:** Siempre hacer backup de base de datos antes de migrations
2. **Testing:** Probar cambios en localhost antes de deploy
3. **Documentación:** Actualizar CLAUDE.md después de cada sesión
4. **Git:** Commits descriptivos y frecuentes

---

## 📞 Contacto

Para soporte técnico o consultas sobre el proyecto:
- Ver documentación en CLAUDE.md
- Consultar guías en consultas-leo/
- Revisar análisis de problemas anteriores

---

## 📄 Licencia

Proyecto privado - EcoPlaza © 2025

---

**Última Actualización:** 11 Noviembre 2025
**Versión:** 1.0
**Estado:** Producción ✅
