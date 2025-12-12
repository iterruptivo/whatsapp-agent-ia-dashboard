# Meta Lead Ads Integration

**Estado:** 📋 PENDIENTE DE IMPLEMENTACIÓN
**Última actualización:** 12 Diciembre 2025 (Sesión 68)
**Tiempo estimado:** 2-3 horas
**Bloqueante:** App Review de Meta (1-5 días)

---

## Contexto del Negocio

EcoPlaza utiliza campañas de **Meta Lead Generation** (Facebook/Instagram) para capturar leads interesados en proyectos inmobiliarios. Actualmente estos leads se exportan manualmente desde Meta Business Suite y se importan al dashboard.

**Objetivo:** Automatizar la captura de leads desde Meta directamente al dashboard, eliminando el proceso manual.

---

## Cómo Funcionan las Campañas de Generación de Leads de Meta

```
┌─────────────────────────────────────────────────────────────────┐
│                     META LEAD GENERATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Usuario ve anuncio en Facebook/Instagram                    │
│  2. Click en "Más información" o CTA                            │
│  3. Se abre formulario NATIVO de Meta (no redirige)             │
│  4. Datos pre-llenados del perfil (nombre, email, teléfono)     │
│  5. Usuario completa y envía                                    │
│  6. Lead se almacena en Meta Business Suite                     │
│                                                                 │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐            │
│  │  Anuncio   │ -> │ Formulario │ -> │   Lead     │            │
│  │   en IG    │    │  Nativo    │    │ Capturado  │            │
│  └────────────┘    └────────────┘    └────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Solución Propuesta: n8n + Facebook Lead Ads Trigger

### Por qué n8n

| Criterio | Webhook Propio | n8n (Elegido) |
|----------|----------------|---------------|
| Tiempo de implementación | 8-12 hrs | 2-3 hrs |
| Complejidad técnica | Alta | Baja |
| Infraestructura adicional | Servidor dedicado | Ya tenemos n8n |
| Mantenimiento | Alto | Bajo (abstracción) |
| Escalabilidad | Total control | Suficiente para volumen actual |
| Manejo de OAuth | Manual | Automático |
| Retry en fallos | Implementar | Built-in |

### Flujo de Integración

```
┌─────────────┐    ┌───────────────────┐    ┌─────────────┐    ┌────────────┐
│  Meta Lead  │ -> │ n8n Facebook Lead │ -> │ HTTP Request│ -> │ Dashboard  │
│  Ad Submit  │    │   Ads Trigger     │    │   Node      │    │   API      │
└─────────────┘    └───────────────────┘    └─────────────┘    └────────────┘
                           │                       │
                           v                       v
                   ┌───────────────┐       ┌────────────────┐
                   │ Extraer datos │       │ POST /api/     │
                   │ nombre, email │       │ leads/meta     │
                   │ telefono, etc │       │                │
                   └───────────────┘       └────────────────┘
```

---

## Requisitos Previos

### 1. Facebook App en Meta for Developers

**URL:** https://developers.facebook.com/apps/

**Pasos:**
1. Ir a Meta for Developers
2. Crear nueva app tipo "Business"
3. Agregar producto "Webhooks"
4. Agregar producto "Facebook Login"
5. Configurar permisos

### 2. Permisos Requeridos

| Permiso | Descripción | Requiere Review |
|---------|-------------|-----------------|
| `leads_retrieval` | Leer leads de formularios | ✅ Sí |
| `pages_manage_ads` | Acceso a campañas | ✅ Sí |
| `pages_read_engagement` | Leer datos de página | ✅ Sí |

### 3. App Review de Meta

**Proceso:**
1. Completar información de la app
2. Proporcionar instrucciones de uso
3. Grabar video demostrativo (screencast)
4. Enviar para review

**Tiempo:** 1-5 días hábiles

**Tips para aprobación:**
- Explicar claramente el uso de datos
- Mostrar flujo completo de integración
- Demostrar cumplimiento de privacidad

---

## Implementación Paso a Paso

### Paso 1: Configurar Facebook App (Pre-requisito)

```
Meta for Developers → Create App → Business
                    → Add Product: Webhooks
                    → Add Product: Facebook Login
                    → Request Permissions: leads_retrieval, pages_manage_ads
                    → Submit for App Review
```

### Paso 2: Configurar n8n

**Nodo:** Facebook Lead Ads Trigger

**Configuración:**
```json
{
  "node": "Facebook Lead Ads Trigger",
  "parameters": {
    "pageId": "{{PAGE_ID_ECOPLAZA}}",
    "formId": "{{FORM_ID_CAMPANA}}"
  },
  "credentials": {
    "facebookLeadAdsOAuth2Api": {
      "accessToken": "{{APP_ACCESS_TOKEN}}",
      "appId": "{{APP_ID}}",
      "appSecret": "{{APP_SECRET}}"
    }
  }
}
```

### Paso 3: Crear Endpoint en Dashboard

**Archivo:** `app/api/leads/meta/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface MetaLeadPayload {
  lead_id: string;
  page_id: string;
  form_id: string;
  field_data: {
    name: string;
    values: string[];
  }[];
  created_time: string;
}

export async function POST(request: NextRequest) {
  try {
    // Validar API key o token
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.META_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: MetaLeadPayload = await request.json();

    // Extraer campos del formulario
    const getFieldValue = (name: string): string => {
      const field = payload.field_data.find(f => f.name === name);
      return field?.values[0] || '';
    };

    const leadData = {
      nombre: getFieldValue('full_name') || getFieldValue('first_name'),
      telefono: limpiarTelefono(getFieldValue('phone_number')),
      email: getFieldValue('email'),
      utm_source: 'meta_lead_ads',
      utm_campaign: payload.form_id,
      proyecto_id: mapFormToProject(payload.form_id), // Función a implementar
      meta_lead_id: payload.lead_id,
    };

    // Insertar en Supabase
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (error) {
      console.error('Error insertando lead de Meta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lead_id: data.id,
      message: 'Lead capturado desde Meta'
    });

  } catch (error) {
    console.error('Error procesando webhook Meta:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function limpiarTelefono(telefono: string): string {
  // Remover caracteres no numéricos
  let limpio = telefono.replace(/\D/g, '');

  // Agregar prefijo 51 si es número peruano de 9 dígitos
  if (limpio.length === 9 && limpio.startsWith('9')) {
    limpio = '51' + limpio;
  }

  return limpio;
}

function mapFormToProject(formId: string): string {
  // Mapear form_id de Meta a proyecto_id de Supabase
  const mapping: Record<string, string> = {
    'FORM_ID_TRAPICHE': 'uuid-proyecto-trapiche',
    'FORM_ID_CALLAO': 'uuid-proyecto-callao',
    // Agregar más mappings según se creen formularios
  };

  return mapping[formId] || 'uuid-proyecto-default';
}
```

### Paso 4: Configurar Flujo n8n

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO N8N META LEADS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Facebook Lead Ads Trigger                               │
│     └─ Detecta nuevo lead en formulario                     │
│                                                             │
│  2. Set Node (Preparar datos)                               │
│     └─ Mapear campos del formulario                         │
│                                                             │
│  3. HTTP Request                                            │
│     └─ POST https://dashboard.ecoplaza.com/api/leads/meta   │
│     └─ Headers: Authorization: Bearer {{SECRET}}            │
│     └─ Body: JSON con datos del lead                        │
│                                                             │
│  4. IF Node (Verificar respuesta)                           │
│     ├─ Success → Log success                                │
│     └─ Error → Slack notification (opcional)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Campos del Formulario de Meta

### Campos Estándar Disponibles

| Campo Meta | Mapeo Dashboard | Pre-llenado |
|------------|-----------------|-------------|
| `full_name` | `nombre` | Sí (perfil) |
| `first_name` | `nombre` | Sí (perfil) |
| `last_name` | - | Sí (perfil) |
| `email` | `email` | Sí (perfil) |
| `phone_number` | `telefono` | Sí (perfil) |
| `city` | - | Sí (perfil) |
| `country` | - | Sí (perfil) |

### Campos Personalizados (Crear en Meta)

| Campo Custom | Uso Sugerido |
|--------------|--------------|
| `proyecto_interes` | Seleccionar proyecto específico |
| `rango_presupuesto` | Calificar lead |
| `tipo_inmueble` | Local, departamento, etc. |

---

## Variables de Entorno Requeridas

```env
# Meta Integration
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_WEBHOOK_SECRET=random_secure_string_for_api_auth
```

---

## Testing

### 1. Test Manual con cURL

```bash
curl -X POST https://dashboard.ecoplaza.com/api/leads/meta \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $META_WEBHOOK_SECRET" \
  -d '{
    "lead_id": "test_123",
    "page_id": "page_123",
    "form_id": "form_123",
    "field_data": [
      {"name": "full_name", "values": ["Juan Pérez"]},
      {"name": "phone_number", "values": ["987654321"]},
      {"name": "email", "values": ["juan@test.com"]}
    ],
    "created_time": "2025-12-12T10:00:00Z"
  }'
```

### 2. Test desde n8n

1. Crear flujo de prueba con Manual Trigger
2. Set node con datos simulados
3. HTTP Request al endpoint
4. Verificar lead en dashboard

### 3. Test End-to-End

1. Crear formulario de prueba en Meta
2. Configurar trigger en n8n
3. Llenar formulario como usuario
4. Verificar lead aparece en dashboard

---

## Consideraciones de Seguridad

1. **Token secreto para API**
   - Nunca exponer en frontend
   - Rotar periódicamente

2. **Validación de origen**
   - Verificar que requests vienen de n8n IP conocida
   - O usar firma HMAC

3. **Rate limiting**
   - Implementar throttling en endpoint
   - Prevenir abuse

4. **Datos sensibles**
   - No loggear información personal completa
   - Cumplir con políticas de privacidad de Meta

---

## Troubleshooting

### Lead no aparece en dashboard

1. Verificar logs de n8n
2. Verificar endpoint API está respondiendo
3. Verificar token de autorización
4. Revisar Supabase logs

### Error "Permission Denied" en Meta

1. Verificar permisos de app
2. Verificar token no ha expirado
3. Re-autorizar app si necesario

### Campos vacíos en lead

1. Verificar mapeo de campos en n8n
2. Verificar nombres de campos en formulario Meta
3. Algunos campos pueden no estar pre-llenados si usuario no los tiene en perfil

---

## Checklist de Implementación

- [ ] **Pre-requisitos**
  - [ ] Crear Facebook App en Meta for Developers
  - [ ] Solicitar permisos (leads_retrieval, pages_manage_ads)
  - [ ] Pasar App Review de Meta (1-5 días)

- [ ] **Dashboard**
  - [ ] Crear endpoint `/api/leads/meta`
  - [ ] Agregar campo `meta_lead_id` a tabla leads (opcional, para deduplicación)
  - [ ] Configurar variables de entorno
  - [ ] Deploy a staging

- [ ] **n8n**
  - [ ] Conectar credenciales de Facebook
  - [ ] Crear flujo con Facebook Lead Ads Trigger
  - [ ] Configurar HTTP Request a endpoint
  - [ ] Activar flujo

- [ ] **Testing**
  - [ ] Test con cURL
  - [ ] Test desde n8n
  - [ ] Test end-to-end con formulario real

---

## Referencias

- [Meta Lead Ads API](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/)
- [n8n Facebook Lead Ads Trigger](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.facebookleadadstrigger/)
- [Meta App Review Process](https://developers.facebook.com/docs/app-review/)

---

**Última actualización:** 12 Diciembre 2025
**Autor:** Claude Code (Sesión 68)
