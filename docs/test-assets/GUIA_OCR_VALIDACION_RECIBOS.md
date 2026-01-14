# Guía Práctica: OCR y Validación de Recibos de Servicios en Perú

**Documento técnico para desarrolladores** - Validación de recibos luz/agua en formulario de corredor
**Fecha:** 13 de enero de 2026

---

## 1. PATRONES DE BÚSQUEDA OCR POR EMPRESA

### 1.1 PLUZ ENERGÍA (antes ENEL)

**Identificadores clave a buscar:**
```
Palabras clave para detección:
- "PLUZ" o "PLUZ ENERGÍA"
- "ENEL" (recibos antiguos aún circulan)
- "Número de Suministro:"
- "Número de Cliente:"
- "Consumo en kWh"
```

**Patrón de número de suministro Pluz:**
```
Formato: 8-10 dígitos numéricos
Ejemplo: 12345678 o 1234567890
Ubicación: Parte superior derecha, en caja destacada
Regex: ^\d{8,10}$
```

**Extracción de dirección:**
```
Ubicación: Encabezado del recibo, después del nombre del cliente
Patrón: Calle/Av. + número + piso/depto + distrito
Ejemplo: "Av. Primavera 2500 Apto. 201, San Isidro"
Validación: Debe contener calle y número
```

**Extracción de período:**
```
Ubicación: Encabezado, cerca de "Período de Facturación"
Formato: MM/AAAA o MM-AAAA
Ejemplo: 01/2026 o 01-2026
Regex: ^(0[1-9]|1[0-2])/(20\d{2})$
Validación: Debe ser < 60 días del día actual
```

---

### 1.2 LUZ DEL SUR

**Identificadores clave a buscar:**
```
Palabras clave para detección:
- "LUZ DEL SUR"
- "luzdelsur.pe"
- "Número de Suministro:"
- "Sector Típico:"
- "kWh" o "kilowatts/hora"
```

**Patrón de número de suministro Luz del Sur:**
```
Formato: Alfanumérico, 8-12 caracteres
Ejemplo: LDS1234567 o 2500001234
Ubicación: Superior derecho en caja destacada
Regex: ^[A-Z0-9]{8,12}$
```

**Extracción de dirección:**
```
Ubicación: Encabezado principal
Patrón: Similar a Pluz (Calle + número + detalles)
Validación: Debe ser dirección completa válida en Lima
```

**Características visuales:**
```
Diseño moderno 2024+ con:
- Colores luminosos (azul, verde, naranja)
- Secciones claramente diferenciadas
- QR code en parte inferior
- Historial gráfico de consumo
```

---

### 1.3 SEDAPAL (Agua)

**Identificadores clave a buscar:**
```
Palabras clave para detección:
- "SEDAPAL"
- "Servicio de Agua Potable"
- "Número de Suministro:"
- "m³" o "metros cúbicos"
- "Lectura Anterior/Actual"
```

**Patrón de número de suministro SEDAPAL:**
```
Formato: 6-8 caracteres alfanuméricos
Ejemplo: 123456 o AB123456
Ubicación: Parte superior del recibo
Regex: ^[A-Z0-9]{6,8}$
```

**Extracción de dirección:**
```
Ubicación: Encabezado del recibo
Patrón: Calle + número + piso/casa + distrito
Ejemplo: "Jr. Bolognesi 145 Casa 2, Rímac"
Validación: Dirección en Lima o Callao
```

**Extracción de consumo (secundario):**
```
Ubicación: Sección "Detalle del Consumo"
Campos a extraer:
- Lectura Anterior (m³): Número
- Lectura Actual (m³): Número
- m³ Facturados: Lectura Actual - Lectura Anterior
Validación: Lectura Actual > Lectura Anterior
```

---

## 2. ORDEN DE EXTRACCIÓN RECOMENDADO (FLUJO OCR)

### Paso 1: Identificar Empresa/Tipo
```javascript
// Pseudocódigo
function identifyCompany(ocrText) {
  const text = ocrText.toUpperCase();

  if (text.includes("PLUZ") || text.includes("ENEL")) {
    return "LUZ_PLUZ";
  } else if (text.includes("LUZ DEL SUR")) {
    return "LUZ_LUZDELDSUR";
  } else if (text.includes("SEDAPAL")) {
    return "AGUA_SEDAPAL";
  } else if (text.includes("SEDALIB")) {
    return "AGUA_SEDALIB";
  } else if (text.includes("SEDAPAR")) {
    return "AGUA_SEDAPAR";
  }

  return "DESCONOCIDO";
}
```

### Paso 2: Extraer Campos Obligatorios
```javascript
function extractCriticalFields(ocrText, company) {
  const fields = {};

  // 1. NÚMERO DE SUMINISTRO
  const suppNumberPatterns = {
    'LUZ_PLUZ': /número de suministro[:\s]+(\d{8,10})/i,
    'LUZ_LUZDELDSUR': /número de suministro[:\s]+([A-Z0-9]{8,12})/i,
    'AGUA_SEDAPAL': /número de suministro[:\s]+([A-Z0-9]{6,8})/i
  };

  const suppMatch = ocrText.match(suppNumberPatterns[company]);
  fields.numeroSuministro = suppMatch ? suppMatch[1] : null;

  // 2. DIRECCIÓN
  // Buscar línea que contiene "Av.", "Calle", "Jr.", "Pasaje"
  const direccionPattern = /(?:Av\.|Calle|Jr\.|Pasaje|Pje|Mz|Lote)[^,\n]+(,?\s*\w+\s*\d+)?/i;
  const dirMatch = ocrText.match(direccionPattern);
  fields.direccion = dirMatch ? dirMatch[0] : null;

  // 3. PERÍODO FACTURACIÓN
  const periodPattern = /(0[1-9]|1[0-2])\/(20\d{2})/;
  const periodMatch = ocrText.match(periodPattern);
  fields.periodo = periodMatch ? periodMatch[0] : null;

  // 4. NOMBRE TITULAR
  const titularPattern = /titular[:\s]+([A-Za-záéíóúñ\s]+)/i;
  const titularMatch = ocrText.match(titularPattern);
  fields.titular = titularMatch ? titularMatch[1].trim() : null;

  return fields;
}
```

### Paso 3: Validar Campos Extraídos
```javascript
function validateExtractedFields(fields) {
  const errors = [];

  // Validación 1: Número de Suministro
  if (!fields.numeroSuministro) {
    errors.push("No se encontró número de suministro");
  }

  // Validación 2: Dirección
  if (!fields.direccion || fields.direccion.length < 10) {
    errors.push("Dirección inválida o incompleta");
  }

  // Validación 3: Período
  if (!fields.periodo) {
    errors.push("No se encontró período de facturación");
  }

  // Validación 4: Antigüedad (< 60 días)
  if (fields.periodo) {
    const [mes, año] = fields.periodo.split('/');
    const reciboDate = new Date(`${año}-${mes}-01`);
    const hoy = new Date();
    const diasDiferencia = Math.floor((hoy - reciboDate) / (1000 * 60 * 60 * 24));

    if (diasDiferencia > 60) {
      errors.push(`Recibo muy antiguo (${diasDiferencia} días). Máximo 60 días.`);
    }
  }

  // Validación 5: Nombre Titular
  if (!fields.titular) {
    errors.push("No se encontró nombre del titular");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: []
  };
}
```

---

## 3. MATRICES DE CAMPOS POR EMPRESA

### PLUZ ENERGÍA - Mapa de Posiciones

```
┌─────────────────────────────────────────────────────┐
│  PLUZ ENERGÍA PERÚ S.A.A.                          │
│  Número de Suministro: 12345678  Número de Cliente: 654321
│                                                      │
│  SEÑOR(A): Juan Pérez García                        │
│  Dirección: Av. Primavera 2500 Apto. 201 San Isidro│
│  Período de Facturación: 01/2026                    │
│                                                      │
│  ─────── DATOS DEL SUMINISTRO ───────              │
│  Tipo de Tarifa: BT2 (Residencial)                 │
│  Tipo de Conexión: Monofásica                      │
│  Medidor: 123456789                                │
│                                                      │
│  ─────── DETALLE DEL CONSUMO ────────              │
│  Lectura Anterior (01/12/2025): 1234 kWh          │
│  Lectura Actual (02/01/2026): 1456 kWh            │
│  kWh Consumidos: 222                                │
│                                                      │
│  ─────── RESUMEN DE CHARGES ─────────              │
│  Cargo Fijo: S/ 12.50                              │
│  Cargo por Energía: S/ 45.89                       │
│  Alumbrado Público: S/ 8.50                        │
│  Total a Pagar: S/ 67.89                           │
│  Fecha de Vencimiento: 20/01/2026                  │
└─────────────────────────────────────────────────────┘
```

### LUZ DEL SUR - Mapa de Posiciones

```
┌─────────────────────────────────────────────────────┐
│  LUZ DEL SUR                                        │
│  Número de Suministro: 2500001234                  │
│                                                      │
│  CLIENTE: María García López                        │
│  Dirección: Jr. Paseo de la República 3200 San Isidro
│  Período: 01/2026                                   │
│                                                      │
│  ─────── DATOS DEL SUMINISTRO ───────              │
│  Tarifa: BT2-OP (Residencial)                      │
│  Medidor: 87654321                                 │
│                                                      │
│  ─────── DETALLE DEL CONSUMO ────────              │
│  Lectura Anterior: 2100 kWh                        │
│  Lectura Actual: 2350 kWh                          │
│  Consumo: 250 kWh                                  │
│                                                      │
│  ─────── FACTURACIÓN ─────────────────             │
│  Total S/ 82.50                                     │
│  Vencimiento: 25/01/2026                           │
│  [QR CODE] www.luzdelsur.pe                        │
└─────────────────────────────────────────────────────┘
```

### SEDAPAL - Mapa de Posiciones

```
┌─────────────────────────────────────────────────────┐
│  SEDAPAL - Servicio de Agua Potable y Alcantarillado
│  Número de Suministro: 234567                      │
│                                                      │
│  TITULAR: Carlos Rodríguez Mendez                  │
│  Dirección: Calle Velasco Astete 456 Dpto. 3B Rímac
│  Período: 01/2026                                   │
│                                                      │
│  ─────── DATOS DEL SERVICIO ─────────              │
│  Medidor: 123456789                                │
│  Categoria: Doméstico                              │
│  Zona: ZM-19                                       │
│                                                      │
│  ─────── CONSUMO DE AGUA ─────────────             │
│  Lectura Anterior: 145 m³                          │
│  Lectura Actual: 158 m³                            │
│  m³ Facturados: 13                                 │
│                                                      │
│  ─────── TARIFA 2026 ─────────────────             │
│  Cargo Base: S/ 6.32                               │
│  Consumo (hasta 10 m³): 10 × S/ 2.20 = S/ 22.00  │
│  Consumo (10-20 m³): 3 × S/ 2.36 = S/ 7.08       │
│  Total a Pagar: S/ 35.40                           │
│  Vencimiento: 25/01/2026                           │
└─────────────────────────────────────────────────────┘
```

---

## 4. CHECKLIST DE VALIDACIÓN

### Pre-OCR
- [ ] Imagen clara (resolución mín 300 DPI)
- [ ] Documento completo (sin cortes)
- [ ] Texto legible (contraste adecuado)
- [ ] Documento orientado correctamente

### Post-OCR
- [ ] Empresa identificada correctamente
- [ ] Número de suministro extraído
- [ ] Dirección extraída y válida
- [ ] Período de facturación válido
- [ ] Antigüedad < 60 días
- [ ] Nombre del titular presente

### Validaciones de Formato
- [ ] Número de suministro formato correcto para empresa
- [ ] Dirección tiene calle y número
- [ ] Período en formato MM/YYYY
- [ ] Sin caracteres extraños o corruptos

### Validaciones de Negocio
- [ ] Recibo es de empresa conocida (Pluz, Luz del Sur, SEDAPAL, etc.)
- [ ] Documento es del mes actual o anterior
- [ ] Total a pagar > 0 (documento válido)
- [ ] Dirección en Perú (validar código postal si está presente)

---

## 5. MANEJO DE ERRORES Y CASOS ESPECIALES

### Caso 1: Recibo muy antiguo
```
Detección: periodo older than 60 days
Acción: Rechazar con mensaje
Mensaje: "Recibo muy antiguo. Debe ser de menos de 2 meses de antigüedad"
```

### Caso 2: Empresa no reconocida
```
Detección: No company match en primer paso
Acción: Mostrar lista de empresas aceptadas
Empresas aceptadas:
- Pluz Energía (antes ENEL)
- Luz del Sur
- SEDAPAL, SEDALIB, SEDAPAR (agua)
- Empresas de gas y telefonía (Grifógas, Entel, Movistar, etc.)
```

### Caso 3: Dirección incompleta
```
Detección: Dirección < 10 caracteres o sin número
Acción: Pedir al usuario que ingrese dirección manualmente
Mensaje: "La dirección en el recibo no es clara. Por favor ingresarla manualmente"
```

### Caso 4: Número de suministro no encontrado
```
Detección: suppNumber = null
Acción: Pedir al usuario que ingrese número manualmente
Mensaje: "No se pudo extraer el número de suministro. Por favor ingresarlo"
```

### Caso 5: OCR baja calidad
```
Detección: Menos de 40% de campos extraídos correctamente
Acción: Rechazar imagen y pedir mejor foto
Mensaje: "Imagen de baja calidad. Por favor tomar una foto más clara"
```

---

## 6. PRUEBAS RECOMENDADAS

### Imágenes de Prueba a Crear

```
Ubicación: docs/test-assets/recibos/

recibo-pluz-01.jpg          → Recibo Pluz moderno, claro
recibo-pluz-02.jpg          → Recibo Pluz antiguo (ENEL)
recibo-luzdelsur-01.jpg     → Recibo Luz del Sur nuevo formato
recibo-luzdelsur-02.jpg     → Recibo Luz del Sur antiguo formato
recibo-sedapal-01.jpg       → Recibo SEDAPAL actual
recibo-sedapal-02.jpg       → Recibo SEDAPAL con fondo oscuro

recibo-error-borroso.jpg    → Prueba OCR baja calidad
recibo-error-cortado.jpg    → Prueba imagen incompleta
recibo-error-muy-viejo.jpg  → Prueba recibo >60 días
```

### Test Cases

```javascript
// Test 1: Extracción correcta Pluz
test('Debería extraer campos de recibo Pluz válido', () => {
  const resultado = processRecibo('recibo-pluz-01.jpg');
  expect(resultado.empresa).toBe('LUZ_PLUZ');
  expect(resultado.numeroSuministro).toBeTruthy();
  expect(resultado.direccion).toBeTruthy();
  expect(resultado.isValid).toBe(true);
});

// Test 2: Rechazo por antigüedad
test('Debería rechazar recibo >60 días', () => {
  const resultado = processRecibo('recibo-error-muy-viejo.jpg');
  expect(resultado.isValid).toBe(false);
  expect(resultado.errors).toContain('antiguo');
});

// Test 3: Extracción SEDAPAL
test('Debería extraer consumo de agua SEDAPAL', () => {
  const resultado = processRecibo('recibo-sedapal-01.jpg');
  expect(resultado.empresa).toBe('AGUA_SEDAPAL');
  expect(resultado.m3Consumidos).toBeTruthy();
});

// Test 4: Robustez OCR
test('Debería funcionar con diferentes layouts', () => {
  const empresas = ['pluz', 'luzdelsur', 'sedapal'];
  for (const empresa of empresas) {
    const resultado = processRecibo(`recibo-${empresa}-01.jpg`);
    expect(resultado.isValid).toBe(true);
  }
});
```

---

## 7. MEJORAS FUTURAS

### Corto Plazo (2026 Q1)
- Soporte para recibos de gas (Grifógas, Siba)
- Soporte para recibos de telefonía (Entel, Movistar)
- OCR mejorado para direcciones con acentos
- Validación de código postal si está presente

### Mediano Plazo (2026 Q2)
- Integración con APIs de empresas (SEDAPAL, Pluz, Luz del Sur)
- Descarga automática de recibo desde portal online
- Reconocimiento de recibos PDF digitales
- Histórico de recibos para auditoría

### Largo Plazo (2026+)
- Machine learning para detección de recibos falsificados
- Blockchain para certificación de recibos
- API pública para validación de recibos en tiempo real

---

**Documento Finalizado:** 13 de enero de 2026
**Responsable:** Strategic Research Agent + Technical Specifications
**Estado:** LISTO PARA DESARROLLO
