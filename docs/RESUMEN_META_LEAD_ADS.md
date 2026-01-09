# RESUMEN EJECUTIVO - Integración Meta Lead Ads

> Vista rápida del plan completo de integración Facebook/Instagram Lead Ads

**Documento completo:** `docs/planes/PLAN_INTEGRACION_META_LEAD_ADS_2026.md`

---

## ¿QUÉ ES?

Integrar Facebook/Instagram Lead Ads directamente con el Dashboard de EcoPlaza para capturar leads sin depender de Esperance CRM u otros intermediarios.

---

## FLUJO ACTUAL VS NUEVO

### Actual
```
Facebook/Instagram Ad → Lead Form → Esperance CRM → (no llega al Dashboard)
```

### Nuevo
```
Facebook/Instagram Ad → Lead Form → Webhook → Dashboard → Supabase
```

**Tiempo:** Menos de 5 segundos en tiempo real

---

## ¿QUÉ SE NECESITA?

### Del lado de Meta

1. **Facebook Business Manager** (ya lo tienes)
2. **Facebook App** (crear en developers.facebook.com)
3. **Permisos** (App Review):
   - `leads_retrieval`
   - `pages_manage_ads`
   - `pages_read_engagement`
4. **Lead Access Manager** configurado
5. **Page Access Token** (token permanente)

### Del lado del Dashboard

1. **Webhook endpoint:** `app/api/meta/webhook/route.ts`
   - GET: Verificación de Meta
   - POST: Recibir leads
2. **Tablas en Supabase:**
   - `meta_lead_forms` (configuración)
   - `meta_webhook_logs` (debugging)
   - Agregar campos a `leads` (meta_leadgen_id, etc.)
3. **Variables de entorno:**
   ```env
   META_APP_ID=...
   META_APP_SECRET=...
   META_VERIFY_TOKEN=...
   META_PAGE_ACCESS_TOKEN=...
   ```

---

## CÓMO FUNCIONA

### 1. Usuario completa formulario en Facebook/Instagram

### 2. Meta envía webhook a tu endpoint
```json
{
  "leadgen_id": "987654321",
  "form_id": "456789123",
  "page_id": "123456789"
}
```

### 3. Tu endpoint:
- Verifica la firma (seguridad)
- Responde inmediatamente (< 5 seg)
- Procesa en background

### 4. Fetch de datos desde Graph API
```
GET https://graph.facebook.com/v22.0/{leadgen_id}
```

### 5. Mapeo de campos
```
full_name     → nombre
email         → email
phone_number  → telefono
custom_fields → notas
```

### 6. Inserción en tabla `leads`
```sql
INSERT INTO leads (
  nombre, email, telefono,
  proyecto_id, origen, canal,
  meta_leadgen_id, meta_form_id
) VALUES (...)
```

---

## DATOS QUE RECIBES

Meta envía campos estándar:
- Nombre completo
- Email
- Teléfono
- Ciudad, región, país
- Código postal

Campos personalizados:
- Cualquier pregunta que agregues en el formulario

---

## CONFIGURACIÓN EN META

### 1. Crear Facebook App
- Ir a developers.facebook.com
- Crear App tipo "Business"
- Agregar productos: Webhooks, Facebook Login

### 2. Configurar Webhooks
- Callback URL: `https://tu-dominio.vercel.app/api/meta/webhook`
- Verify Token: Un string secreto que tú defines
- Suscribirse a: `page` → campo `leadgen`

### 3. Lead Access Manager
- Business Settings > Integrations > Lead Access
- Asignar tu app como CRM
- Asignar personas con acceso

### 4. App Review (3-7 días)
- Solicitar permisos production
- Enviar video screencast
- Explicar uso de cada permiso

---

## ROADMAP

### Semana 1: Setup y Testing
- Crear Facebook App
- Implementar webhook
- Testing con leads de prueba

### Semana 2: Procesamiento
- Fetch desde Graph API
- Mapeo de campos
- Inserción en BD

### Semana 3: Configuración
- UI para gestionar formularios
- Asignar formulario → proyecto
- Mapeo de campos custom

### Semana 4: Producción
- App Review
- Deploy a producción
- Monitoreo 24h

---

## SEGURIDAD

### Verificación de Firma (CRÍTICO)
```typescript
const signature = request.headers.get('x-hub-signature-256');
if (!verifySignature(body, signature, META_APP_SECRET)) {
  return 403; // Rechazar
}
```

**NUNCA** procesar un webhook sin verificar la firma.

### Protección de Tokens
- Variables de entorno en Vercel
- NUNCA exponer en frontend
- System User para tokens permanentes

---

## MONITOREO

### Logs en Supabase
- Todos los webhooks en `meta_webhook_logs`
- Leads procesados vs pendientes
- Errores con stack trace

### Dashboard
- Webhooks recibidos últimas 24h
- Tasa de éxito/error
- Formularios más activos

### Alertas
- Tasa de error > 5%
- Sin webhooks en 1 hora
- Firma inválida (posible ataque)

---

## ERRORES COMUNES

| Error | Solución |
|-------|----------|
| "CRM access revoked" | Configurar Lead Access Manager |
| 403 Forbidden | Verificar permisos del token |
| Webhook no recibe | App en Live mode, no Development |
| Leads vacíos | Solicitar `leads_retrieval` en App Review |
| Rate limit 429 | Usar Page tokens, implementar backoff |

---

## COSTOS

### API
- **Gratis** (no hay costo por usar la API de Meta)

### Infraestructura
- **Vercel:** Gratis (hobby tier suficiente)
- **Supabase:** Gratis (free tier suficiente)

### Ads
- Costo por lead según targeting y competencia
- CAPI puede reducir costo ~19%

---

## CONVERSIONS API (FASE 2)

Enviar eventos de conversión a Meta para optimizar:

```typescript
// Cuando un lead se convierte en venta
POST /api/meta/conversions
{
  "event_name": "Purchase",
  "leadgen_id": "...",
  "value": 50000,
  "currency": "PEN"
}
```

**Beneficio:** Meta aprende qué leads convierten y optimiza el targeting.

**Resultado:** Hasta 19% reducción en costo por lead calificado.

---

## TESTING

### Lead Ads Testing Tool
1. Ir a [Lead Ads Testing](https://developers.facebook.com/tools/lead-ads-testing)
2. Seleccionar tu página
3. Crear lead de prueba
4. Verificar en logs

### Graph API Explorer
1. Ir a [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Probar queries manualmente
3. Verificar permisos del token

---

## CHECKLIST DE LANZAMIENTO

**Meta:**
- [ ] Facebook App creada
- [ ] Webhooks configurados
- [ ] Lead Access Manager configurado
- [ ] Page Access Token obtenido
- [ ] App Review aprobado

**Dashboard:**
- [ ] Endpoint webhook implementado
- [ ] Verificación de firma funcionando
- [ ] Tablas en Supabase
- [ ] Variables de entorno en Vercel
- [ ] Testing completo

---

## PRÓXIMOS PASOS

1. Crear Facebook App en developers.facebook.com
2. Implementar webhook de verificación (GET)
3. Testing con Lead Ads Testing Tool
4. Solicitar App Review
5. Implementar procesamiento de leads (POST)

---

## RECURSOS

### Documentación
- [Plan completo](./planes/PLAN_INTEGRACION_META_LEAD_ADS_2026.md)
- [Meta Lead Ads Guide](https://developers.facebook.com/docs/marketing-api/guides/lead-ads)
- [Webhooks Reference](https://developers.facebook.com/docs/graph-api/webhooks)

### Herramientas
- [Graph API Explorer](https://developers.facebook.com/tools/explorer)
- [Lead Ads Testing](https://developers.facebook.com/tools/lead-ads-testing)
- [Meta Events Manager](https://business.facebook.com/events_manager2)

---

**Tiempo estimado:** 4 semanas (incluyendo App Review)

**Complejidad:** Media

**ROI:** Alto (control total, datos en tiempo real, optimización)

---

**Documentado por:** meta-ads-specialist
**Fecha:** 09 Enero 2026
