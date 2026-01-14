# Estructura de Recibos de Servicios en Perú 2026

## Investigación Urgente: Campos y Validación

**Fecha:** 13 de enero de 2026
**Contexto:** Validación correcta de recibos de luz/agua para confirmación de domicilio en formulario de corredor
**Problema:** Sistema usa tipo="voucher" para recibos de servicios, pero son documentos diferentes a vouchers bancarios

---

## 1. RECIBOS DE LUZ - ENEL/PLUZ ENERGÍA

### Identificación de la Empresa
- **Antes llamado:** ENEL Distribución Perú S.A.A.
- **Razón social actual (desde 15 julio 2024):** Pluz Energía Perú S.A.A.
- **Cobertura:** Distribuye energía en Lima, Arequipa, Moquegua, Tacna y áreas de Ucayali

### Campos Principales en el Recibo

| Campo | Ubicación | Formato | Importancia |
|-------|-----------|---------|-------------|
| **Número de Suministro** | Superior derecho | 8-10 dígitos | CRÍTICO - Identifica conexión única |
| **Número de Cliente** | En caja destacada lateral | 6-8 dígitos | CRÍTICO - Para consultas online |
| **Dirección del Suministro** | Encabezado | Texto libre | CRÍTICO - Para validar domicilio |
| **Nombre del Titular** | Encabezado | Texto | Útil para validación |
| **Período de Facturación** | Encabezado | MM/AAAA | Útil para verificar antigüedad |
| **Consumo en kWh** | Cuerpo del recibo | Número | Secundario |
| **Lecturas (anterior/actual)** | Detalle consumo | Números | Secundario |
| **Total a Pagar** | Resumen | Monto en S/. | Secundario |
| **Fecha de Vencimiento** | Resumen | DD/MM/AAAA | Secundario |
| **Tipo de Tarifa** | Datos del suministro | Texto | Secundario |
| **Historial de Consumo** | Gráfico | Últimos 13 meses | Secundario |

### Desglose de Cobros Incluidos
- Cargo fijo (lectura, facturación, cobranza)
- Cargo por energía consumida
- Alumbrado público
- Aportes legales y redondeos

### QR Code
- Presente en recibo moderno
- Enlaza a sitio web oficial de Pluz para transacciones

---

## 2. RECIBOS DE LUZ - LUZ DEL SUR

### Identificación de la Empresa
- **Empresa:** Luz del Sur S.A.A.
- **Cobertura:** Distribuye energía en la zona sur de Lima

### Campos Principales en el Recibo

| Campo | Ubicación | Formato | Importancia |
|-------|-----------|---------|-------------|
| **Número de Suministro** | Superior derecho | Alfanumérico | CRÍTICO - Identifica conexión |
| **Nombre del Titular** | Encabezado | Texto | Útil para validación |
| **Dirección del Suministro** | Encabezado | Texto libre | CRÍTICO - Para validar domicilio |
| **Tipo de Tarifa** | Datos del suministro | Texto | Secundario |
| **Tipo de Conexión** | Datos del suministro | Texto | Secundario |
| **Sector Típico** | Datos del suministro | Código | Secundario |
| **Nivel de Tensión** | Datos del suministro | Código | Secundario |
| **Número de Medidor** | Datos del suministro | Número | Secundario |
| **Lectura Anterior** | Detalle consumo | Número | Útil para verificar consumo |
| **Lectura Actual** | Detalle consumo | Número | Útil para verificar consumo |
| **Consumo a Facturar** | Detalle consumo | Número en kWh | Secundario |
| **Factor del Medidor** | Detalle consumo | Decimal | Secundario |
| **Historial de Consumo** | Gráfico | Últimos 12 meses | Secundario |
| **Total a Pagar** | Resumen | Monto en S/. | Secundario |
| **QR Code** | Parte inferior | Código 2D | Enlaza a sitio web oficial |

### Formato Visual Actualizado
- Nuevo formato 2024+ con colores luminosos y cálidos
- Información organizada de forma clara e intuitiva
- Cálculo de consumo explicado de forma simple
- Cargas fijas y impuestos establecidos por el Estado

---

## 3. RECIBOS DE AGUA - SEDAPAL (Lima y Callao)

### Identificación de la Empresa
- **Empresa:** Servicio de Agua Potable y Alcantarillado de Lima (SEDAPAL)
- **Cobertura:** Lima y Callao
- **Otras empresas similares:** SEDAPAR (Arequipa), SEDALIB (otros departamentos)

### Campos Principales en el Recibo

| Campo | Ubicación | Formato | Importancia |
|-------|-----------|---------|-------------|
| **Número de Suministro** | Superior del documento | Alfanumérico | CRÍTICO - Identifica conexión agua |
| **Nombre del Titular** | Encabezado | Texto | Útil para validación |
| **Dirección del Suministro** | Encabezado | Texto libre | CRÍTICO - Para validar domicilio |
| **Período de Facturación** | Encabezado | MM/AAAA | Útil para verificar antigüedad |
| **Medidor** | Sección de lectura | Número de serie | Secundario |
| **Lectura Anterior** | Detalle consumo | m³ | Útil para verificar consumo |
| **Lectura Actual** | Detalle consumo | m³ | Útil para verificar consumo |
| **Metros Cúbicos Consumidos** | Detalle consumo | m³ | Secundario |
| **Categoria del Servicio** | Datos suministro | Texto | Secundario |
| **Tipo de Usuario** | Datos suministro | Doméstico/Comercial/Industrial | Secundario |
| **Cargo Base Fijo** | Costos | S/ 6.32 (doméstico 2026) | Secundario |
| **Tarifa por m³ Consumido** | Costos | Escalonada por tramo | Secundario |
| **Total a Pagar** | Resumen | Monto en S/. | Secundario |
| **Fecha de Vencimiento** | Resumen | DD/MM/AAAA | Secundario |

### Estructura Tarifaria 2026 (Doméstico)
- **Cargo base:** S/ 6.32
- **Hasta 10 m³:** S/ 2.20 por m³
- **De 10 a 20 m³:** S/ 2.36 por m³
- **De 20 a 50 m³:** S/ 3.22 por m³
- **Más de 50 m³:** S/ 7.32 por m³

### Nota Importante
SEDAPAL oficializó nuevas resoluciones para 2026 que modifican la estructura tarifaria. Estos cambios entraron en vigencia desde el recibo siguiente a la publicación oficial en El Peruano.

---

## 4. VALIDACIÓN COMO "COMPROBANTE DE DOMICILIO"

### Requisitos Oficiales en Perú para Certificado de Domicilio

Un recibo de servicios es aceptado como **comprobante de domicilio válido** si cumple:

| Requisito | Detalle |
|-----------|---------|
| **Antigüedad Máxima** | No debe ser de más de 2 meses expedido (< 60 días) |
| **Servicio Aceptado** | Luz, agua, gas, teléfono, internet |
| **Nombre del Titular** | Si el recibo no indica nombre, se requiere Declaración Jurada legalizada |
| **Dirección Visible** | Debe mostrar claramente la dirección del suministro |
| **Originalidad** | Debe ser recibo original, no copia (a menos que sea certificada) |
| **Documento Complementario** | Opcional: Título de propiedad o contrato de arrendamiento |

### Dónde Tramitar Certificado
- **Responsable:** Gerencia de Seguridad Ciudadana y Fiscal del municipio
- **Costo:** Tarifa municipal (varía por provincia)

---

## 5. COMPARATIVA: RECIBO DE SERVICIOS vs VOUCHER BANCARIO

| Aspecto | Recibo de Servicios | Voucher Bancario |
|--------|-------------------|------------------|
| **Propósito** | Comprobante de pago de utilidad | Comprobante de transacción bancaria |
| **Emisor** | Empresa de servicios (Pluz, SEDAPAL, etc.) | Banco/institucion financiera |
| **Información Principal** | Dirección, consumo, período facturado | Número de operación, banco, monto |
| **Campos Clave** | Número de suministro, dirección, consumo | Número de operación, código bancario |
| **Validación de Domicilio** | VÁLIDO (si < 2 meses) | NO es comprobante de domicilio |
| **Tipo de Documento** | Recibo de Servicio Público (SUNAT) | Comprobante de Pago (SUNAT) |

**CONCLUSIÓN CRÍTICA:** El sistema debe usar **tipo="recibo_servicios"**, no "voucher" para estos documentos.

---

## 6. CAMPOS CRÍTICOS A EXTRAER CON OCR

### Para llenar Formulario de Corredor (Expansión)

**OBLIGATORIOS (validar existencia):**
1. Dirección del Suministro - PRINCIPAL, para llenar campo de dirección
2. Número de Suministro - Para verificar autenticidad
3. Nombre del Titular - Para validar identidad
4. Período de Facturación - Para verificar antigüedad (< 2 meses)

**RECOMENDADOS (para auditoría):**
5. Tipo de Servicio - Luz/agua (para determinar proveedor)
6. Total a Pagar - Para verificar que es recibo válido (monto > 0)
7. Fecha de Vencimiento - Para verificar documento activo

**NO CRÍTICOS (ignorar):**
- Consumo exacto en kWh/m³
- Detalles de tarifa
- Historial de consumo
- Códigos técnicos del medidor

---

## 7. VALIDACIONES RECOMENDADAS

### Validaciones Obligatorias
```
1. El documento debe tener fecha (< 60 días)
2. El documento debe tener dirección visible
3. El documento debe tener número de suministro
4. El documento debe mostrar nombre del titular
5. El documento debe ser de empresa conocida (Pluz, Luz del Sur, SEDAPAL, etc.)
```

### Validaciones Opcionales (para mayor seguridad)
```
1. Verificar que el número de suministro tenga formato válido:
   - Pluz: 8-10 dígitos
   - Luz del Sur: alfanumérico
   - SEDAPAL: alfanumérico
2. Verificar que dirección sea válida (sin caracteres extraños)
3. Verificar que monto a pagar sea razonable (> S/ 0)
4. Verificar que período esté en mes actual o anterior
```

---

## 8. FUENTES CONSULTADAS

- [Conociendo mi recibo de luz - Pluz Energía](https://www.pluz.pe/es/ayuda/conociendo-mi-recibo-de-luz-de-enel.html)
- [Nuevo recibo físico de Luz del Sur](https://www.luzdelsur.pe/es/InformacionCorporativa/Noticia?id=5)
- [Recibos de agua SEDAPAL 2026 - El Comercio](https://elcomercio.pe/economia/peru/recibos-de-agua-en-lima-y-callao-sufririan-alza-este-2026-conoce-cuales-seran-los-nuevos-montos-l-ultimas-noticia/)
- [Comprobante de Domicilio requisitos - iPeru](https://iperu.pe/tramites/como-sacar-certificado-de-domicilio-en-peru-requisitos-y-pasos/)
- [Recibo de Servicios Públicos SUNAT](https://cpe.sunat.gob.pe/tipos_de_comprobantes/recibo_de_servicio_publico)
- [Consulta tu recibo de luz - Infobae Perú](https://www.infobae.com/peru/2024/12/10/consulta-tu-recibo-de-luz-por-internet-guia-paso-a-paso-para-pluz-y-luz-del-sur/)
- [¿Cómo saber mi número de suministro SEDAPAL](https://www.moda.com.pe/noticias/actualidad/numero-de-suministro-de-sedapal-como-encontrarlo-recibo-pasos/)
- [App Mi Recibo de Luz Agua Gas Perú - Google Play](https://play.google.com/store/apps/details?id=com.beyondthecode.lectorserviciosapp)

---

## 9. RECOMENDACIONES PARA EL SISTEMA

### Cambios Recomendados Inmediatos

1. **Renombrar tipo de documento**
   - Cambiar de: `tipo="voucher"`
   - A: `tipo="recibo_servicios"` o `tipo="comprobante_domicilio"`

2. **Agregar validaciones específicas**
   - Campo requerido: dirección
   - Campo requerido: número de suministro
   - Campo requerido: período facturación
   - Validar que período sea < 60 días

3. **Mejorar instrucciones al usuario**
   - Especificar que aceptamos: recibos de luz, agua, gas, teléfono
   - Advertir: documento no debe ser mayor a 2 meses
   - Mostrar ejemplo de recibo válido

4. **Configurar OCR correctamente**
   - Buscar texto: "Número de Suministro", "Número de Cliente"
   - Extraer dirección del primer párrafo/encabezado
   - Extraer período en formato MM/AAAA
   - Validar que empresa es conocida

---

## 10. NOTAS IMPORTANTES

### Cambios 2024-2026
- ENEL cambió nombre a Pluz Energía en julio 2024
- SEDAPAL modificó tarifas en 2026
- Luz del Sur renovó diseño de recibos (colores y formato)

### Limitaciones Identificadas
- No hay formato PDF/XML estándar obligatorio en Perú para recibos
- Cada empresa tiene su propio diseño y layout
- OCR debe ser flexible para múltiples distribuidoras

### Recomendación Final
Para máxima precisión, se recomienda permitir tanto:
1. Carga de imagen del recibo físico (con OCR)
2. Descarga directa de recibo PDF desde portal online de empresa (más limpio)

---

**Documento Actualizado:** 13 de enero de 2026
**Responsable de Investigación:** Strategic Research Agent
**Estado:** RECOMENDACIONES LISTAS PARA IMPLEMENTACIÓN
