# Resumen Ejecutivo: Validación de Recibos de Servicios

**Investigación Urgente Completada:** 13 de enero de 2026
**Solicitante:** Equipo de Desarrollo (Formulario de Corredor)
**Hallazgo Crítico:** El sistema usa tipo="voucher" para documentos que son RECIBOS DE SERVICIOS

---

## PROBLEMA IDENTIFICADO

En el formulario de registro de corredor (módulo expansión), el campo de **comprobante de domicilio** está categorizado como:
- **Tipo:** `voucher`
- **Realidad:** Debería ser `recibo_servicios`

Un **voucher bancario** y un **recibo de servicios** son documentos completamente diferentes.

```
╔════════════════════════════════════════════════════════════╗
║ VOUCHER BANCARIO          │  RECIBO DE SERVICIOS          ║
║ Número de operación       │  Número de suministro         ║
║ Monto de transacción      │  Consumo de energía/agua      ║
║ Banco emisor              │  Empresa de servicios         ║
║ NO comprueba domicilio    │  SÍ comprueba domicilio       ║
║ Uso: Comprobante de pago  │  Uso: Comprobante de pago +   ║
║                           │       Prueba de residencia    ║
╚════════════════════════════════════════════════════════════╝
```

---

## SOLUCIÓN RÁPIDA (1-2 horas)

### Paso 1: Cambiar Tipo de Documento
```
De: tipo="voucher"
A: tipo="recibo_servicios"
   o tipo="comprobante_domicilio"
```

### Paso 2: Actualizar Validaciones
```
Aceptados:
✓ Recibo de Luz (Pluz, Luz del Sur, otros)
✓ Recibo de Agua (SEDAPAL, SEDALIB, SEDAPAR)
✓ Recibo de Gas (Grifógas, Siba)
✓ Recibo de Telefonía (Entel, Movistar, etc.)

Rechazados:
✗ Vouchers bancarios
✗ Boletas de compra
✗ Facturas de servicio técnico
```

### Paso 3: Actualizar OCR
```
Campos a extraer (OBLIGATORIOS):
1. Dirección del suministro → para llenar campo dirección
2. Número de suministro → para auditoría
3. Nombre del titular → para verificación
4. Período de facturación → para validar antigüedad

Validación:
- Documento NO mayor a 60 días
- Dirección DEBE estar presente
- Empresa DEBE ser reconocida
```

---

## CAMPOS CRÍTICOS POR EMPRESA

### RECIBOS DE LUZ - Pluz Energía y Luz del Sur

| Campo | Ubicación | Formato | Usar Para |
|-------|-----------|---------|-----------|
| **Número de Suministro** | Arriba a la derecha | 8-10 dígitos | Validación |
| **Dirección del Suministro** | Encabezado | Texto libre | Llenar formulario |
| **Nombre Titular** | Encabezado | Texto | Validación |
| **Período (MM/AAAA)** | Encabezado | 01/2026 | Validar antigüedad |
| Consumo en kWh | Sección consumo | Número | Opcional |
| Total a Pagar | Resumen | Monto S/. | Verificar validez |

### RECIBOS DE AGUA - SEDAPAL

| Campo | Ubicación | Formato | Usar Para |
|-------|-----------|---------|-----------|
| **Número de Suministro** | Arriba | 6-8 caracteres | Validación |
| **Dirección del Suministro** | Encabezado | Texto libre | Llenar formulario |
| **Nombre Titular** | Encabezado | Texto | Validación |
| **Período (MM/AAAA)** | Encabezado | 01/2026 | Validar antigüedad |
| Lectura Anterior/Actual | Sección consumo | m³ | Opcional |
| Total a Pagar | Resumen | Monto S/. | Verificar validez |

---

## VALIDACIONES RECOMENDADAS

### Obligatorias (rechazar si fallan)
```
✓ Recibo de empresa conocida (Pluz, Luz del Sur, SEDAPAL, etc.)
✓ Contiene número de suministro
✓ Contiene dirección clara (mín 10 caracteres)
✓ Contiene período de facturación
✓ Documento < 60 días de antigüedad
```

### Opcionales (alertar pero permitir)
```
⚠ Nombre del titular no coincide exactamente
⚠ Dirección no tiene distrito
⚠ Total a pagar = 0 (consumo gratis/suspendido)
```

---

## EJEMPLOS DE VALIDACIÓN

### VÁLIDO - Recibo Pluz 2026

```
PLUZ ENERGÍA PERÚ S.A.A.
Número de Suministro: 12345678
Número de Cliente: 654321

SEÑOR(A): Juan Pérez García
Dirección: Av. Primavera 2500 Apto. 201, San Isidro
Período de Facturación: 01/2026

[Resto de información...]

Total a Pagar: S/ 67.89
Fecha de Vencimiento: 20/01/2026

✓ ACEPTADO:
- Empresa conocida (Pluz)
- Número de suministro presente
- Dirección clara y completa
- Período actual (01/2026 vs 13/01/2026 = 13 días)
- Total a pagar válido
```

### INVÁLIDO - Recibo Muy Viejo

```
PLUZ ENERGÍA PERÚ
Número de Suministro: 12345678
Dirección: Av. Principal 123, San Isidro
Período de Facturación: 07/2025

✗ RECHAZADO:
- Período de facturación hace 6 meses (07/2025)
- Antigüedad: 188 días (máximo permitido: 60 días)
- Mensaje: "Recibo muy antiguo. Debe ser de menos de 2 meses"
```

### INVÁLIDO - Tipo Equivocado (Voucher Bancario)

```
BANCO DEL CRÉDITO DEL PERÚ
VOUCHER DE DEPÓSITO
Número de Operación: 987654
Cuenta: 0000123456
Monto Depositado: S/ 500.00
Fecha: 13/01/2026

✗ RECHAZADO:
- Documento es voucher bancario, no recibo de servicios
- Los vouchers NO comprueban domicilio
- No contiene dirección de suministro
- Mensaje: "Por favor usar recibo de luz, agua, gas o telefonía"
```

---

## IMPACTO EN EL FORMULARIO

### Antes (Incorrecto)
```
[Campo]: Comprobante de Domicilio
[Tipo Aceptado]: Voucher bancario
[Resultado]: Acepta documentos equivocados
             Rechaza recibos válidos
```

### Después (Correcto)
```
[Campo]: Comprobante de Domicilio
[Tipo Aceptado]: Recibo de Servicios
[Servicios]: Luz, Agua, Gas, Telefonía
[Validaciones]:
  - Empresa conocida
  - Dirección presente
  - < 60 días antigüedad
  - Número de suministro
[Resultado]: Acepta SOLO documentos válidos
             Mayor seguridad en validación
```

---

## EMPRESAS ACEPTADAS

### Electricidad
- Pluz Energía (antes ENEL) - Lima, Arequipa, Moquegua, Tacna
- Luz del Sur - Lima Sur
- Distriluz - Áreas menores
- Electrocentro - Huancayo
- Otros distribuidoras regionales

### Agua
- SEDAPAL - Lima y Callao
- SEDALIB - Ica, Nazca, otros
- SEDAPAR - Arequipa
- Otros proveedores de agua regional

### Gas (Aceptar también)
- Grifógas
- Siba
- Otros

### Telefonía (Aceptar también)
- Entel
- Movistar
- Claro
- Otros

---

## CHECKLIST DE IMPLEMENTACIÓN

### Desarrollo (2-3 horas)
- [ ] Cambiar tipo de documento en base de datos
- [ ] Actualizar validaciones de OCR
- [ ] Agregar patrones de búsqueda para empresas
- [ ] Implementar validación de antigüedad
- [ ] Actualizar mensajes de error

### Testing (1-2 horas)
- [ ] Crear conjunto de imágenes de prueba
- [ ] Probar extracción con múltiples empresas
- [ ] Probar validación de antigüedad
- [ ] Probar manejo de errores

### Documentación (30 min)
- [ ] Actualizar instrucciones en formulario
- [ ] Crear ejemplos de recibos válidos
- [ ] Publicar guía para usuarios

### Despliegue
- [ ] Desplegar a desarrollo
- [ ] Desplegar a QA
- [ ] Desplegar a producción
- [ ] Monitorear errores

---

## PREGUNTAS FRECUENTES

### P: ¿Por qué cambiar de "voucher" a "recibo servicios"?
R: Porque son documentos diferentes con propósitos distintos. Un voucher bancario prueba que hiciste una transacción, pero NO prueba dónde vives. Un recibo de servicios sí prueba domicilio (es comprobante de residencia oficial en Perú).

### P: ¿Cuánto tiempo debe tener el recibo?
R: Máximo 60 días (2 meses). Si es más viejo, no es válido como comprobante de domicilio en Perú.

### P: ¿Funciona con recibos PDF descargados?
R: Sí, mejor aún. Los PDFs digitales tienen mejor calidad OCR que fotos. Se recomenda permitir ambos formatos.

### P: ¿Qué pasa si el nombre en el recibo no coincide exactamente?
R: Depende. Si está muy diferente, alertar al usuario pero permitir si está razonablemente cerca (ej: "Juan Pérez" vs "J. Pérez García"). Si es completamente diferente, solicitar declaración jurada.

### P: ¿Puedo usar recibos de otros servicios (internet, gas)?
R: Sí, son válidos como comprobante de domicilio. La ley peruana acepta: luz, agua, gas, telefonía e internet.

---

## REFERENCIAS LEGALES

En Perú, para solicitar Certificado de Domicilio (DNI actualizado), la municipalidad acepta:

**Documentos válidos:**
- Recibo de servicios (luz, agua, gas, teléfono, internet)
- Contrato de arrendamiento
- Título de propiedad
- Documento de identidad con domicilio actual

**Requisitos del recibo:**
- Debe mostrar dirección completa
- No debe ser mayor a 2 meses de expedido
- Si no tiene nombre del titular, se requiere Declaración Jurada legalizada

**Fuente:** iPeru.pe, Municipalidades de Lima, RENIEC

---

## PRÓXIMOS PASOS

### Inmediato (Hoy)
1. Informar al equipo de desarrollo sobre el cambio
2. Asignar desarrollador para las correcciones
3. Crear las imágenes de prueba

### Corto Plazo (Esta semana)
1. Implementar cambios
2. Testing con múltiples tipos de recibos
3. Validar que funciona correctamente

### Mediano Plazo (Este mes)
1. Desplegar a QA
2. Capacitar al equipo de QA
3. Desplegar a producción
4. Monitorear errores

---

## DOCUMENTOS GENERADOS

Se ha completado investigación con tres documentos:

1. **RECIBOS_SERVICIOS_PERU_ESTRUCTURA.md** (Completo)
   - Estructura detallada de recibos por empresa
   - Campos específicos de cada proveedor
   - Validaciones recomendadas
   - Comparativa vs vouchers

2. **GUIA_OCR_VALIDACION_RECIBOS.md** (Técnico)
   - Patrones de búsqueda OCR
   - Pseudocódigo de implementación
   - Matriz de campos por empresa
   - Test cases recomendados
   - Casos de error

3. **RESUMEN_EJECUTIVO_RECIBOS.md** (Este documento)
   - Visión rápida del problema
   - Solución en 3 pasos
   - Checklist de implementación
   - FAQ y referencias

---

**Estado:** INVESTIGACIÓN COMPLETADA
**Recomendación:** IMPLEMENTAR INMEDIATAMENTE
**Nivel de Urgencia:** ALTA

Los documentos están listos para que el equipo técnico comience la implementación.

**Investigación realizada por:** Strategic Research Agent
**Validado por:** Análisis de fuentes oficiales (SUNAT, SEDAPAL, Pluz, Luz del Sur)
**Fecha:** 13 de enero de 2026
