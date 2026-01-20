# Boletas de Ejemplo para Pruebas

Esta carpeta contiene boletas de venta electrónica de ejemplo, basadas en el formato oficial peruano regulado por SUNAT.

## Archivos Disponibles

| Archivo | Número | Cliente | Monto | Moneda | Concepto |
|---------|--------|---------|-------|--------|----------|
| `boleta-B001-00123.html` | B001-00123 | Teodorico Marin | $300.00 | USD | Separación Local P-763 |
| `boleta-B001-00124.html` | B001-00124 | Maria Elena Rodriguez | $2,500.00 | USD | Cuota Inicial Local A-205 |
| `boleta-B001-00125.html` | B001-00125 | Juan Carlos Mendoza | $850.00 | USD | Cuota Mensual Local B-310 |
| `boleta-B001-00126.html` | B001-00126 | Ana Patricia Gomez | S/1,200.00 | PEN | Separación Local C-102 |
| `boleta-B001-00127.html` | B001-00127 | Roberto Carlos Fernandez | $5,000.00 | USD | Cuota Inicial Local D-415 |

## Cómo Convertir a PDF

Los archivos HTML pueden convertirse a PDF de las siguientes formas:

### Opción 1: Desde el Navegador
1. Abrir el archivo HTML en Chrome, Firefox o Edge
2. Presionar `Ctrl + P` (o `Cmd + P` en Mac)
3. Seleccionar "Guardar como PDF" en el destino
4. Configurar márgenes a "Ninguno" para mejor resultado
5. Click en "Guardar"

### Opción 2: Usando Print to PDF
1. Doble click en el archivo HTML
2. Click derecho > Imprimir
3. Seleccionar "Microsoft Print to PDF"
4. Guardar con el mismo nombre pero extensión `.pdf`

## Estructura de una Boleta Electrónica Peruana

Según las normativas de SUNAT, una boleta de venta electrónica debe contener:

```
┌─────────────────────────────────────────────────────────────┐
│  EMISOR                          │  DOCUMENTO              │
│  - Razón Social                  │  - RUC                  │
│  - Dirección                     │  - Tipo: BOLETA         │
│  - Teléfono/Email                │  - Serie-Número         │
├─────────────────────────────────────────────────────────────┤
│  CLIENTE                                                    │
│  - Nombre/Razón Social                                      │
│  - DNI/RUC (opcional en boletas)                           │
│  - Dirección                                                │
│  - Fecha de Emisión                                         │
├─────────────────────────────────────────────────────────────┤
│  DETALLE                                                    │
│  - Cantidad | Descripción | P. Unitario | Importe          │
├─────────────────────────────────────────────────────────────┤
│  TOTALES                                                    │
│  - Op. Gravada                                              │
│  - IGV (18%)                                                │
│  - TOTAL                                                    │
├─────────────────────────────────────────────────────────────┤
│  [QR]  │  Representación impresa de Boleta Electrónica     │
│        │  Hash de verificación                              │
│        │  Autorizado por Res. SUNAT 188-2010               │
└─────────────────────────────────────────────────────────────┘
```

## Uso en Pruebas

Estas boletas pueden usarse para:

1. **Pruebas de Upload**: Vincular boletas a comprobantes de pago en el sistema
2. **Validación de OCR**: Probar extracción de datos de documentos
3. **Testing de UI**: Verificar correcta visualización de boletas vinculadas
4. **Demos**: Presentaciones a clientes o stakeholders

## Datos Ficticios

⚠️ **IMPORTANTE**: Todos los datos en estas boletas son ficticios:
- El RUC 20456789012 no existe
- Los nombres de clientes son inventados
- Los números de DNI son de ejemplo
- Los hashes son aleatorios

**NO usar estos documentos para ningún fin legal o tributario.**

## Empresa Emisora

```
INMOBILIARIA ECOPLAZA S.A.C.
RUC: 20456789012 (ficticio)
Av. Javier Prado Este 4200, Of. 301
Santiago de Surco, Lima - Perú
Tel: (01) 500-4000
Email: facturacion@ecoplaza.com.pe
```

---

Creado para pruebas del sistema de Boletas Vinculadas - Enero 2026
