# 📋 CONTEXTO DEL PROYECTO - Dashboard EcoPlaza

**Proyecto:** Dashboard de Gestión de Leads - EcoPlaza (Proyecto Trapiche)  
**Cliente:** EcoPlaza  
**Fecha Inicio:** Octubre 2025  
**Ubicación:** `E:\Iterruptivo\Proyectos-Clientes\EcoPlaza\AgenteIA-Whatsapp\dashboard`

---

## 🎯 OBJETIVO PRINCIPAL

Crear un dashboard web interno para visualizar y gestionar leads capturados por un chatbot de WhatsApp Business que usa IA (GPT-4o-mini) a través de n8n.

---

## 🏗️ ARQUITECTURA DEL SISTEMA COMPLETO

```
┌─────────────────────────────────────────────┐
│   WHATSAPP BUSINESS                         │
│   - Número de WhatsApp                      │
│   - Recibe mensajes de clientes             │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│   N8N (Flujo de Automatización)             │
│   - Webhook para recibir mensajes           │
│   - Procesamiento de texto y audio          │
│   - Agente IA (GPT-4o-mini)                 │
│   - Extracción de datos estructurados       │
│   - Lógica de estados de conversación       │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│   BASE DE DATOS (Actualmente: Google Sheets)│
│   FUTURO: Supabase (PostgreSQL)             │
│   - Almacena leads capturados               │
│   - Historial de conversaciones             │
│   - Estados de leads                        │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│   DASHBOARD WEB (Este proyecto)             │
│   - Visualización de leads                  │
│   - Estadísticas en tiempo real             │
│   - Gestión de conversaciones               │
└─────────────────────────────────────────────┘
```

---

## 🤖 FLUJO DEL CHATBOT (n8n)

### Archivo: `V4 - EcoPlaza Agente IA Whatsapp (Githup) (3).json`

**Componentes Principales:**

1. **Webhook Receiver** → Recibe mensajes de WhatsApp
2. **Switch Node** → Detecta tipo de mensaje (texto/audio/verificación)
3. **Audio Processing** → Transcribe audio con Whisper (OpenAI)
4. **Knowledge Base** → GitHub raw file con instrucciones del agente
5. **Google Sheets Lookup** → Busca conversaciones existentes
6. **Message Model (GPT-4o-mini)** → Responde basado en contexto
7. **Data Extraction (GPT-4o-mini)** → Extrae: nombre, rubro, horario_visita
8. **State Logic** → Determina estado del lead
9. **History Summarization** → Resume conversaciones largas
10. **Google Sheets Update** → Guarda lead + historial
11. **Vendor Notification** → Notifica a vendedores cuando se completa/abandona
12. **WhatsApp Send** → Envía respuesta al usuario

### Estados del Lead:

```javascript
- 'lead_completo'           // Tiene nombre, rubro y horario
- 'lead_incompleto'         // Tiene algunos datos pero no todos
- 'en_conversacion'         // Conversación activa
- 'conversacion_abandonada' // Sin respuesta después de X intentos
```

### Lógica de Cierre de Conversación:

- **Con datos completos:** Nunca fuerza cierre
- **Con datos parciales:** Cierra después de 8 intentos
- **Sin datos:** Cierra después de 5 intentos

### Datos Capturados por Lead:

```typescript
{
  telefono: string;              // +51987654321
  nombre: string;                // "Carlos Mendoza"
  rubro: string;                 // "Ferretería"
  horario_visita: string;        // "Lunes 3pm"
  estado: EstadoLead;            // Ver arriba
  historial_conversacion: string; // Todo el chat
  historial_reciente: string;    // Últimos 10 mensajes
  resumen_historial: string;     // Resumen generado por GPT
  fecha_captura: string;         // ISO 8601
  ultimo_mensaje: string;        // Último mensaje del usuario
  intentos_bot: number;          // Contador de respuestas
}
```

---

## 🎨 DASHBOARD ACTUAL (Next.js)

### Stack Tecnológico:

- **Framework:** Next.js 15.5.4 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v3.4.1
- **Gráficos:** Recharts
- **Íconos:** Lucide React
- **Runtime:** Node.js + npm
- **Servidor Local:** http://localhost:3000

### Paleta de Colores (Marca EcoPlaza):

```css
/* Primario - Verde esmeralda */
primary: #1b967a
primary-light: #22b894
primary-dark: #157a63

/* Secundario - Azul marino */
secondary: #192c4d
secondary-light: #253d66
secondary-dark: #0f1d33

/* Acento - Amarillo */
accent: #fbde17
accent-light: #fce850
accent-dark: #d9bc00
```

### Estructura de Archivos:

```
dashboard/
├── app/
│   ├── page.tsx           → Página principal del dashboard
│   ├── globals.css        → Estilos globales + Tailwind
│   └── layout.tsx         → Layout base
├── components/
│   └── dashboard/
│       ├── StatsCard.tsx      → Tarjetas de KPIs
│       ├── PieChart.tsx       → Gráfico de torta
│       └── LeadsTable.tsx     → Tabla de leads con búsqueda
├── lib/
│   └── fakeData.ts        → Datos fake para desarrollo
├── tailwind.config.ts     → Configuración de Tailwind (colores custom)
├── postcss.config.mjs     → Configuración de PostCSS
└── package.json           → Dependencias
```

### Componentes Actuales:

#### 1. StatsCard (Tarjetas de Estadísticas)
- Props: title, value, icon, color
- Muestra KPIs con íconos coloridos
- Hover effect con shadow

#### 2. PieChart (Gráfico Circular)
- Visualiza distribución de estados
- Colores según el estado del lead
- Tooltip y leyenda interactiva

#### 3. LeadsTable (Tabla de Leads)
- Buscador en tiempo real
- Filtro por: nombre, teléfono, rubro
- Badges de estado con colores
- Formato de fechas en español (es-PE)

### Datos Fake Actuales:

```typescript
// 8 leads de ejemplo con diferentes estados
- 4 Leads Completos (50%)
- 2 Leads Incompletos (25%)
- 1 En Conversación (12.5%)
- 1 Abandonado (12.5%)
```

---

## 🚀 PLAN DE DESARROLLO FUTURO

### Fase 1: Base de Datos Real (SIGUIENTE)
- [ ] Configurar Supabase
- [ ] Crear tablas:
  - `leads` → Datos principales
  - `conversaciones` → Historial completo
  - `vendedores` → Equipo de ventas
- [ ] Migrar de Google Sheets a Supabase en n8n
- [ ] Conectar dashboard a Supabase

### Fase 2: Autenticación
- [ ] Implementar Supabase Auth
- [ ] Página de login
- [ ] Roles: Admin, Vendedor, Viewer
- [ ] Proteger rutas del dashboard

### Fase 3: Funcionalidades Avanzadas
- [ ] Vista de detalle de lead (modal o página)
- [ ] Ver historial completo de conversación
- [ ] Filtros avanzados (por fecha, estado, vendedor)
- [ ] Exportar datos a Excel/CSV
- [ ] Notificaciones en tiempo real
- [ ] Asignar leads a vendedores
- [ ] Cambiar estado manualmente
- [ ] Agregar notas a leads

### Fase 4: Integración CRM Externo
- [ ] API para enviar leads a CRM externo
- [ ] Webhook para sincronización bidireccional
- [ ] Mapeo de campos CRM ↔ Dashboard

### Fase 5: Módulo de Finanzas (Futuro)
- [ ] Dashboard de ingresos/gastos
- [ ] Proyecciones financieras
- [ ] ROI por lead
- [ ] Reportes mensuales/anuales

### Fase 6: Deploy a Producción
- [ ] Deploy en Vercel (gratis)
- [ ] Configurar dominio/subdominio
- [ ] Variables de entorno
- [ ] Monitoring y analytics

---

## 🛠️ COMANDOS ÚTILES

### Desarrollo Local:
```bash
npm run dev          # Ejecutar servidor de desarrollo
npm run build        # Crear build de producción
npm run start        # Ejecutar build de producción
npm run lint         # Revisar código con ESLint
```

### Gestión de Dependencias:
```bash
npm install [paquete]      # Instalar paquete
npm uninstall [paquete]    # Desinstalar paquete
npm update                 # Actualizar dependencias
```

---

## 🐛 PROBLEMAS RESUELTOS

### 1. Error de tipos en PieChart
**Problema:** `'percent' is of type 'unknown'`  
**Solución:** Usar `as any` en la data y tipar explícitamente el entry

### 2. Tailwind v4 instalado por error
**Problema:** `@tailwind` no reconocido  
**Solución:** Downgrade a Tailwind v3.4.1 y actualizar `postcss.config.mjs`

### 3. Colores no aplicados
**Problema:** `postcss.config.mjs` configurado para v4  
**Solución:** Cambiar plugins a formato objeto v3

---

## 📚 TECNOLOGÍAS A CONSIDERAR

### Para Integraciones Futuras:
- **Supabase:** Base de datos + Auth + Real-time
- **Resend/SendGrid:** Emails transaccionales
- **Twilio:** SMS/WhatsApp programático
- **Stripe:** Pagos (si se monetiza)
- **Sentry:** Monitoreo de errores
- **Vercel Analytics:** Métricas de uso

### Librerías Útiles:
```bash
# Exportar datos
npm install xlsx                    # Excel exports

# Validación
npm install zod                     # Schema validation

# Formularios
npm install react-hook-form         # Forms management

# Fechas
npm install date-fns                # Date utilities

# Tablas avanzadas
npm install @tanstack/react-table   # Table management

# Notificaciones
npm install sonner                  # Toast notifications

# Animaciones
npm install framer-motion           # Animations
```

---

## 🎯 MÉTRICAS CLAVE DEL NEGOCIO

### KPIs Actuales en Dashboard:
1. **Total Leads:** Suma de todos los leads capturados
2. **Leads Completos:** Leads con datos completos (nombre + rubro + horario)
3. **En Conversación:** Leads con conversación activa
4. **Tasa de Conversión:** % de leads completos vs total

### Métricas Futuras a Implementar:
- Tasa de respuesta del bot
- Tiempo promedio de conversación
- Leads por día/semana/mes
- Conversión por vendedor
- Horarios más solicitados
- Rubros más frecuentes
- Tiempo de respuesta de vendedores

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

### Datos Sensibles:
- Números de teléfono de clientes
- Historial de conversaciones
- Datos personales (nombres, negocios)

### Acciones Requeridas:
- [ ] Encriptar datos sensibles en base de datos
- [ ] Implementar HTTPS en producción
- [ ] Variables de entorno para API keys
- [ ] Rate limiting en APIs
- [ ] Logs de acceso al dashboard
- [ ] GDPR compliance (si aplica)

---

## 📝 NOTAS IMPORTANTES

1. **Disco Externo:** Proyecto en `E:\` (USB 3.0), asegurar no desconectar durante desarrollo

2. **Google Sheets Temporal:** Actualmente se usa Google Sheets, pero se migrará a Supabase

3. **Vendedores:** El flujo de n8n notifica a vendedores desde una hoja "vendedores" en Google Sheets

4. **Arquitectura Híbrida:** Next.js frontend + Supabase backend + n8n para automatización

5. **No usar Python:** Se decidió NO usar FastAPI/Python para mantener simplicidad y velocidad

6. **Claude Code:** Usar sub-agentes para modificaciones rápidas del dashboard

---

## 🎓 CONTEXTO DEL EQUIPO

### Desarrollador Principal:
- Windows 11
- VS Code + Claude Code instalado
- Node.js + npm configurado
- Primera experiencia con Next.js/React
- Conocimiento de n8n
- Enfoque en escalabilidad futura

### Estilo de Desarrollo:
- Priorizar simplicidad sobre complejidad
- Código limpio y comentado
- Documentación clara
- Pensar en escalabilidad desde el inicio

---

## 🚨 RECORDATORIOS PARA CLAUDE CODE

1. **Siempre mantener los colores de marca** (#1b967a, #192c4d, #fbde17)
2. **Usar TypeScript** para mejor type safety
3. **Comentar código complejo** para facilitar mantenimiento
4. **Responsive design** (mobile-first si es necesario)
5. **Accesibilidad** (contraste, semántica HTML)
6. **Performance** (lazy loading, code splitting)
7. **Mantener estructura de carpetas** clara y escalable

---

## 📞 PRÓXIMAS CONVERSACIONES

Cuando trabajes con Claude Code en este proyecto, enfócate en:

1. **Mejorar UX/UI** del dashboard actual
2. **Agregar funcionalidades** de la Fase 3
3. **Integrar Supabase** cuando se configure
4. **Optimizar rendimiento** si es necesario
5. **Agregar tests** para componentes críticos

---

**Fecha de última actualización:** Octubre 2025  
**Versión del documento:** 1.0  
**Autor:** Conversación con Claude (Anthropic)

---

## ✅ ESTADO ACTUAL DEL PROYECTO

**✅ COMPLETADO:**
- Proyecto Next.js configurado
- Tailwind CSS funcionando correctamente
- Componentes básicos creados
- Datos fake implementados
- Dashboard visual funcionando al 100%
- Colores de marca aplicados
- Servidor local corriendo en http://localhost:3000

**🔄 EN PROGRESO:**
- Documentación del proyecto

**⏳ PENDIENTE:**
- Integración con Supabase
- Autenticación
- Conexión con n8n
- Deploy a producción

---

**🎉 ¡El dashboard está listo para ser extendido con Claude Code!**