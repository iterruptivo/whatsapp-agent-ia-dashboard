# Resumen Ejecutivo - Sistema de Corredores Inmobiliarios EcoPlaza

**Fecha:** 16 Enero 2026
**Documento Completo:** `Formulario_Corredores_Inmobiliarios_Peru_2026.md`

---

## Lectura de 2 Minutos

### Problema
EcoPlaza necesita un sistema para que corredores externos encuentren terrenos aptos para construir mercados comerciales.

### Solución Propuesta
Sistema web con dos componentes:
1. **Registro de Corredores**: Verificación y aprobación de corredores asociados
2. **Envío de Terrenos**: Formulario estructurado para enviar propuestas de terrenos

---

## Campos Esenciales

### Registro de Corredor (10 campos mínimos)
```
✓ Nombre completo
✓ Email
✓ Teléfono/WhatsApp
✓ DNI (8 dígitos)
✓ RUC (opcional, 11 dígitos)
✓ Años de experiencia
✓ ¿Tiene código agente MVCS? (sí/no)
✓ Código agente (si aplica)
✓ Zonas de trabajo
✓ Descripción experiencia
```

### Envío de Terreno (15 campos críticos)
```
UBICACIÓN:
✓ Departamento/Provincia/Distrito
✓ Dirección exacta

CARACTERÍSTICAS:
✓ Área total (m²)
✓ Topografía (plano/pendiente)
✓ Zonificación actual

SERVICIOS:
✓ Agua/Desagüe/Electricidad (checkboxes)
✓ Acceso vehicular (sí/no)

DOCUMENTOS:
✓ Partida registral SUNARP (PDF)
✓ Título de propiedad (PDF)
✓ Fotos del terreno (mín. 5)

PROPIETARIO:
✓ Nombre y DNI/RUC
✓ Teléfono de contacto
✓ Precio solicitado

ANÁLISIS:
✓ Por qué es ideal para mercado (texto)
```

---

## Marco Legal Perú

| Aspecto | Detalle |
|---------|---------|
| **Ley** | Ley N° 29080 - Registro Agente Inmobiliario |
| **Autoridad** | Ministerio de Vivienda (MVCS) |
| **Certificación** | Curso + Código MVCS (opcional para corredores de EcoPlaza) |
| **Verificación** | SUNARP para partidas registrales |
| **Zonificación** | Municipal (CV/CZ/CM para comercial) |

---

## Flujo del Proceso

```
1. CORREDOR SE REGISTRA
   ↓ (2-5 días)

2. ECOPLAZA APRUEBA/RECHAZA
   ↓

3. CORREDOR ENVÍA TERRENO (formulario 5 pasos)
   ↓ (7-15 días)

4. ECOPLAZA EVALÚA
   ↓

5. DECISIÓN: Aprobar/Rechazar/En espera
   ↓

6. SI APROBADO: Negociación con propietario
   ↓

7. SI COMPRADO: Pago de comisión al corredor
```

---

## Mejores Prácticas UX/UI

### DO ✓
- Formulario multi-step (wizard 5 pasos)
- Auto-guardar progreso
- Notificaciones automáticas (email + WhatsApp)
- Dashboard con métricas del corredor
- Mobile-first design
- Validaciones en tiempo real
- Upload drag & drop

### DON'T ✗
- Formulario largo de una sola página
- Pedir información excesiva al inicio
- Sin feedback de estado
- Solo desktop
- Campos sin validación
- Upload complicado

---

## Benchmarks de Industria

### Urbania (Líder Perú)
- **668 agentes** registrados
- **12 años** en el mercado
- **3.2M avisos** publicados
- Modelo: Pago por publicación

### Desarrolladores 2026
- **Solar Inmobiliaria**: US$15M en terrenos
- **Tale Inmobiliaria**: US$15.7M (Q1)
- **Viva Inmobiliaria**: US$18M
- **Cencosud**: US$600M (70% crecimiento)

**Zonas Hot:** Surquillo, Magdalena, Chorrillos, Barranco, San Miguel

---

## KPIs Año 1

| Métrica | Meta |
|---------|------|
| Corredores registrados | 50-100 |
| Tasa aprobación corredores | 60-70% |
| Terrenos recibidos | 100-150 |
| Tasa aprobación terrenos | 10-15% |
| Tiempo evaluación | 7-10 días |
| Conversión a compra | 30-50% |

---

## Implementación

### Cronograma
- **Fase 1** (2 sem): Setup DB + Diseño
- **Fase 2** (4 sem): Desarrollo MVP
- **Fase 3** (2 sem): Integraciones (APIs)
- **Fase 4** (2 sem): Testing
- **Fase 5** (1 sem): Lanzamiento

**Total: 11 semanas (~3 meses)**

### Tecnología Sugerida
- **Frontend**: Next.js + TailwindCSS + shadcn/ui
- **Backend**: Server Actions + Supabase
- **Storage**: Supabase Storage (documentos)
- **Notificaciones**: Resend (email) + Twilio (WhatsApp)
- **Validaciones**: APIs RENIEC/SUNAT/SUNARP

---

## Costos Estimados (Referencia)

| Item | Costo |
|------|-------|
| Desarrollo (11 sem) | Variable |
| APIs validación (RENIEC/SUNAT) | ~S/500/mes |
| Storage documentos | ~S/100/mes |
| Notificaciones (email+SMS) | ~S/300/mes |
| Tasación profesional (externo) | S/500-1,200 c/u |

---

## Recomendaciones Top 3

### 1. Sistema de Niveles
```
Básico: DNI + RUC
Verificado: + Código MVCS
Premium: + Track record
```

### 2. Wizard Multi-Step
- Reduce abandono 40%+
- Mejor UX en móvil
- Auto-guardar progreso

### 3. Notificaciones Automáticas
- Registro aprobado
- Terreno recibido
- Cambio de estado
- Compra concretada

---

## Documentos de Referencia

| Documento | Descripción |
|-----------|-------------|
| `Formulario_Corredores_Inmobiliarios_Peru_2026.md` | Investigación completa (30 páginas) |
| Ley 29080 | Marco legal agentes inmobiliarios |
| Reglamento Nacional Tasaciones | Criterios de valuación |

---

## Contacto

**Documentación preparada por:** Investigación Estratégica EcoPlaza
**Para:** Equipo de Desarrollo Dashboard
**Próxima revisión:** Junio 2026

---

## Quick Start - Checklist de Implementación

```
□ Crear tablas: corredores, terrenos
□ Diseñar wireframes formularios
□ Implementar registro de corredor (wizard 3 pasos)
□ Implementar envío de terreno (wizard 5 pasos)
□ Setup storage documentos (Supabase)
□ Integrar validaciones DNI/RUC
□ Sistema de notificaciones (email)
□ Dashboard corredor
□ Dashboard admin (aprobación)
□ Testing con 5-10 corredores beta
□ Documentación usuario final
□ Lanzamiento y onboarding
```

---

**Documento listo para handoff a equipo de desarrollo.**
