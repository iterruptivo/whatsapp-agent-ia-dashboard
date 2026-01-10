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

## INVESTIGACIÓN: IA CONVERSACIONAL PARA DATOS ✅ COMPLETADO

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

## INVESTIGACIÓN: COMBOBOX/AUTOCOMPLETE FILTROS 2026 ✅ COMPLETADO

**Objetivo:** Investigar mejores prácticas para filtros con autocomplete/combobox en dashboard, especialmente para filtro UTM/Origen con 23+ opciones.

**Investigación completada:**
- [x] Mejores librerías React 2026 (shadcn/ui, React Aria, Headless UI, cmdk)
- [x] Patrones UX de dashboards clase mundial (Linear, Stripe, Notion, Vercel)
- [x] Chips/tags para multi-select y visual feedback
- [x] Accesibilidad (ARIA patterns, keyboard navigation, WCAG 2.1)
- [x] Performance con 1000+ opciones (virtualización)
- [x] Integración con Next.js 15 Server Components

**Reporte generado:**
- 📄 `docs/research/COMBOBOX_AUTOCOMPLETE_FILTROS_2026.md` (reporte completo de 800+ líneas)

**Hallazgos clave:**
1. **shadcn/ui Combobox** - Recomendación principal (composición de Popover + cmdk)
2. **cmdk** - Motor de command palette usado por Vercel, 11.7k stars, ultra-rápido
3. **Chips/tags** - Patrón UX 2026 para mostrar filtros activos visualmente
4. **Accesibilidad built-in** - shadcn/ui cumple WCAG 2.1 AA automáticamente
5. **Performance** - cmdk maneja hasta 2,000 items sin virtualización

**Recomendación:**
- **Implementar:** shadcn/ui Combobox para filtro UTM/Origen
- **Agregar:** Chips/tags para mostrar filtros activos
- **Mejoras UX:** Count badge "3 filtros activos" + "Clear all" button
- **Tiempo estimado:** 2.5 horas total (instalación + componente + integración + testing)

**Próximos pasos:**
- [ ] Instalar shadcn/ui components (popover, command) - 10 min
- [ ] Crear `UtmFilterCombobox` component - 30 min
- [ ] Integrar en `LeadsClient`/`OperativoClient` - 20 min
- [ ] Agregar chips para filtros activos - 20 min
- [ ] Testing funcional (keyboard, screen reader) - 30 min
- [ ] Ajustes de estilo y UX - 20 min
- [ ] Deploy y verificación - 10 min

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

**Ultima Actualizacion:** 10 Enero 2026
**Sesion:** 85 - Investigación Combobox/Autocomplete Filtros 2026 completada. Reporte en docs/research/COMBOBOX_AUTOCOMPLETE_FILTROS_2026.md
