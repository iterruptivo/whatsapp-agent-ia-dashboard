# PLAN DE INTEGRACIÓN META LEAD ADS 2026

> Plan completo para integrar Facebook/Instagram Lead Ads directamente al Dashboard de EcoPlaza

**Fecha de creación:** 09 Enero 2026
**Especialista:** meta-ads-specialist
**Objetivo:** Capturar leads de Facebook/Instagram directamente en el dashboard, sin depender de Esperance CRM

---

## RESUMEN EJECUTIVO

### Problema Actual
- Los leads de Facebook/Instagram Lead Ads van a "Esperance CRM"
- No hay control directo sobre los leads capturados
- Los leads no llegan automáticamente al Dashboard de EcoPlaza
- Dependencia de un sistema externo para gestionar leads

### Solución Propuesta
Integrar Meta Lead Ads API mediante webhooks para recibir leads en tiempo real y almacenarlos directamente en la tabla `leads` de Supabase.

### Flujo Nuevo
```
Facebook/Instagram Ads → Lead Form → Meta Webhook → Dashboard API → Supabase
```

### Beneficios
- Control total sobre los leads desde el momento de captura
- Datos en tiempo real (menos de 5 segundos)
- Sin dependencia de CRMs externos
- Posibilidad de optimizar campañas con Conversions API
- Costos reducidos al eliminar intermediarios

---

## 1. FUNDAMENTOS DE META LEAD ADS

### ¿Qué es Meta Lead Ads?

Meta Lead Ads (Facebook/Instagram Lead Generation Ads) permite crear formularios nativos dentro de Facebook e Instagram que capturan información de clientes potenciales sin que salgan de la plataforma.

**Características clave:**
- Formularios pre-rellenados con datos del perfil de Facebook
- Alta tasa de conversión (no hay fricción de cambiar de app)
- Personalizable (campos estándar + preguntas custom)
- Funciona igual en Facebook e Instagram

### ¿Cómo funciona la integración?

La integración se basa en dos componentes principales:

1. **Webhooks (Tiempo Real)**
   - Meta envía notificación inmediata cuando un lead completa el formulario
   - El webhook incluye un `leadgen_id` (identificador del lead)
   - Debemos configurar un endpoint HTTPS para recibir estas notificaciones

2. **Graph API (Recuperación de Datos)**
   - Usamos el `leadgen_id` para obtener los datos completos del lead
   - Endpoint: `GET /{leadgen_id}` con un Page Access Token
   - Respuesta incluye todos los campos del formulario

---

## 2. REQUISITOS PREVIOS

### 2.1 Cuenta Meta Business

Necesitas tener:

- [ ] **Facebook Business Manager** creado ([business.facebook.com](https://business.facebook.com))
- [ ] **Página de Facebook** con rol Admin
- [ ] **Cuenta publicitaria** activa
- [ ] **Business verificado** (para permisos avanzados)

### 2.2 Facebook Developer Account

- [ ] Cuenta en [developers.facebook.com](https://developers.facebook.com)
- [ ] Crear una "Facebook App" (tipo: Business)
- [ ] Agregar productos:
  - Webhooks
  - Facebook Login (para OAuth)
  - Marketing API

### 2.3 Permisos Necesarios

Tu app debe solicitar estos permisos en el App Review:

| Permiso | Propósito |
|---------|-----------|
| `leads_retrieval` | Obtener datos de los leads |
| `pages_manage_ads` | Gestionar anuncios de la página |
| `pages_read_engagement` | Leer interacciones de la página |
| `pages_show_list` | Ver lista de páginas administradas |

**IMPORTANTE:** Estos permisos requieren App Review de Facebook (puede tardar 3-7 días).

### 2.4 Tokens de Acceso

Necesitarás dos tipos de tokens:

1. **Page Access Token (PAT)**
   - Token asociado a tu página de Facebook
   - Tiene mejor rate limit que User tokens
   - Puede ser "long-lived" (60 días) o permanente (con System User)

2. **App Secret**
   - Para verificar la firma de webhooks
   - Disponible en Settings > Basic de tu app

**Recomendación:** Usar **System User** para tokens permanentes que no expiren.

### 2.5 Infraestructura

- [ ] Endpoint HTTPS público (Vercel ya lo tiene)
- [ ] Certificado SSL válido (Vercel lo provee automáticamente)
- [ ] Variables de entorno configuradas

---

## 3. ARQUITECTURA DE LA INTEGRACIÓN

### 3.1 Estructura de Archivos

```
app/api/meta/
├── webhook/
│   └── route.ts          # GET: verificación | POST: recibir leads
├── leads/
│   └── route.ts          # GET: fetch manual de leads (backup)
└── conversions/
    └── route.ts          # POST: enviar eventos CAPI (futuro)

lib/
├── meta-lead-ads.ts      # Funciones helper para Meta API
└── actions-meta-leads.ts # Server actions para gestionar leads Meta

supabase/migrations/
└── 20260109_meta_lead_ads.sql  # Tablas para config y logs
```

### 3.2 Variables de Entorno

Agregar a `.env.local`:

```env
# Meta Lead Ads
META_APP_ID=123456789012345              # Facebook App ID
META_APP_SECRET=abc123def456...          # Para verificar firmas
META_VERIFY_TOKEN=mi_token_seguro_123    # Token custom para webhook
META_PAGE_ACCESS_TOKEN=EAAx...           # Long-lived Page Token
META_PIXEL_ID=987654321                  # Para Conversions API (opcional)
```

### 3.3 Tablas en Supabase

#### Tabla: `meta_lead_forms`
Configuración de formularios Meta por proyecto:

```sql
CREATE TABLE meta_lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id) NOT NULL,
  form_id TEXT NOT NULL UNIQUE,
  form_name TEXT,
  page_id TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  campo_mapping JSONB,  -- Mapeo de campos custom
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meta_lead_forms_proyecto ON meta_lead_forms(proyecto_id);
CREATE INDEX idx_meta_lead_forms_form_id ON meta_lead_forms(form_id);
```

#### Tabla: `meta_webhook_logs`
Log de webhooks para debugging:

```sql
CREATE TABLE meta_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  payload JSONB NOT NULL,
  leadgen_id TEXT,
  form_id TEXT,
  page_id TEXT,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meta_webhook_logs_leadgen ON meta_webhook_logs(leadgen_id);
CREATE INDEX idx_meta_webhook_logs_processed ON meta_webhook_logs(processed);
CREATE INDEX idx_meta_webhook_logs_created ON meta_webhook_logs(created_at DESC);
```

#### Actualizar tabla `leads`

Agregar columnas para Meta:

```sql
ALTER TABLE leads ADD COLUMN meta_leadgen_id TEXT UNIQUE;
ALTER TABLE leads ADD COLUMN meta_form_id TEXT;
ALTER TABLE leads ADD COLUMN meta_ad_id TEXT;
ALTER TABLE leads ADD COLUMN meta_campaign_id TEXT;
```

---

## 4. CONFIGURACIÓN EN META

### 4.1 Crear Facebook App

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear App → Tipo: **Business**
3. Nombre: "EcoPlaza Lead Ads Integration"
4. Agregar productos:
   - **Webhooks**
   - **Facebook Login**

### 4.2 Configurar Webhooks

1. En tu app, ir a **Products > Webhooks**
2. Suscribirse a objeto: **page**
3. Configurar:
   - **Callback URL:** `https://tu-dominio.vercel.app/api/meta/webhook`
   - **Verify Token:** El valor que pongas en `META_VERIFY_TOKEN`
4. Suscribirse al campo: **leadgen**

**Proceso de verificación:**
- Meta enviará GET request con parámetros:
  - `hub.mode=subscribe`
  - `hub.challenge=RANDOM_STRING`
  - `hub.verify_token=TU_TOKEN`
- Tu endpoint debe responder con `hub.challenge` en plain text

### 4.3 Configurar Lead Access Manager

1. Ir a [Business Settings](https://business.facebook.com/settings)
2. Menú izquierdo: **Integrations > Lead Access**
3. Seleccionar tu página de Facebook
4. Click en **Assign CRMs**
5. Buscar tu app y asignarla
6. Click en **Assign People** y agregar admins

**IMPORTANTE:** Sin este paso, no podrás acceder a los leads aunque el webhook funcione.

### 4.4 Obtener Page Access Token

**Opción 1: Graph API Explorer (Testing)**
1. Ir a [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Seleccionar tu app
3. Agregar permisos: `leads_retrieval`, `pages_manage_ads`, `pages_read_engagement`
4. Click en "Generate Access Token"
5. Para token long-lived (60 días):
   ```
   GET /oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={app-id}&
     client_secret={app-secret}&
     fb_exchange_token={short-lived-token}
   ```

**Opción 2: System User (Producción)**
1. Business Settings > Users > System Users
2. Crear System User
3. Asignar a la app con permisos de admin
4. Generar token → No expira nunca

### 4.5 App Review

Para producción, debes pasar App Review:

1. En tu app, ir a **App Review > Permissions and Features**
2. Solicitar:
   - `leads_retrieval`
   - `pages_manage_ads`
   - `pages_read_engagement`
3. Para cada permiso, proporcionar:
   - Video screencast mostrando cómo usas el permiso
   - Explicación detallada del uso
   - Privacy Policy URL

**Tiempo estimado:** 3-7 días hábiles

---

## 5. IMPLEMENTACIÓN DEL WEBHOOK

### 5.1 Endpoint de Verificación (GET)

Meta verifica tu endpoint enviando un GET request:

```typescript
// app/api/meta/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verificar que el token coincida
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('Webhook verificado exitosamente');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Verification failed', { status: 403 });
}
```

### 5.2 Endpoint de Recepción de Leads (POST)

Cuando un lead completa el formulario, Meta envía un POST:

```typescript
// app/api/meta/webhook/route.ts (continuación)

import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Leer el body
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // 2. Verificar la firma (CRÍTICO para seguridad)
    if (!verifyWebhookSignature(body, signature, process.env.META_APP_SECRET!)) {
      console.error('Firma inválida');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // 3. Parsear el payload
    const payload = JSON.parse(body);

    // 4. Log del webhook completo (para debugging)
    const supabase = await createClient();
    await supabase.from('meta_webhook_logs').insert({
      event_type: payload.object,
      payload: payload,
    });

    // 5. Procesar cada entrada
    if (payload.object === 'page') {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadgenData = change.value;

            // 6. Log específico del lead
            await supabase.from('meta_webhook_logs').insert({
              event_type: 'leadgen',
              payload: leadgenData,
              leadgen_id: leadgenData.leadgen_id,
              form_id: leadgenData.form_id,
              page_id: leadgenData.page_id,
              processed: false,
            });

            // 7. Procesar el lead en background
            // IMPORTANTE: Responder rápido (< 5 segundos) o Meta reintentará
            processLeadInBackground(leadgenData.leadgen_id, leadgenData.form_id);
          }
        }
      }
    }

    // 8. Responder inmediatamente
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Función para verificar firma
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false;

  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  return `sha256=${expectedSig}` === signature;
}
```

### 5.3 Procesamiento Asíncrono del Lead

```typescript
// lib/meta-lead-ads.ts

async function processLeadInBackground(leadgenId: string, formId: string) {
  try {
    // 1. Fetch lead data desde Graph API
    const leadData = await fetchLeadFromMeta(leadgenId);

    // 2. Buscar configuración del formulario
    const formConfig = await getFormConfig(formId);

    if (!formConfig) {
      console.error(`Formulario ${formId} no configurado`);
      return;
    }

    // 3. Mapear campos de Meta a nuestro schema
    const mappedLead = mapMetaLeadToLead(leadData, formConfig);

    // 4. Insertar en tabla leads
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...mappedLead,
        proyecto_id: formConfig.proyecto_id,
        origen: leadData.platform === 'ig' ? 'instagram_lead_ads' : 'meta_lead_ads',
        canal: leadData.platform === 'ig' ? 'instagram' : 'facebook',
        meta_leadgen_id: leadgenId,
        meta_form_id: formId,
        meta_ad_id: leadData.ad_id,
        meta_campaign_id: leadData.campaign_id,
      })
      .select()
      .single();

    if (error) throw error;

    // 5. Marcar webhook como procesado
    await supabase
      .from('meta_webhook_logs')
      .update({ processed: true })
      .eq('leadgen_id', leadgenId);

    console.log(`Lead ${leadgenId} procesado exitosamente:`, data);

  } catch (error) {
    // 6. Log del error
    const supabase = await createClient();
    await supabase
      .from('meta_webhook_logs')
      .update({
        processed: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('leadgen_id', leadgenId);

    console.error(`Error procesando lead ${leadgenId}:`, error);
  }
}

async function fetchLeadFromMeta(leadgenId: string): Promise<any> {
  const url = `https://graph.facebook.com/v22.0/${leadgenId}`;
  const params = new URLSearchParams({
    access_token: process.env.META_PAGE_ACCESS_TOKEN!,
  });

  const response = await fetch(`${url}?${params}`);

  if (!response.ok) {
    throw new Error(`Meta API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
```

---

## 6. ESTRUCTURA DEL WEBHOOK PAYLOAD

### 6.1 Notificación de Webhook (POST a tu endpoint)

```json
{
  "object": "page",
  "entry": [
    {
      "id": "123456789",
      "time": 1736400000,
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "leadgen_id": "987654321",
            "page_id": "123456789",
            "form_id": "456789123",
            "adgroup_id": "789123456",
            "ad_id": "321654987",
            "created_time": 1736400000
          }
        }
      ]
    }
  ]
}
```

### 6.2 Datos del Lead (GET /{leadgen_id})

```json
{
  "id": "987654321",
  "created_time": "2026-01-09T12:00:00+0000",
  "ad_id": "321654987",
  "form_id": "456789123",
  "field_data": [
    {
      "name": "full_name",
      "values": ["Juan Pérez"]
    },
    {
      "name": "email",
      "values": ["juan.perez@example.com"]
    },
    {
      "name": "phone_number",
      "values": ["+51987654321"]
    },
    {
      "name": "custom_question_1",
      "values": ["Respuesta personalizada"]
    }
  ]
}
```

### 6.3 Campos Estándar de Meta

| Campo Meta | Descripción | Mapeo a `leads` |
|------------|-------------|-----------------|
| `full_name` | Nombre completo | `nombre` |
| `email` | Correo electrónico | `email` |
| `phone_number` | Teléfono | `telefono` |
| `city` | Ciudad | `notas` (adicional) |
| `state` | Estado/Región | `notas` (adicional) |
| `zip_code` | Código postal | `notas` (adicional) |
| `country` | País | `notas` (adicional) |
| `work_email` | Email trabajo | `email_trabajo` (nuevo campo) |
| `work_phone_number` | Teléfono trabajo | `telefono_trabajo` (nuevo campo) |

**Campos personalizados:** Cualquier pregunta custom que agregues en el formulario aparecerá con su nombre en `field_data`.

---

## 7. MAPEO DE DATOS

### 7.1 Función de Mapeo

```typescript
// lib/meta-lead-ads.ts

interface MetaLeadData {
  id: string;
  created_time: string;
  ad_id?: string;
  form_id: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
}

interface FormConfig {
  proyecto_id: string;
  campo_mapping?: Record<string, string>;
}

function mapMetaLeadToLead(
  metaLead: MetaLeadData,
  formConfig: FormConfig
) {
  const fieldMap = new Map(
    metaLead.field_data.map(f => [f.name, f.values[0] || ''])
  );

  // Mapeo estándar
  const nombre = fieldMap.get('full_name') || 'Sin nombre';
  const email = fieldMap.get('email') || null;
  const telefono = fieldMap.get('phone_number') || null;

  // Campos custom según configuración
  const notasExtras: string[] = [];

  if (formConfig.campo_mapping) {
    for (const [metaField, localField] of Object.entries(formConfig.campo_mapping)) {
      const value = fieldMap.get(metaField);
      if (value) {
        notasExtras.push(`${localField}: ${value}`);
      }
    }
  }

  // Agregar campos adicionales a notas
  const city = fieldMap.get('city');
  const state = fieldMap.get('state');
  if (city) notasExtras.push(`Ciudad: ${city}`);
  if (state) notasExtras.push(`Región: ${state}`);

  return {
    nombre,
    email,
    telefono,
    notas: notasExtras.join('\n'),
    fecha_registro: new Date(metaLead.created_time),
  };
}
```

### 7.2 Configuración de Formularios

Tabla `meta_lead_forms` permite mapear campos custom:

```typescript
// Ejemplo de config guardada en campo_mapping
{
  "presupuesto": "presupuesto_estimado",
  "interes_proyecto": "proyecto_interes",
  "tiempo_compra": "timeline_compra"
}
```

---

## 8. TESTING

### 8.1 Testing Tool de Meta

Meta provee una herramienta para crear leads de prueba:

1. Ir a [Lead Ads Testing](https://developers.facebook.com/tools/lead-ads-testing)
2. Seleccionar tu página
3. Seleccionar un formulario
4. Click en "Create Lead"
5. Revisar logs en `meta_webhook_logs` para verificar recepción

### 8.2 Verificación Manual

```typescript
// app/api/meta/leads/route.ts
// Endpoint para fetch manual (backup/testing)

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const formId = searchParams.get('form_id');

  if (!formId) {
    return NextResponse.json({ error: 'form_id required' }, { status: 400 });
  }

  try {
    const url = `https://graph.facebook.com/v22.0/${formId}/leads`;
    const params = new URLSearchParams({
      access_token: process.env.META_PAGE_ACCESS_TOKEN!,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### 8.3 Checklist de Testing

- [ ] Verificación del webhook (GET request)
- [ ] Recepción de lead de prueba
- [ ] Verificación de firma
- [ ] Log en `meta_webhook_logs`
- [ ] Fetch de datos desde Graph API
- [ ] Mapeo correcto de campos
- [ ] Inserción en tabla `leads`
- [ ] Notificación de error si falla

---

## 9. CONVERSIONS API (FASE 2 - OPCIONAL)

### ¿Para qué sirve?

La Conversions API (CAPI) permite enviar eventos de conversión server-side a Meta para:
- Optimizar campañas basadas en calidad de leads
- Mejorar targeting (Meta aprende qué tipo de leads convierten)
- Reducir costo por lead calificado (~19% según Meta)

### Eventos Recomendados

| Evento | Cuándo enviarlo |
|--------|----------------|
| `Lead` | Cuando el lead se crea (redundancia con Pixel) |
| `SubmitApplication` | Cuando completa ficha de inscripción |
| `Schedule` | Cuando agenda una cita |
| `Purchase` | Cuando firma contrato / paga separación |

### Implementación Básica

```typescript
// app/api/meta/conversions/route.ts

export async function POST(request: NextRequest) {
  try {
    const { event_name, leadgen_id, email, phone, value } = await request.json();

    const eventData = {
      data: [
        {
          event_name: event_name, // 'Lead', 'Purchase', etc.
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: 'https://tu-dashboard.vercel.app',
          user_data: {
            em: hashSHA256(email),  // Email hasheado
            ph: hashSHA256(phone),  // Teléfono hasheado
          },
          custom_data: {
            value: value || 0,
            currency: 'PEN',
          },
        },
      ],
      access_token: process.env.META_PAGE_ACCESS_TOKEN,
    };

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${process.env.META_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      }
    );

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json({ error: 'Failed to send event' }, { status: 500 });
  }
}

function hashSHA256(text: string): string {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}
```

### Cuándo Implementar

- **Ahora:** Enfocarse en recibir leads correctamente
- **Después:** Cuando tengas datos de conversión (ventas, citas)
- **Objetivo:** Event Match Quality (EMQ) > 6.0 para mejor optimización

---

## 10. CONSIDERACIONES DE SEGURIDAD

### 10.1 Verificación de Firma (OBLIGATORIO)

**NUNCA** procesar un webhook sin verificar la firma:

```typescript
const signature = request.headers.get('x-hub-signature-256');
if (!verifyWebhookSignature(body, signature, process.env.META_APP_SECRET!)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
}
```

### 10.2 Protección de Tokens

- NUNCA expongas tokens en frontend
- Usar System User para tokens permanentes
- Rotar tokens si hay sospecha de compromiso
- Variables de entorno en Vercel (nunca en código)

### 10.3 Rate Limiting

Meta tiene rate limits por app:
- **Tier Standard:** ~200 llamadas/hora
- **Tier Advanced:** ~4800 llamadas/hora

**Mejores prácticas:**
- Usar Page Access Tokens (mejores límites que User tokens)
- Implementar exponential backoff en errores 429
- Cachear configuraciones de formularios

### 10.4 Manejo de Errores

```typescript
// Retry con exponential backoff
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || (2 ** i);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
    }
  }
}
```

---

## 11. MONITOREO Y DEBUGGING

### 11.1 Dashboard de Logs

Crear vista en el dashboard para ver:
- Webhooks recibidos (últimas 24 horas)
- Leads procesados vs pendientes
- Errores y su frecuencia
- Formularios más activos

```sql
-- Query para monitoreo
SELECT
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE processed = true) as procesados,
  COUNT(*) FILTER (WHERE error IS NOT NULL) as con_error
FROM meta_webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hora
ORDER BY hora DESC;
```

### 11.2 Alertas

Configurar alertas cuando:
- Tasa de error > 5%
- No se reciben webhooks en 1 hora (si hay campaña activa)
- Tiempo de procesamiento > 30 segundos
- Firma inválida (posible ataque)

### 11.3 Meta Events Manager

Meta provee un dashboard para ver:
- Eventos recibidos vía Pixel y CAPI
- Event Match Quality (EMQ)
- Deduplicación
- Errores de API

Link: [Meta Events Manager](https://business.facebook.com/events_manager2)

---

## 12. ACTUALIZACIONES IMPORTANTES 2026

### Meta Graph API v22.0

**Lanzamiento:** Enero 2025
**Deprecations importantes:**
- Messaging Events API → Migrar a Conversions API (deadline: Sept 2025)
- Varios Instagram Insights metrics deprecados desde v21

**Cambios relevantes:**
- Mejoras en location targeting (6.7% reducción de costos)
- Nuevas restricciones en custom audiences para housing/financial
- Endpoints de Marketing API unificados

### Versión Recomendada

```typescript
// Usar v22.0 o la más reciente estable
const GRAPH_API_VERSION = 'v22.0';
const baseUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
```

### Fechas Clave

| Fecha | Evento |
|-------|--------|
| Enero 2025 | v22.0 lanzado |
| Abril 2025 | Deadline para actualizar endpoints Graph API |
| Septiembre 2025 | Deprecation de Messaging Events API |
| Enero 2026 | Deprecation de legacy campaign objects |

---

## 13. ROADMAP DE IMPLEMENTACIÓN

### Fase 1: Setup y Testing (Semana 1)

**Objetivo:** Webhook funcionando en testing

- [ ] Crear Facebook App
- [ ] Configurar Webhooks
- [ ] Implementar endpoint de verificación
- [ ] Implementar endpoint de recepción
- [ ] Crear tablas en Supabase
- [ ] Testing con Lead Ads Testing Tool

**Entregable:** Webhook recibe y logea leads de prueba

### Fase 2: Procesamiento de Leads (Semana 2)

**Objetivo:** Leads llegan a tabla `leads`

- [ ] Implementar fetch de Graph API
- [ ] Crear función de mapeo
- [ ] Inserción en tabla `leads`
- [ ] Configurar Lead Access Manager
- [ ] Testing con formulario real

**Entregable:** Leads de prueba aparecen en Dashboard

### Fase 3: Configuración de Formularios (Semana 3)

**Objetivo:** UI para gestionar formularios Meta

- [ ] Crear página de configuración
- [ ] Listar formularios activos
- [ ] Asignar formulario a proyecto
- [ ] Configurar mapeo de campos custom
- [ ] Testing con múltiples proyectos

**Entregable:** Cada formulario Meta puede asociarse a un proyecto

### Fase 4: App Review y Producción (Semana 4)

**Objetivo:** En producción con permisos completos

- [ ] Preparar documentación para App Review
- [ ] Grabar videos screencast
- [ ] Enviar solicitud de permisos
- [ ] Obtener System User token
- [ ] Deploy a producción
- [ ] Monitoreo 24h

**Entregable:** Sistema en producción recibiendo leads reales

### Fase 5: Optimización (Futuro)

**Objetivo:** Mejorar calidad y costos

- [ ] Implementar Conversions API
- [ ] Enviar eventos de conversión
- [ ] Monitorear EMQ (Event Match Quality)
- [ ] Optimizar campañas con datos de calidad
- [ ] Dashboard de métricas Meta

**Entregable:** Costo por lead calificado reducido

---

## 14. ERRORES COMUNES Y SOLUCIONES

| Error | Causa | Solución |
|-------|-------|----------|
| **"CRM access revoked"** | Falta Lead Access | Business Settings > Integrations > Lead Access, asignar app |
| **403 Forbidden** | Token sin permisos | Verificar scopes del token, renovar si es necesario |
| **Webhook no recibe** | App en Development | Cambiar app a Live mode en Settings |
| **Leads vacíos** | Sin `leads_retrieval` | Solicitar permiso en App Review |
| **Rate limit 429** | Muchas requests | Implementar backoff, usar Page tokens (no User) |
| **Firma inválida** | App Secret incorrecto | Verificar `META_APP_SECRET` en .env |
| **Webhook timeout** | Procesamiento lento | Responder inmediatamente, procesar en background |
| **Lead not found** | Token de página incorrecta | Verificar que el token sea de la página correcta |
| **No data returned** | Permisos insuficientes | Verificar que el token tenga todos los scopes |

### Debugging Checklist

Cuando algo no funciona:

1. [ ] Verificar que el webhook esté suscrito (Meta Developers > Webhooks)
2. [ ] Revisar logs de `meta_webhook_logs` en Supabase
3. [ ] Probar con Lead Ads Testing Tool
4. [ ] Verificar que Lead Access esté configurado correctamente
5. [ ] Usar Graph API Explorer para probar el token manualmente
6. [ ] Revisar logs de Vercel para ver requests entrantes
7. [ ] Verificar que la app esté en Live mode (no Development)

---

## 15. RECURSOS Y DOCUMENTACIÓN OFICIAL

### Documentación Meta

- [Lead Ads Guide](https://developers.facebook.com/docs/marketing-api/guides/lead-ads) - Guía oficial completa
- [Retrieving Lead Ads](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving) - Cómo obtener leads
- [Webhooks Reference](https://developers.facebook.com/docs/graph-api/webhooks) - Configuración de webhooks
- [Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api) - Optimización de calidad
- [Graph API Changelog](https://developers.facebook.com/docs/graph-api/changelog) - Cambios y deprecations

### Herramientas

- [Graph API Explorer](https://developers.facebook.com/tools/explorer) - Probar queries
- [Lead Ads Testing](https://developers.facebook.com/tools/lead-ads-testing) - Crear leads de prueba
- [Meta Events Manager](https://business.facebook.com/events_manager2) - Monitorear conversiones
- [Meta Business Suite](https://business.facebook.com) - Gestión general

### Comunidad y Soporte

- [Meta for Developers Community](https://developers.facebook.com/community/)
- [Stack Overflow - facebook-graph-api](https://stackoverflow.com/questions/tagged/facebook-graph-api)
- [n8n Community - Facebook Lead Ads](https://community.n8n.io/t/how-to-setup-facebook-trigger-fb-app-for-lead-forms/14317)

---

## 16. COSTOS Y LÍMITES

### Rate Limits

**Standard Access Tier:**
- ~200 llamadas/hora por app
- Basado en número de usuarios de la app

**Advanced Access Tier:**
- ~4800 llamadas/hora
- Requiere App Review aprobado

### Costos

**Integración:**
- Gratis (no hay costo por usar la API)

**Ads:**
- Costo por lead varía según:
  - Targeting
  - Competencia en el mercado
  - Calidad del anuncio
  - Optimización (CAPI puede reducir ~19%)

**Infraestructura:**
- Vercel: Gratis en hobby tier (suficiente para webhook)
- Supabase: Gratis en tier free (hasta 500MB DB)

---

## 17. PRÓXIMOS PASOS

### Inmediato

1. Crear Facebook App en developers.facebook.com
2. Configurar productos (Webhooks, Login)
3. Implementar endpoint de webhook (verificación)
4. Testing con Lead Ads Testing Tool

### Corto Plazo

1. Solicitar permisos en App Review
2. Configurar Lead Access Manager
3. Implementar procesamiento de leads
4. Deploy a producción

### Mediano Plazo

1. Configurar UI para gestionar formularios
2. Implementar Conversions API
3. Optimizar campañas con datos de calidad
4. Dashboard de métricas Meta

---

## 18. PREGUNTAS FRECUENTES

### ¿Puedo probar sin App Review?

Sí, en modo Development puedes:
- Crear leads de prueba con Lead Ads Testing Tool
- Acceder a leads de formularios en páginas que administras
- Probar el webhook completo

**Limitación:** No puedes acceder a leads reales de usuarios hasta App Review.

### ¿Cuánto tarda el App Review?

**Típicamente:** 3-7 días hábiles

**Factores que aceleran:**
- Video screencast claro y completo
- Explicación detallada del uso
- Business verificado
- Privacy Policy completa

### ¿Funciona igual para Instagram?

Sí, Instagram Lead Ads usan la misma API y el mismo flujo. La única diferencia es el valor en `platform` que Meta envía.

### ¿Qué pasa si el webhook falla?

Meta reintenta con exponential backoff:
- Reintento 1: Inmediato
- Reintento 2: 15 segundos
- Reintento 3: 1 minuto
- Reintento 4: 5 minutos
- etc.

**Importante:** Después de varios fallos, Meta puede desactivar tu webhook.

### ¿Puedo obtener leads históricos?

Sí, usando el endpoint manual:
```
GET /{form_id}/leads?access_token=...
```

**Limitación:** Meta solo retiene leads por **90 días**.

---

## 19. CHECKLIST DE LANZAMIENTO

Antes de poner en producción, verificar:

### Configuración Meta

- [ ] Facebook App creada y configurada
- [ ] Webhooks configurados y verificados
- [ ] Lead Access Manager configurado
- [ ] Page Access Token obtenido (long-lived o System User)
- [ ] App Review aprobado (permisos production)
- [ ] App en Live mode

### Configuración Dashboard

- [ ] Endpoint webhook implementado (GET + POST)
- [ ] Verificación de firma funcionando
- [ ] Tablas en Supabase creadas
- [ ] Variables de entorno en Vercel
- [ ] Función de mapeo de campos
- [ ] Logging completo
- [ ] Manejo de errores

### Testing

- [ ] Webhook recibe notificaciones
- [ ] Firma verificada correctamente
- [ ] Lead de prueba se guarda en DB
- [ ] Mapeo de campos correcto
- [ ] Errores se registran en logs
- [ ] Response time < 5 segundos

### Monitoreo

- [ ] Dashboard de logs accesible
- [ ] Alertas configuradas
- [ ] Acceso a Meta Events Manager
- [ ] Proceso de rollback definido

---

## CONCLUSIÓN

La integración de Meta Lead Ads con tu Dashboard de EcoPlaza es **totalmente viable** y te dará control completo sobre tus leads desde el momento en que un cliente potencial completa el formulario.

**Tiempo estimado:** 4 semanas (incluyendo App Review)

**Complejidad:** Media (requiere conocimientos de webhooks y APIs)

**ROI:** Alto (eliminación de intermediarios, datos en tiempo real, optimización de campañas)

**Próximo paso recomendado:** Crear la Facebook App y configurar el webhook de verificación para empezar a probar.

---

**Documentado por:** meta-ads-specialist
**Fecha:** 09 Enero 2026
**Versión:** 1.0

**Referencias:**
- [Facebook Lead Ads Webhook](https://docs.tonkean.com/en/data-sources/connect-native-data-sources/facebook-lead-ads-webhook.html)
- [Facebook Lead Ads Integration Ultimate Guide](https://leadsync.me/blog/facebook-lead-ads-integration-ultimate-guide/)
- [Facebook Lead Generation API: Developer's Guide](https://leadsync.me/blog/meta-lead-gen-api-guide/)
- [Receiving Facebook Leads on a Webhook](https://gist.github.com/tixastronauta/0b9c3b409a7ba96edffc)
- [Meta Conversions API Setup Guide](https://adsuploader.com/blog/meta-conversions-api)
- [Meta Graph API v21.0 Release](https://ppc.land/meta-releases-graph-api-v21-0-and-marketing-api-v21-0/)
- [Meta Graph API v22.0 Launch](https://web.swipeinsight.app/posts/facebook-launches-graph-api-v22-0-and-marketing-api-v22-0-for-developers-14179)
