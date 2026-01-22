# Notas de Crédito SUNAT - Assets de Testing

Esta carpeta contiene 5 Notas de Crédito sintéticas en formato PDF que siguen el estándar peruano de SUNAT para documentos electrónicos.

## Archivos Disponibles

| Archivo | Serie-Número | Monto | Motivo | Cliente |
|---------|--------------|-------|--------|---------|
| `nota-credito-001.pdf` | NC01-00001 | S/ 500.00 | ANULACIÓN DE LA OPERACIÓN | CARLOS EDUARDO RAMIREZ TORRES |
| `nota-credito-002.pdf` | NC01-00002 | S/ 1,000.00 | DESCUENTO GLOBAL | MARIA ISABEL FERNANDEZ CHAVEZ |
| `nota-credito-003.pdf` | NC01-00003 | S/ 1,500.00 | DEVOLUCIÓN TOTAL | JOSE ANTONIO GUTIERREZ LOPEZ |
| `nota-credito-004.pdf` | NC01-00004 | S/ 2,000.00 | ANULACIÓN DE LA OPERACIÓN | ANA LUCIA MENDOZA QUISPE |
| `nota-credito-005.pdf` | NC01-00005 | S/ 2,500.00 | DESCUENTO GLOBAL | ROBERTO CARLOS VASQUEZ ROJAS |

## Detalles Técnicos

### Estructura del PDF

Cada Nota de Crédito incluye:

1. **Header Empresarial:**
   - Razón Social: ECOPLAZA INMOBILIARIA S.A.C.
   - RUC: 20123456789
   - Dirección: Av. Javier Prado Este 4200, San Borja - Lima
   - Teléfono: (01) 610-3000
   - Email: ventas@ecoplaza.com.pe

2. **Recuadro de Identificación:**
   - Título: "NOTA DE CRÉDITO ELECTRÓNICA"
   - Serie y Número: NC01-XXXXX

3. **Documento que Modifica:**
   - Tipo: Boleta de Venta Electrónica
   - Serie-Número de la boleta original
   - Fecha de emisión de la boleta

4. **Datos del Cliente:**
   - Nombre completo
   - Documento (DNI)
   - Dirección
   - Fecha de emisión de la NC

5. **Motivo o Sustento:**
   - Anulación de la operación
   - Descuento global
   - Devolución total

6. **Detalle del Producto/Servicio:**
   - Tabla con: Cantidad, Descripción, Precio Unitario, Importe
   - Descripción: "Separación de Local XXX - Proyecto YYY"

7. **Totales:**
   - Operaciones Gravadas (Base imponible)
   - IGV 18%
   - Total (incluye IGV)

8. **Pie de Página:**
   - QR Code simulado (cuadro negro con patrón)
   - Hash del documento (SHA-256 simulado)
   - Texto legal: "Representación impresa de la Nota de Crédito Electrónica"
   - Link de consulta: www.ecoplaza.com.pe/sunat
   - Referencia a resolución SUNAT

### Cálculos

Los cálculos siguen la fórmula estándar de SUNAT:

```python
# Monto TOTAL incluye IGV
total = monto_base

# Op. Gravada = Base imponible (sin IGV)
op_gravada = round(total / 1.18, 2)

# IGV = 18% de la base
igv = round(total - op_gravada, 2)

# Verificación
assert op_gravada + igv == total
```

**Ejemplo con S/ 500.00:**
- Total: S/ 500.00
- Op. Gravada: S/ 423.73
- IGV: S/ 76.27
- Verificación: S/ 423.73 + S/ 76.27 = S/ 500.00 ✓

### Colores Corporativos

- **Verde ECOPLAZA:** #1b967a (headers de secciones)
- **Azul ECOPLAZA:** #192c4d (títulos, recuadro NC, totales)
- **Amarillo ECOPLAZA:** #fbde17 (no usado en NC, disponible)

### Tipografía

- **Helvetica-Bold:** Títulos y labels
- **Helvetica:** Texto general
- **Courier:** Hash del documento

## Clientes Ficticios

Todos los clientes son ficticios con datos realistas:

| # | Nombre | DNI | Dirección |
|---|--------|-----|-----------|
| 1 | CARLOS EDUARDO RAMIREZ TORRES | 45678912 | Jr. Las Camelias 456, San Isidro - Lima |
| 2 | MARIA ISABEL FERNANDEZ CHAVEZ | 23456789 | Av. Arequipa 2345, Lince - Lima |
| 3 | JOSE ANTONIO GUTIERREZ LOPEZ | 78912345 | Calle Los Pinos 789, Miraflores - Lima |
| 4 | ANA LUCIA MENDOZA QUISPE | 34567891 | Av. La Marina 1234, Pueblo Libre - Lima |
| 5 | ROBERTO CARLOS VASQUEZ ROJAS | 56789123 | Jr. Junín 567, Cercado de Lima |

## Boletas Referenciadas

Cada NC modifica una Boleta de Venta Electrónica ficticia:

| NC | Boleta Ref | Fecha Boleta |
|----|------------|--------------|
| NC01-00001 | B001-00245 | 02/01/2026 |
| NC01-00002 | B001-00289 | 05/01/2026 |
| NC01-00003 | B001-00312 | 10/01/2026 |
| NC01-00004 | B001-00356 | 14/01/2026 |
| NC01-00005 | B001-00401 | 18/01/2026 |

## Productos/Servicios

Todas las NC corresponden a "Separación de Local" en diferentes proyectos ECOPLAZA:

| NC | Local | Proyecto |
|----|-------|----------|
| NC01-00001 | A-105 | Valle Hermoso |
| NC01-00002 | B-208 | Plaza Central |
| NC01-00003 | C-315 | EcoParque |
| NC01-00004 | D-412 | Mercado Norte |
| NC01-00005 | E-520 | Plaza del Sol |

## Uso en Testing

### 1. Testing de Visualización de PDFs

```javascript
// Componente de vista previa
const pdfUrl = '/docs/test-assets/nota-credito/nota-credito-001.pdf';

// Verificar que se carga correctamente
expect(pdfViewer).toHaveAttribute('src', pdfUrl);
```

### 2. Testing de Validación de PDFs

```javascript
// Validar que es un PDF válido
const file = new File([pdfBuffer], 'nota-credito-001.pdf', {
  type: 'application/pdf'
});

expect(file.type).toBe('application/pdf');
expect(file.size).toBeGreaterThan(0);
```

### 3. Testing de Upload

```javascript
// Simular upload de NC
await page.setInputFiles('input[type="file"]',
  'docs/test-assets/nota-credito/nota-credito-001.pdf'
);

// Verificar que se procesa
await expect(page.locator('.success-message')).toBeVisible();
```

### 4. Testing de Sistema de Archivo

```javascript
// Guardar en sistema de archivos
const documento = {
  tipo: 'nota_credito',
  archivo_url: '/storage/nc/nota-credito-001.pdf',
  metadata: {
    serie_numero: 'NC01-00001',
    monto: 500.00,
    motivo: 'ANULACIÓN DE LA OPERACIÓN'
  }
};
```

## Generación de PDFs

Los PDFs fueron generados usando el script:

```bash
python scripts/generate-notas-credito.py
```

**Tecnología:**
- Python 3.7+
- reportlab 3.6.13
- Pillow 9.5.0

**Script disponible en:**
`E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\scripts\generate-notas-credito.py`

### Regenerar los PDFs

Si necesitas regenerar los PDFs:

```bash
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard
python scripts/generate-notas-credito.py
```

### Personalizar

Para generar nuevas NCs con datos diferentes, edita el array `NOTAS_CREDITO` en el script:

```python
NOTAS_CREDITO = [
    {
        'serie_numero': 'NC01-00006',
        'fecha': '25/01/2026',
        'boleta_ref': 'B001-00450',
        'fecha_boleta': '23/01/2026',
        'cliente': {
            'nombre': 'TU CLIENTE AQUI',
            'documento': 'DNI 12345678',
            'direccion': 'Tu dirección aquí'
        },
        'motivo': 'ANULACIÓN DE LA OPERACIÓN',
        'descripcion': 'Separación de Local X-XXX - Proyecto YYY',
        'monto': 3000.00
    }
]
```

## Cumplimiento SUNAT

Estos PDFs son **sintéticos** para testing y **NO** son documentos fiscales válidos.

**Para producción**, las Notas de Crédito deben:
- Generarse a través de un PSE (Proveedor de Servicios Electrónicos)
- Tener firma digital válida
- Ser enviadas a SUNAT OSE (Operador de Servicios Electrónicos)
- Tener QR code real con link a consulta SUNAT
- Incluir código de hash verificable en SUNAT

## Referencias Legales

- [Resolución de Superintendencia N° 097-2012/SUNAT](https://www.sunat.gob.pe/legislacion/superin/2012/097-2012.pdf) - Notas de Crédito Electrónicas
- [Resolución de Superintendencia N° 188-2010/SUNAT](https://www.sunat.gob.pe/legislacion/superin/2010/188-2010.pdf) - Sistema de Emisión Electrónica

## Soporte

Para reportar problemas o solicitar nuevas NCs sintéticas, contactar al Python Data Science Engineer.

---

**Generado:** 22 Enero 2026
**Versión:** 1.0
**Formato:** PDF (A4)
**Estándar:** SUNAT Perú
