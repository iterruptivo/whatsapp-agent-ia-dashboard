# Quick Reference: Validación de Recibos de Servicios Perú

**Documento de bolsillo para desarrolladores y QA** - Imprime o guarda en teléfono

---

## TRES DATOS CLAVE

```
✓ Cambiar: tipo="voucher"  →  tipo="recibo_servicios"
✓ Máx antigüedad: 60 días
✓ Campos obligatorios: número suministro, dirección, período
```

---

## EMPRESAS ACEPTADAS (COPIAR/PEGAR)

```
ELECTRICIDAD:
- Pluz Energía (antes ENEL)
- Luz del Sur
- Distriluz
- Otros distribuidoras regionales

AGUA:
- SEDAPAL (Lima/Callao)
- SEDALIB
- SEDAPAR
- Otros proveedores regionales

GAS:
- Grifógas
- Siba

TELEFONÍA/INTERNET:
- Entel
- Movistar
- Claro
- Bitel
```

---

## PATRONES RÁPIDOS DE BÚSQUEDA OCR

```
PLUZ/ENEL (Luz):
  Número suministro: "Número de Suministro:" + 8-10 dígitos
  Dirección: "Av.", "Calle", "Jr.", "Pasaje" + número + distrito
  Período: "01/2026" o "01-2026" formato MM/AAAA

LUZ DEL SUR (Luz):
  Número suministro: "Número de Suministro:" + alfanumérico
  Dirección: Similar a Pluz
  Período: MM/AAAA

SEDAPAL (Agua):
  Número suministro: "Número de Suministro:" + 6-8 caracteres
  Dirección: Similar a Pluz
  Período: MM/AAAA
  Consumo: "Lectura Anterior" + "Lectura Actual" = diferencia
```

---

## VALIDACIÓN EN 60 SEGUNDOS

```
1. ¿Imagen clara y legible?
   NO → "Imagen muy borrosa, tomar foto más clara"
   SÍ → Continuar

2. ¿Se ve empresa conocida (Pluz, Luz del Sur, SEDAPAL)?
   NO → "Empresa no reconocida, usar luz, agua, gas o telefonía"
   SÍ → Continuar

3. ¿Tiene número de suministro visible?
   NO → "No se encontró número de suministro"
   SÍ → Continuar

4. ¿Tiene dirección clara (mín 10 caracteres)?
   NO → "Dirección no legible, ingresar manualmente"
   SÍ → Continuar

5. ¿Se ve período de facturación (MM/AAAA)?
   NO → "No se encontró período, ingresar manualmente"
   SÍ → Continuar

6. ¿Período es < 60 días?
   NO → "Recibo muy antiguo, máximo 2 meses"
   SÍ → ✓ ACEPTADO
```

---

## CAMPOS A EXTRAER (ORDEN)

```
PASO 1: Identificar empresa
  Buscar: "Pluz", "ENEL", "Luz del Sur", "SEDAPAL", etc.

PASO 2: Extraer número de suministro
  Ubicación: Generalmente arriba a la derecha
  Guardar: Tal cual, para auditoría

PASO 3: Extraer dirección
  Ubicación: Encabezado del recibo
  Validar: Tenga calle, número, y si es posible distrito
  Usar: Para llenar campo "dirección" del formulario

PASO 4: Extraer período
  Ubicación: Encabezado o sección de datos
  Formato: MM/AAAA (ej: 01/2026)
  Validar: Que sea ≤ 60 días de hoy

PASO 5: Validar antigüedad
  Hoy: 13/01/2026
  Si período = 01/2026: 13 días ✓
  Si período = 11/2025: 63 días ✗
```

---

## ERRORES COMUNES Y SOLUCIONES

| Error | Causa | Solución |
|-------|-------|----------|
| "OCR falla" | Imagen borrosa | Tomar foto nueva, más clara, 300+ DPI |
| "Empresa desconocida" | Recibo antiguo | Usar recibo actual de empresa conocida |
| "No encuentra dirección" | Recibo cortado | Recibo debe estar completo, sin cortes |
| "Período inválido" | Recibo viejo | Debe ser de menos de 60 días |
| "No encuentra suministro" | OCR débil | Ingresar número manualmente |

---

## EJEMPLOS RÁPIDOS

### ✓ VÁLIDO

```
Empresa: Pluz Energía
Suministro: 12345678
Dirección: Av. Primavera 2500 Apto. 201, San Isidro
Período: 01/2026 (13 días atrás)
Total: S/ 67.89

→ ACEPTADO
```

### ✓ VÁLIDO (con alertas)

```
Empresa: SEDAPAL
Suministro: 234567
Dirección: Calle Velasco Astete 456, (sin distrito)
Período: 01/2026
Total: S/ 0.00 (usuario tiene promoción)

→ ACEPTADO (alert: sin distrito)
```

### ✗ INVÁLIDO

```
Empresa: Banco del Crédito
Suministro: 987654 (operación)
Dirección: (NO tiene)
Período: 13/01/2026 (hoy)
Total: S/ 500.00 (depósito)

→ RECHAZADO (es voucher bancario)
```

### ✗ INVÁLIDO

```
Empresa: Pluz Energía
Suministro: 12345678
Dirección: Av. Principal 123
Período: 07/2025 (188 días atrás)
Total: S/ 52.30

→ RECHAZADO (muy antiguo)
```

---

## CÓDIGO MÍNIMO (JavaScript Pseudocódigo)

```javascript
// 1. IDENTIFICAR
const empresa = identifyCompany(ocrText);
if (!['PLUZ', 'LUZ_DEL_SUR', 'SEDAPAL'].includes(empresa)) {
  throw "Empresa no válida";
}

// 2. EXTRAER
const suministro = extractSupply(ocrText, empresa);
const direccion = extractAddress(ocrText);
const periodo = extractPeriod(ocrText); // "01/2026"
if (!suministro || !direccion || !periodo) {
  throw "Campos obligatorios faltantes";
}

// 3. VALIDAR ANTIGÜEDAD
const [mes, año] = periodo.split('/');
const reciboDate = new Date(`${año}-${mes}-01`);
const diasDiferencia = (hoy - reciboDate) / (1000*60*60*24);
if (diasDiferencia > 60) {
  throw `Recibo antiguo: ${diasDiferencia} días`;
}

// 4. RETORNAR
return {
  empresa,
  numeroSuministro: suministro,
  direccion,
  periodo,
  valido: true
};
```

---

## REGEX ÚTILES

```
Detectar Pluz/ENEL:
  /pluz|enel/i

Detectar Luz del Sur:
  /luz del sur/i

Detectar SEDAPAL:
  /sedapal|agua potable/i

Número suministro 8-10 dígitos:
  /\d{8,10}/

Período MM/AAAA:
  /(0[1-9]|1[0-2])\/20\d{2}/

Dirección (patrón simple):
  /(Av\.|Calle|Jr\.|Pasaje)\s+[^,\n]+/i

Monto dinero S/.:
  /S\/\s*(\d+[.,]\d{2})/
```

---

## UBICACIÓN DE CAMPOS EN RECIBO (VISUAL)

```
PARTE SUPERIOR (Encabezado):
┌─────────────────────────────────────┐
│ [Logo Empresa]                      │
│ Nombre Empresa                      │
│ Nº Suministro: XXXXX  Nº Cliente: Y │
│ Dirección: Calle XXXX Nº Y, Distrito
│ Período: MM/AAAA                    │
└─────────────────────────────────────┘

PARTE MEDIA (Detalles):
┌─────────────────────────────────────┐
│ Datos del Suministro                │
│ Lectura Anterior: X                 │
│ Lectura Actual: Y                   │
│ Consumo: Y-X                        │
└─────────────────────────────────────┘

PARTE INFERIOR (Resumen):
┌─────────────────────────────────────┐
│ Total a Pagar: S/ XXX.XX            │
│ Fecha de Vencimiento: DD/MM/AAAA    │
│ [QR CODE opcional]                  │
└─────────────────────────────────────┘

→ EXTRAER DESDE: PARTE SUPERIOR + PARTE INFERIOR
```

---

## TESTING RÁPIDO

```bash
# Para validar OCR rápidamente:

1. Tomar foto recibo real (actual, < 60 días)
2. Guardar en: docs/test-assets/test-recibo.jpg
3. Ejecutar OCR
4. Verificar que extraiga:
   ✓ Empresa
   ✓ Número suministro
   ✓ Dirección
   ✓ Período
5. Si falla alguno, investigar por qué

# Casos de test críticos:
- Recibo Pluz 2026 (moderno)
- Recibo ENEL antiguo (antes cambio de nombre)
- Recibo Luz del Sur (nuevo formato)
- Recibo SEDAPAL (agua)
- Recibo muy viejo (>60 días)
- Imagen borrosa (OCR falla)
```

---

## CHECKLIST PRE-DEPLOY

Antes de enviar a producción:

- [ ] OCR extrae campos de múltiples empresas
- [ ] Valida antigüedad correctamente
- [ ] Rechaza recibos > 60 días
- [ ] Acepta formato "MM/AAAA" para período
- [ ] Extrae dirección sin caracteres extraños
- [ ] Maneja errores OCR elegantemente
- [ ] Mensajes de error son claros al usuario
- [ ] Probado con 5+ imágenes reales
- [ ] Base de datos updated (tipo="recibo_servicios")
- [ ] Documentación actualizada

---

## CONTACTO/ESCALACIONES

Si OCR sigue fallando después de verificar todo:

1. Revisar: docs/test-assets/GUIA_OCR_VALIDACION_RECIBOS.md
2. Revisar: docs/test-assets/RECIBOS_SERVICIOS_PERU_ESTRUCTURA.md
3. Consultar: Strategic Research Agent (investigación inicial)
4. Escalar a: CTO Alonso o Equipo Tech

---

**Última Actualización:** 13 de enero de 2026
**Formato:** A4 (para imprimir o PDF)
**Tamaño:** Guarda en mobile para acceso rápido en QA
