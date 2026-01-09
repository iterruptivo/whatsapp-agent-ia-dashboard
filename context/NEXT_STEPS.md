# NEXT_STEPS - EcoPlaza Dashboard

> Proximas acciones a ejecutar. Actualizar al cerrar cada sesion.

---

## PROYECTO ACTIVO: Procesos Contabilidad-Finanzas-Ventas

**Plan completo:** `docs/planes/PLAN_PROCESOS_FINANZAS_VENTAS_2025.md`

---

## FASE 1: CONSTANCIAS ✅ COMPLETADO

- [x] Templates en `templates/constancias/` y Supabase Storage
- [x] `lib/actions-constancias.ts`
- [x] `components/control-pagos/GenerarConstanciaButton.tsx`
- [x] Botones en PagosPanel para Separacion, Abono, Cancelacion

---

## FASE 2: OCR DOCUMENTOS ✅ COMPLETADO

- [x] `lib/actions-ocr.ts` - GPT-4 Vision para vouchers/DNI/boletas
- [x] `components/shared/DocumentoOCRCard.tsx`
- [x] `components/shared/VoucherOCRUploader.tsx`
- [x] `app/api/ocr/extract/route.ts`
- [x] Integracion en RegistrarAbonoModal (Captura Inteligente)

---

## FASE 3: VALIDACION BANCARIA ✅ COMPLETADO

- [x] `app/validacion-bancaria/page.tsx`
- [x] `lib/actions-validacion-bancaria.ts`
- [x] `components/validacion-bancaria/ImportarEstadoCuentaModal.tsx`
- [x] `components/validacion-bancaria/MatchingPanel.tsx`
- [x] Migracion SQL: config_bancos, importaciones_bancarias, transacciones_bancarias
- [x] 4 bancos configurados: Interbank, BCP, BBVA, Scotiabank
- [x] Exportar a Concard (Excel)
- [x] Sidebar: Finanzas > Validacion Bancaria

---

## FASE 4: PAGOS CONSOLIDADOS ✅ COMPLETADO

- [x] `lib/actions-pagos-consolidados.ts`
- [x] `components/control-pagos/PagoConsolidadoModal.tsx`
- [x] Migracion SQL: `supabase/migrations/20260102_pagos_consolidados.sql`
- [x] Busqueda por DNI o codigo de local
- [x] Auto-distribuir (llena cuotas en orden)
- [x] Validacion: total distribuido = monto voucher
- [x] Boton en Control de Pagos

---

## FASE 5: APROBACION DESCUENTOS ✅ COMPLETADO

- [x] `lib/actions-aprobaciones.ts`
- [x] `components/configuracion/AprobacionesConfigPanel.tsx`
- [x] `components/aprobaciones/AprobacionesPendientesPanel.tsx`
- [x] `app/aprobaciones/page.tsx`
- [x] Webhook n8n para notificaciones WhatsApp
- [x] Sidebar: Finanzas > Aprobaciones
- [x] Migracion SQL ejecutada exitosamente
- [x] Configuracion guardada y probada en Proyecto Pruebas

---

## FASE 6: EXPEDIENTE DIGITAL ✅ COMPLETADO

- [x] `lib/actions-expediente.ts` - Server actions para timeline
- [x] `components/control-pagos/ExpedienteDigitalPanel.tsx` - Panel modal con Timeline y Checklist
- [x] `lib/pdf-expediente.ts` - Generacion PDF expediente
- [x] Migracion SQL: `expediente_eventos` + columnas en `control_pagos`
- [x] Vista Timeline cronologico con eventos
- [x] Checklist de documentos (7 tipos)
- [x] Descarga PDF expediente completo
- [x] Integracion en PagosPanel (boton "Expediente")

---

## FASE 7: CONTRATOS FLEXIBLES ✅ COMPLETADO

- [x] Nuevo `components/control-pagos/GenerarContratoModal.tsx`
- [x] Opcion template proyecto (recomendado) vs personalizado (upload .docx)
- [x] Boton "Descargar para revisar" template del proyecto
- [x] Preview de datos del contrato
- [x] Tipo de cambio configurable
- [x] Migracion SQL: columnas en control_pagos para tracking
- [x] Modificado `lib/actions-contratos.ts` para soportar custom templates
- [x] Integrado en ControlPagosClient.tsx (boton "Contrato" abre modal)

---

## FASE 8: FACTURACION ELECTRONICA (Futuro)

- [ ] Esperar API key de NubeFact o proveedor elegido
- [ ] Integracion cuando este disponible

---

## NUEVO: INVESTIGACIÓN IA CONVERSACIONAL PARA DATOS ✅ COMPLETADO

**Objetivo:** Investigar mejores soluciones para módulo de IA que permita queries en lenguaje natural sobre PostgreSQL/Supabase.

**Investigación completada:**
- [x] Investigar plataformas SaaS (ThoughtSpot, Databricks, Vanna AI, Power BI, Looker)
- [x] Investigar frameworks open source (LangChain, LlamaIndex, Supabase AI)
- [x] Investigar tutoriales y guías 2026
- [x] Identificar tendencias (Agentic BI, Multi-modal, Auto-chart generation)
- [x] Casos de éxito relevantes

**Reporte generado:**
- 📄 `docs/research/IA_Conversacional_Datos_2026.md` (reporte completo de 600+ líneas)

**Hallazgos clave:**
1. **Supabase AI Assistant** - Gratis, ya integrado, disponible NOW (quick win)
2. **LangChain SQL Agent** - Recomendación principal para implementación custom
3. **Costo-efectivo:** $60-120/mes vs $15K/año de enterprise tools
4. **Casos de éxito:** 70% reducción de codebase con LangChain + FastAPI
5. **Tendencia 2026:** Agentic BI (agentes autónomos) + Multi-modal (charts automáticos)

**Recomendación:**
- **FASE 1 (Quick Win):** Usar Supabase AI Assistant para equipo interno - Gratis, 4-6 horas
- **FASE 2 (MVP):** LangChain SQL Agent + FastAPI + Next.js - $30/mes, 20-30 horas
- **FASE 3 (Production):** Multi-modal (charts, narrativas, reports) - $60-120/mes, 40-60 horas

**Próximos pasos:**
- [ ] Validar con stakeholders (Heyse/Dr. Luis) - Mostrar reporte, confirmar casos de uso
- [ ] Aprobar budget (~$60-120/mes recurring)
- [ ] Implementar FASE 1 (Supabase AI) - Training session con gerencia/finanzas
- [ ] Prototipar FASE 2 (LangChain MVP) - FastAPI + Next.js chat interface

---

## Otras Tareas Pendientes (Prioridad Baja)

### Swagger UI
- [ ] Agregar variables en Vercel: SWAGGER_USERNAME, SWAGGER_PASSWORD
- [ ] Verificar acceso en produccion

### Mejoras Futuras
- [ ] Analytics de conversion
- [ ] Dashboard morosidad
- [ ] Exportar comisiones a PDF/Excel

---

## Notas Importantes

- **Regla de Proyecto:** TODO se filtra por proyecto seleccionado en login
- **Testing:** Siempre usar PROYECTO PRUEBAS
- **Commits:** NO incluir "Generated with Claude Code" ni "Co-Authored-By"
- **docx-templates:** Comandos {IF}/{FOR} SOLOS en su parrafo, ENTER para nuevo parrafo

---

**Ultima Actualizacion:** 8 Enero 2026
**Sesion:** 84 - Investigación IA Conversacional completada. Reporte en docs/research/IA_Conversacional_Datos_2026.md
