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

**Ultima Actualizacion:** 01 Enero 2026
**Sesion:** 79 - FASE 7 completada (Contratos Flexibles). Solo queda FASE 8 (Facturacion) para el futuro.
