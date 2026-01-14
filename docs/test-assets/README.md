# Test Assets - Recursos de Prueba

Esta carpeta contiene imagenes y documentos de ejemplo para usar en pruebas automatizadas y manuales del dashboard EcoPlaza.

## Estructura de Carpetas

```
docs/test-assets/
├── README.md              # Este archivo
├── RECIBOS_SERVICIOS_PERU_ESTRUCTURA.md    # INVESTIGACIÓN: Estructura de recibos
├── GUIA_OCR_VALIDACION_RECIBOS.md          # TÉCNICO: Patrones OCR y validación
├── RESUMEN_EJECUTIVO_RECIBOS.md            # EJECUTIVO: Resumen rápido
├── QUICK_REFERENCE_RECIBOS.md              # BOLSILLO: Guía rápida para QA
├── DOCUMENTOS_PERU_REFERENCIA.md           # Referencia general de documentos
├── dni/                   # Documentos de identidad
│   ├── dni-frente-*.jpg   # DNI anverso
│   └── dni-reverso-*.jpg  # DNI reverso
├── vouchers/              # Comprobantes bancarios
│   ├── voucher-bcp-*.jpg      # Vouchers BCP
│   ├── voucher-interbank-*.jpg # Vouchers Interbank
│   ├── voucher-bbva-*.jpg     # Vouchers BBVA
│   └── voucher-bn-*.jpg       # Vouchers Banco de la Nacion
├── contratos/             # Documentos contractuales
│   └── contrato-ejemplo-*.pdf
├── recibo-luz/            # Recibos de servicios eléctricos
│   ├── recibo-luz-01-luzdelsur.md
│   ├── recibo-luz-02-enel.md
│   ├── recibo-luz-03-seal.md
│   ├── recibo-luz-04-electronorte.md
│   ├── recibo-luz-05-electrocentro.md
│   └── recibo-luz-sintetico-01.png
├── recibo-agua/           # Recibos de servicios de agua
│   ├── recibo-agua-01-sedapal.md
│   ├── recibo-agua-02-sedapal.md
│   ├── recibo-agua-03-epsgrau.md
│   ├── recibo-agua-04-sedalib.md
│   ├── recibo-agua-05-sedacusco.md
│   └── recibo-agua-sintetico-01.png
├── declaracion-jurada-direccion/  # Declaraciones juradas de domicilio
│   ├── declaracion-jurada-01.md
│   ├── declaracion-jurada-02.md
│   ├── declaracion-jurada-03.md
│   ├── declaracion-jurada-04.md
│   ├── declaracion-jurada-05.md
│   └── declaracion-jurada-sintetico-01.png
└── otros/                 # Otros documentos de prueba
```

## NUEVO: Documentación de Recibos de Servicios (13 Ene 2026)

Se ha completado una investigación exhaustiva sobre la estructura de recibos de servicios en Perú.

### Documentos Disponibles

#### 1. RECIBOS_SERVICIOS_PERU_ESTRUCTURA.md (Completo)
**Para:** Arquitectos, desarrolladores senior, documentación
**Contiene:**
- Estructura detallada de recibos por empresa (Pluz, Luz del Sur, SEDAPAL)
- Campos específicos de cada proveedor
- Validaciones oficiales recomendadas
- Comparativa: Recibos de Servicios vs Vouchers Bancarios
- Recomendaciones para el sistema

**Secciones clave:**
1. Recibos de luz ENEL/Pluz
2. Recibos de luz Luz del Sur
3. Recibos de agua SEDAPAL
4. Validación como comprobante de domicilio
5. Comparativa con vouchers bancarios
6. Campos críticos para extraer con OCR
7. Validaciones recomendadas
8. Fuentes consultadas

#### 2. GUIA_OCR_VALIDACION_RECIBOS.md (Técnico)
**Para:** Desarrolladores backend, especialistas OCR, QA técnico
**Contiene:**
- Patrones de búsqueda OCR por empresa
- Pseudocódigo de extracción
- Matriz de campos por empresa con ubicación visual
- Checklist de validación
- Manejo de errores y casos especiales
- Test cases recomendados
- Mejoras futuras

**Secciones clave:**
1. Patrones de búsqueda OCR por empresa
2. Orden de extracción recomendado (flujo)
3. Matrices de campos con mapas visuales
4. Checklist de validación
5. Manejo de errores
6. Pruebas recomendadas
7. Mejoras futuras

#### 3. RESUMEN_EJECUTIVO_RECIBOS.md (Ejecutivo)
**Para:** Gerentes, project managers, stakeholders
**Contiene:**
- Problema identificado (tipo="voucher" incorrecto)
- Solución en 3 pasos
- Campos críticos por empresa
- Validaciones recomendadas
- Ejemplos de validación (válido/inválido)
- Impacto en el formulario
- Checklist de implementación
- FAQ y referencias legales

**Secciones clave:**
1. Problema identificado
2. Solución rápida (1-2 horas)
3. Campos críticos
4. Validaciones recomendadas
5. Ejemplos de validación
6. Impacto en formulario
7. Checklist implementación
8. FAQ

#### 4. QUICK_REFERENCE_RECIBOS.md (Bolsillo)
**Para:** QA, developers in a hurry, testing rápido
**Contiene:**
- Tres datos clave
- Empresas aceptadas (lista para copiar/pegar)
- Patrones rápidos de búsqueda OCR
- Validación en 60 segundos
- Campos a extraer en orden
- Errores comunes y soluciones
- Ejemplos rápidos (válido/inválido)
- Código mínimo (pseudocódigo)
- Regex útiles
- Ubicación visual de campos
- Testing rápido

**Uso:** Imprimir o guardar en mobile para acceso rápido

---

## Convenciones de Nombres

### DNI
| Archivo | Descripcion |
|---------|-------------|
| `dni-frente-01.jpg` | DNI anverso - persona ejemplo 1 |
| `dni-frente-02.jpg` | DNI anverso - persona ejemplo 2 |
| `dni-reverso-01.jpg` | DNI reverso - persona ejemplo 1 |
| `dni-reverso-02.jpg` | DNI reverso - persona ejemplo 2 |
| `dni-frente-borroso.jpg` | DNI con baja calidad (para pruebas OCR) |
| `dni-frente-rotado.jpg` | DNI rotado (para pruebas de orientacion) |

### Vouchers Bancarios
| Archivo | Descripcion |
|---------|-------------|
| `voucher-bcp-deposito-01.jpg` | Voucher BCP deposito efectivo |
| `voucher-bcp-transferencia-01.jpg` | Voucher BCP transferencia |
| `voucher-interbank-deposito-01.jpg` | Voucher Interbank deposito |
| `voucher-interbank-yape-01.jpg` | Voucher Interbank via Yape |
| `voucher-bbva-deposito-01.jpg` | Voucher BBVA deposito |
| `voucher-bn-deposito-01.jpg` | Voucher Banco de la Nacion |
| `voucher-borroso-01.jpg` | Voucher con baja calidad |
| `voucher-parcial-01.jpg` | Voucher cortado/parcial |

---

## Uso en Pruebas

### Para Agentes QA (Playwright MCP)
```javascript
// Ruta base para test assets
const TEST_ASSETS_PATH = 'docs/test-assets';

// Subir DNI en prueba
await page.setInputFiles('input[type="file"]',
  `${TEST_ASSETS_PATH}/dni/dni-frente-01.jpg`
);

// Subir voucher en prueba
await page.setInputFiles('input[type="file"]',
  `${TEST_ASSETS_PATH}/vouchers/voucher-bcp-01.jpg`
);

// Subir recibo de luz en prueba
await page.setInputFiles('input[type="file"]',
  `${TEST_ASSETS_PATH}/recibo-luz/recibo-luz-sintetico-01.png`
);
```

### Para Agentes Frontend
Usar estas imagenes para:
- Probar el componente DocumentoOCRUploader
- Verificar previsualizacion de imagenes
- Testear validaciones de formato/tamano

### Rutas Absolutas (Windows)
```
E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\test-assets\dni\
E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\test-assets\vouchers\
E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\test-assets\recibo-luz\
E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\test-assets\recibo-agua\
```

---

## Imagenes Disponibles

### DNI Peruano Real (Wikimedia Commons - CC BY-SA 4.0)
- [x] `dni-frente-01.jpg` - DNI anverso modelo 2020 (324 KB)
- [x] `dni-reverso-01.png` - DNI reverso modelo 2020 (218 KB)

Fuente: [Wikimedia Commons - Identity cards of Peru](https://commons.wikimedia.org/wiki/Category:Identity_cards_of_Peru)

### DNI Sinteticos (Generados para pruebas OCR)

| # | Archivo Frente | Archivo Reverso | DNI | Nombre Completo | Ubicacion |
|---|----------------|-----------------|-----|-----------------|-----------|
| 1 | `dni-sintetico-01-frente.png` | `dni-sintetico-01-reverso.png` | 35849928 | ROBERTO CARLOS HERNANDEZ RAMIREZ | MIRAFLORES, LIMA |
| 2 | `dni-sintetico-02-frente.png` | `dni-sintetico-02-reverso.png` | 34296788 | PEDRO ANTONIO RAMIREZ SILVA | LA MOLINA, LIMA |
| 3 | `dni-sintetico-03-frente.png` | `dni-sintetico-03-reverso.png` | 77154533 | MIGUEL ANGEL LOPEZ SANCHEZ | WANCHAQ, CUSCO |
| 4 | `dni-sintetico-04-frente.png` | `dni-sintetico-04-reverso.png` | 99851297 | JOSE LUIS RODRIGUEZ HERNANDEZ | CENTRO, LA LIBERTAD |
| 5 | `dni-sintetico-05-frente.png` | `dni-sintetico-05-reverso.png` | 36107868 | ROBERTO CARLOS ROJAS GONZALEZ | SAN SEBASTIAN, CUSCO |
| 6 | `dni-sintetico-06-frente.png` | `dni-sintetico-06-reverso.png` | 24000314 | CARMEN JULIA RAMIREZ RODRIGUEZ | SURCO, LIMA |

**Generador:** `scripts/generate_synthetic_dni.py`

**Campos disponibles para OCR:**
- **Frente:** DNI, Apellido Paterno, Apellido Materno, Nombres, Fecha Nacimiento, Sexo
- **Reverso:** Ubigeo, Departamento, Provincia, Distrito, Direccion

### Vouchers Bancarios (Placeholder para pruebas)
- [x] `voucher-bcp-01.jpg` - Voucher BCP deposito (test)
- [x] `voucher-interbank-01.jpg` - Voucher Interbank (test)
- [x] `voucher-bbva-01.jpg` - Voucher BBVA (test)
- [x] `voucher-yape-01.jpg` - Voucher Yape (test)

> **Nota:** Los vouchers son imagenes placeholder generadas para pruebas. Contienen datos ficticios.

### Recibos de Luz (Sintéticos)

**Imágenes PNG para testing del uploader:**
- [x] `recibo-luz-sintetico-01.png` - Recibo Luz del Sur PNG (800x1200 px, 64 KB) - Dic 2025

**Archivos Markdown de referencia:**
- [x] `recibo-luz-01-luzdelsur.md` - Recibo Luz del Sur (Dic 2025)
- [x] `recibo-luz-02-enel.md` - Recibo Enel Distribución (Nov 2025)
- [x] `recibo-luz-03-seal.md` - Recibo SEAL Arequipa (Oct 2025)
- [x] `recibo-luz-04-electronorte.md` - Recibo Electronorte (Sep 2025)
- [x] `recibo-luz-05-electrocentro.md` - Recibo Electrocentro (Ago 2025)

> **Nota:** Todos los recibos corresponden al titular **José Antonio Cuadrado Mendoza (DNI: 45678912)** con domicilio en **Av. Los Pinos 456, Dpto 302, Urb. San Miguel, Lima**.
>
> **Para testing:** Usar `recibo-luz-sintetico-01.png` para probar el componente uploader con archivos PNG reales.

### Recibos de Agua (Sintéticos)

**Imágenes PNG para testing del uploader:**
- [x] `recibo-agua-sintetico-01.png` - Recibo SEDAPAL PNG (800x1200 px, 68 KB) - Dic 2025

**Archivos Markdown de referencia:**
- [x] `recibo-agua-01-sedapal.md` - Recibo SEDAPAL Lima (Dic 2025)
- [x] `recibo-agua-02-sedapal.md` - Recibo SEDAPAL Lima (Nov 2025)
- [x] `recibo-agua-03-epsgrau.md` - Recibo EPS Grau Piura (Oct 2025)
- [x] `recibo-agua-04-sedalib.md` - Recibo SEDALIB Trujillo (Sep 2025)
- [x] `recibo-agua-05-sedacusco.md` - Recibo SEDA Cusco (Ago 2025)

> **Nota:** Todos los recibos usan los mismos datos del titular para consistencia en pruebas.
>
> **Para testing:** Usar `recibo-agua-sintetico-01.png` para probar el componente uploader con archivos PNG reales.

### Declaraciones Juradas (Sintéticas)

**Imágenes PNG para testing del uploader:**
- [x] `declaracion-jurada-sintetico-01.png` - Declaración Jurada PNG (800x1100 px, 63 KB) - Ene 2026

**Archivos Markdown de referencia:**
- [x] `declaracion-jurada-01.md` - Declaración formato estándar (Ene 2026)
- [x] `declaracion-jurada-02.md` - Declaración formato con referencia legal (Dic 2025)
- [x] `declaracion-jurada-03.md` - Declaración formato completo (Nov 2025)
- [x] `declaracion-jurada-04.md` - Declaración formato tabular (Oct 2025)
- [x] `declaracion-jurada-05.md` - Declaración formato simple (Sep 2025)

> **Nota:** Todas las declaraciones corresponden a **José Antonio Cuadrado Mendoza (DNI: 45678912)** declarando domicilio en **Av. Los Pinos 456, Dpto 302**.
>
> **Para testing:** Usar `declaracion-jurada-sintetico-01.png` para probar el componente uploader con archivos PNG reales.

### Pendientes (Casos Edge para pruebas OCR)
- [ ] `dni-borroso.jpg` - DNI con baja calidad de imagen
- [ ] `dni-rotado.jpg` - DNI con rotacion de 90 grados
- [ ] `voucher-parcial.jpg` - Voucher recortado o incompleto
- [ ] `voucher-oscuro.jpg` - Voucher con poca iluminacion

---

## Especificaciones de Imagen

| Atributo | Valor Recomendado |
|----------|-------------------|
| Formato | JPG o PNG |
| Resolucion minima | 800x600 px |
| Resolucion maxima | 2000x1500 px |
| Tamano maximo | 5 MB |
| Calidad JPG | 80-90% |

---

## Datos de Prueba Esperados

### Persona Ficticia Estándar (Para TODOS los documentos sintéticos)

Todos los documentos sintéticos creados usan los mismos datos para mantener consistencia:

| Campo | Valor |
|-------|-------|
| **Nombre Completo** | José Antonio Cuadrado Mendoza |
| **DNI** | 45678912 |
| **Dirección** | Av. Los Pinos 456, Dpto 302 |
| **Urbanización** | Urb. San Miguel |
| **Distrito** | San Miguel |
| **Provincia** | Lima |
| **Departamento** | Lima |
| **Teléfono** | 999888777 |
| **Correo** | jcuadrado@ejemplo.com (en algunos docs) |

### DNI de Ejemplo
Los DNI de prueba deberian tener datos ficticios pero realistas:
- Numero: 8 digitos (ej: 12345678)
- Nombres y apellidos ficticios
- Fecha nacimiento que resulte en persona mayor de edad

### Voucher de Ejemplo
Los vouchers de prueba deberian mostrar:
- Monto: Entre S/ 500 y S/ 50,000 o USD 100 - USD 15,000
- Fecha: Reciente (ultimo mes)
- Numero de operacion visible
- Nombre del depositante (puede ser ficticio)

### Recibos de Servicios
Los recibos sintéticos (luz y agua) incluyen:
- Consumo realista para vivienda (190-220 kWh luz, 19-24 m³ agua)
- Montos en soles entre S/ 53 y S/ 161
- Fechas recientes (Ago-Dic 2025, Ene 2026)
- Empresas reales de servicios del Perú
- Histórico de consumo de 6-7 meses

### Declaraciones Juradas
Las declaraciones juradas sintéticas:
- Cumplen con formato legal peruano
- Incluyen referencias a Ley 27444
- Tienen 5 variantes de formato (estándar, tabular, simple, etc.)
- Fechas entre Sep 2025 y Ene 2026
- Todas declaran el mismo domicilio

---

## Seguridad

**IMPORTANTE**:
- NO usar documentos reales con datos personales
- Tachar o pixelar numeros de DNI reales si es necesario
- Los vouchers deben tener datos de prueba o anonimizados
- Estas imagenes NO deben subirse a repositorios publicos

---

## Contacto

Para agregar nuevas imagenes de prueba, coordinar con el Project Manager.
Las imagenes deben ser proporcionadas por el equipo de EcoPlaza.

---

## Changelog

**13 Enero 2026 (Actualización 3) - INVESTIGACIÓN DE RECIBOS:**
- Investigación exhaustiva completada sobre recibos de servicios en Perú
- Documentos creados:
  - `RECIBOS_SERVICIOS_PERU_ESTRUCTURA.md` (16 secciones, 10 fuentes)
  - `GUIA_OCR_VALIDACION_RECIBOS.md` (Pseudocódigo, regex, test cases)
  - `RESUMEN_EJECUTIVO_RECIBOS.md` (Visión ejecutiva y recomendaciones)
  - `QUICK_REFERENCE_RECIBOS.md` (Guía bolsillo para QA/developers)
- Hallazgo crítico: Sistema usa tipo="voucher" pero debería usar tipo="recibo_servicios"
- Recomendación: Cambio inmediato de tipo de documento y validaciones

**13 Enero 2026 (Actualización 2):**
- Agregadas imágenes PNG sintéticas para testing del uploader:
  - `recibo-luz-sintetico-01.png` (800x1200 px, 64 KB) - Luz del Sur
  - `recibo-agua-sintetico-01.png` (800x1200 px, 68 KB) - SEDAPAL
  - `declaracion-jurada-sintetico-01.png` (800x1100 px, 63 KB) - Declaración Jurada
- Creado script `scripts/generate_synthetic_docs.py` para generación automática de documentos PNG
- Los archivos PNG pueden usarse directamente para probar componentes de upload (los .md NO sirven)

**13 Enero 2026:**
- Agregadas 5 recibos de luz sintéticos en formato Markdown (Luz del Sur, Enel, SEAL, Electronorte, Electrocentro)
- Agregados 5 recibos de agua sintéticos en formato Markdown (SEDAPAL x2, EPS Grau, SEDALIB, SEDA Cusco)
- Agregadas 5 declaraciones juradas de domicilio en diferentes formatos (Markdown)
- Todos los documentos sintéticos usan persona ficticia estándar (José Antonio Cuadrado Mendoza, DNI 45678912)

**2 Enero 2026:**
- Creación inicial del README
- Documentación de DNI sintéticos y vouchers

---
**Última actualización:** 13 Enero 2026
**Responsable:** Strategic Research Agent + Documentation Team
**Estado:** INVESTIGACIÓN COMPLETADA - LISTO PARA IMPLEMENTACIÓN
