# Documentos Peruanos - Referencia para Test Assets

**Fecha:** 13 de Enero 2026
**Propósito:** Documentación de formatos oficiales de documentos peruanos para crear test assets sintéticos

---

## 1. RECIBOS DE LUZ (SERVICIO ELÉCTRICO)

### Empresas Principales

| Empresa | Zona de Cobertura | Estado Actual |
|---------|-------------------|---------------|
| **Luz del Sur** | Lima Sur, Villa El Salvador, Chorrillos, etc. | Operando |
| **Enel / Pluz Energía** | Lima Norte, Cercado de Lima, Ate, etc. | Cambió nombre a "Pluz Energía Perú S.A.A." el 15/07/2024 |
| **Seal** | Arequipa | Operando |
| **Electronoroeste** | Piura, Tumbes | Operando |
| **Electro Sur Este** | Cusco, Puno, Apurímac | Operando |
| **Electronorte** | Cajamarca, Amazonas, San Martín | Operando |

### Campos Típicos del Recibo

#### Luz del Sur

| Campo | Ubicación | Descripción |
|-------|-----------|-------------|
| **Número de Suministro** | Parte superior derecha | Código único que identifica al usuario (combinación alfanumérica) |
| **Nombre del Titular** | Encabezado | Nombre completo del cliente registrado |
| **Dirección de Suministro** | Encabezado | Dirección del inmueble donde se presta el servicio |
| **Período de Facturación** | Superior | Mes/año del consumo facturado |
| **Fecha de Vencimiento** | Destacado | Fecha límite de pago sin recargo |
| **Lectura Anterior** | Detalle de consumo | Lectura del medidor del mes anterior |
| **Lectura Actual** | Detalle de consumo | Lectura del medidor del mes actual |
| **Consumo kWh** | Destacado | Diferencia entre lectura actual y anterior (en kilowatts-hora) |
| **Precio por kWh** | Detalle | Tarifa establecida por Osinergmin en soles |
| **Importe por Energía** | Detalle | Consumo kWh × Precio unitario |
| **Cargos Fijos** | Detalle | Cargo fijo mensual por mantenimiento |
| **IGV (18%)** | Detalle | Impuesto General a las Ventas |
| **Total a Pagar** | Destacado (grande) | Monto final en soles (S/) |
| **Historial de Consumo** | Gráfico/tabla | Últimos 6-12 meses de consumo |
| **Código de Barras** | Inferior | Para pagos en agentes/bancos |

#### Enel / Pluz Energía

Similar a Luz del Sur, con estos campos clave:

| Campo | Descripción |
|-------|-------------|
| **Código de Cliente** | Identificador del cliente (numérico) |
| **Número de Suministro** | Código del punto de suministro |
| **Tarifa Aplicable** | BT5A, BT5B, etc. (tarifa residencial) |
| **Potencia Contratada** | En kW (si aplica) |
| **Factor de Potencia** | Para clientes comerciales/industriales |

### Diseño y Layout Típico

**Estructura general:**
```
┌─────────────────────────────────────────────────┐
│ [LOGO EMPRESA]              Nro. Suministro: XX │
│                                                  │
│ Titular: NOMBRE COMPLETO                        │
│ Dirección: CALLE XXX, DISTRITO, LIMA            │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │  TOTAL A PAGAR:  S/ XXX.XX               │   │
│ │  Vencimiento:    DD/MM/AAAA              │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ Período: MM/AAAA                                │
│ Lectura Anterior:     XXX kWh                   │
│ Lectura Actual:       XXX kWh                   │
│ Consumo:              XXX kWh                   │
│                                                  │
│ DETALLE DE FACTURACIÓN                          │
│ --------------------------------                 │
│ Energía Activa:       S/ XX.XX                  │
│ Cargo Fijo:           S/ XX.XX                  │
│ Alumbrado Público:    S/ XX.XX                  │
│ IGV (18%):            S/ XX.XX                  │
│ --------------------------------                 │
│ TOTAL:                S/ XXX.XX                 │
│                                                  │
│ [Gráfico historial consumo últimos 6 meses]    │
│                                                  │
│ [CÓDIGO DE BARRAS]                              │
└─────────────────────────────────────────────────┘
```

**Colores típicos:**
- **Luz del Sur:** Azul, blanco, verde agua
- **Enel/Pluz:** Rojo, blanco, gris

### Información Regulatoria

- Regulado por **Osinergmin** (Organismo Supervisor de la Inversión en Energía y Minería)
- Tarifas se actualizan trimestralmente
- El recibo debe mostrar claramente: consumo, tarifa, cargos, impuestos

---

## 2. RECIBOS DE AGUA (SERVICIO DE AGUA POTABLE Y ALCANTARILLADO)

### Empresas Principales (EPS)

| Empresa | Zona de Cobertura | Regulador |
|---------|-------------------|-----------|
| **Sedapal** | Lima y Callao | Sunass |
| **Sedapar** | Arequipa | Sunass |
| **Sedalib** | La Libertad (Trujillo) | Sunass |
| **EPS Grau** | Piura | Sunass |
| **Epsel** | Lambayeque (Chiclayo) | Sunass |
| **Sedajuliaca** | Puno (Juliaca) | Sunass |

### Campos Típicos del Recibo

#### Sedapal (Lima y Callao)

| Campo | Ubicación | Descripción |
|-------|-----------|-------------|
| **Número de Suministro** | Parte superior derecha | Código alfanumérico único (ej: 12345678-9) |
| **Código de Cliente** | Superior | Identificador del cliente |
| **Nombre del Titular** | Encabezado | Nombre completo registrado |
| **Dirección del Servicio** | Encabezado | Dirección exacta del inmueble |
| **DNI/RUC del Titular** | Datos del cliente | Documento de identidad |
| **Período de Facturación** | Superior | Mes/año del servicio facturado |
| **Fecha de Vencimiento** | Destacado | Fecha límite de pago |
| **Lectura Anterior** | Detalle | Lectura del medidor del mes anterior (m³) |
| **Lectura Actual** | Detalle | Lectura del medidor actual (m³) |
| **Consumo m³** | Destacado | Diferencia en metros cúbicos |
| **Volumen Facturado** | Detalle | Puede incluir promedio si no hay lectura |
| **Tarifa por m³** | Detalle | Según categoría (social, doméstica, comercial, industrial) |
| **Agua Potable** | Detalle de cobro | Monto por consumo de agua |
| **Alcantarillado** | Detalle de cobro | Usualmente ~40-50% del costo de agua |
| **Cargo Fijo Mensual** | Detalle | Cargo fijo según empresa (Sedapal: S/ 6.32 en 2026) |
| **IGV (18%)** | Detalle | Impuesto General a las Ventas |
| **Total a Pagar** | Destacado (grande) | Monto total en soles (S/) |
| **Deuda Anterior** | Si aplica | Montos pendientes de meses anteriores |
| **Código de Barras** | Inferior | Para pagos en agentes |

#### Tarifas 2026 por Empresa

**Sedapal (Lima/Callao) - Categoría Doméstica:**
- 0-10 m³: S/ 2.20 por m³
- 10-20 m³: S/ 2.36 por m³
- 20-50 m³: S/ 3.22 por m³
- Más de 50 m³: S/ 7.32 por m³
- Cargo fijo: S/ 6.32

**Sedapar (Arequipa) - Categoría Doméstica:**
- 0-10 m³: S/ 1.21 por m³
- 10-25 m³: S/ 2.14 por m³
- Más de 25 m³: S/ 4.36 por m³
- Cargo fijo: S/ 3.71

**Sedalib (La Libertad) - Categoría Doméstica:**
- Cargo fijo: S/ 4.82

### Diseño y Layout Típico

**Estructura general:**
```
┌─────────────────────────────────────────────────┐
│ [LOGO SEDAPAL/EPS]     Nro. Suministro: XXXXXX  │
│                                                  │
│ Cliente: NOMBRE COMPLETO                        │
│ DNI: 12345678                                   │
│ Dirección: CALLE XXX, DISTRITO, LIMA            │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │  IMPORTE TOTAL:  S/ XXX.XX               │   │
│ │  Vence:          DD/MM/AAAA              │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ Período: MM/AAAA                                │
│ Lectura Anterior:     XXX m³                    │
│ Lectura Actual:       XXX m³                    │
│ Consumo:              XX m³                     │
│                                                  │
│ DETALLE DE FACTURACIÓN                          │
│ --------------------------------                 │
│ Agua Potable (XX m³):   S/ XX.XX                │
│ Alcantarillado:         S/ XX.XX                │
│ Cargo Fijo:             S/ X.XX                 │
│ IGV (18%):              S/ XX.XX                │
│ --------------------------------                 │
│ TOTAL:                  S/ XXX.XX               │
│                                                  │
│ Deuda Anterior:         S/ 0.00                 │
│ TOTAL A PAGAR:          S/ XXX.XX               │
│                                                  │
│ [CÓDIGO DE BARRAS]                              │
│                                                  │
│ Plataforma: www.sedapal.com.pe - Aquanet        │
└─────────────────────────────────────────────────┘
```

**Colores típicos:**
- **Sedapal:** Azul, celeste, blanco
- **Sedapar:** Verde, blanco
- **Sedalib:** Azul, blanco

### Información Regulatoria

- Regulado por **Sunass** (Superintendencia Nacional de Servicios de Saneamiento)
- Las tarifas se revisan periódicamente mediante resoluciones
- Los recibos pueden consultarse digitalmente en plataformas como **Aquanet** (Sedapal) o apps móviles
- El recibo debe indicar claramente: consumo, categoría tarifaria, servicios incluidos (agua + alcantarillado)

### Plataformas Digitales

- **Sedapal:** Aquanet (oficina virtual), app "Sedapal Móvil"
- Los recibos se pueden descargar en formato PDF
- Opción de recibir por correo electrónico
- Pagos en línea disponibles

---

## 3. DECLARACIÓN JURADA DE DOMICILIO

### Marco Legal

| Aspecto | Detalle |
|---------|---------|
| **Base Legal** | Ley No. 27444 - Ley de Procedimiento Administrativo General |
| **Sanciones** | Ley No. 28882 - Los funcionarios que no acepten este formato incurren en falta administrativa |
| **Penalidad por Falsedad** | Art. 427° del Código Penal - Sanciones por declarar información falsa |

### Requisitos y Características

**Tipo de Documento:**
- Declaración jurada simple (no requiere notarización para mayoría de trámites)
- Escrito en primera persona
- Solo requiere firma del declarante
- Papel simple con datos y firma

**Excepciones que NO admiten DJ simple:**
- Trámites electorales (ONPE, JNE)
- Trámites judiciales (Poder Judicial)
- Algunos trámites notariales específicos

### Campos Requeridos

1. **Encabezado o Título**
   - "DECLARACIÓN JURADA DE DOMICILIO"

2. **Datos Personales del Declarante**
   - Nombre completo (apellidos y nombres)
   - Edad (años cumplidos)
   - Documento de identidad: DNI o Pasaporte (número completo)
   - Estado civil (opcional en algunos formatos)
   - Ocupación (opcional en algunos formatos)

3. **Declaración de Domicilio**
   - Dirección completa actual
   - Distrito
   - Provincia
   - Departamento
   - Referencia adicional (opcional)

4. **Texto de Declaración Legal**
   - Afirmación de veracidad
   - Responsabilidad bajo sanción penal

5. **Lugar y Fecha**
   - Ciudad, fecha (día, mes, año)

6. **Firma del Declarante**
   - Firma manuscrita
   - Huella digital (opcional, algunos formatos)

### Formato Oficial Estándar

```
                    DECLARACIÓN JURADA DE DOMICILIO


Yo, [NOMBRES Y APELLIDOS COMPLETOS], identificado(a) con DNI No. [XXXXXXXX],
de [XX] años de edad, con domicilio en [DIRECCIÓN COMPLETA, DISTRITO,
PROVINCIA, DEPARTAMENTO].


DECLARO BAJO JURAMENTO:


Que la dirección señalada líneas arriba es mi domicilio real, actual, efectivo
y verdadero, donde tengo vivencia real, física y permanente.

Declaro conocer las sanciones contempladas en el artículo 427° del Código Penal,
concordante con el artículo 32.3 de la Ley 27444, Ley del Procedimiento
Administrativo General, en caso de comprobarse falsedad en la presente declaración.


                                    [Ciudad], [DD] de [Mes] de [AAAA]



                                    _________________________
                                    Firma del Declarante
                                    DNI No. [XXXXXXXX]
```

### Variantes Comunes

#### Declaración Jurada de Domicilio y Estado Civil

```
                    DECLARACIÓN JURADA DE DOMICILIO Y ESTADO CIVIL


Yo, [NOMBRES Y APELLIDOS COMPLETOS], identificado(a) con DNI No. [XXXXXXXX],
de nacionalidad peruana, de [XX] años de edad, de estado civil [SOLTERO(A)/
CASADO(A)/DIVORCIADO(A)/VIUDO(A)], de ocupación [OCUPACIÓN].


DECLARO BAJO JURAMENTO:


1. Que mi domicilio real y habitual se encuentra ubicado en: [DIRECCIÓN COMPLETA],
   Distrito de [DISTRITO], Provincia de [PROVINCIA], Departamento de [DEPARTAMENTO].

2. Que mi estado civil es: [ESTADO CIVIL].

3. Que la información consignada es veraz y me someto a las sanciones establecidas
   en el artículo 427° del Código Penal, en caso de comprobarse falsedad.


                                    [Ciudad], [DD] de [Mes] de [AAAA]



                                    _________________________
                                    Firma del Declarante
                                    DNI No. [XXXXXXXX]
```

### Ejemplo Completo Llenado

```
                    DECLARACIÓN JURADA DE DOMICILIO


Yo, MARÍA ELENA RODRÍGUEZ GARCÍA, identificada con DNI No. 45678912,
de 34 años de edad, con domicilio en Av. Javier Prado Este 456, Dpto. 502,
San Isidro, Lima, Lima.


DECLARO BAJO JURAMENTO:


Que la dirección señalada líneas arriba es mi domicilio real, actual, efectivo
y verdadero, donde tengo vivencia real, física y permanente.

Declaro conocer las sanciones contempladas en el artículo 427° del Código Penal,
concordante con el artículo 32.3 de la Ley 27444, Ley del Procedimiento
Administrativo General, en caso de comprobarse falsedad en la presente declaración.


                                    Lima, 13 de Enero de 2026



                                    _________________________
                                    María Elena Rodríguez García
                                    DNI No. 45678912
```

### Diseño y Formato

**Características de presentación:**
- Papel tamaño A4 (bond blanco)
- Márgenes: 2.5 cm en todos los lados
- Fuente: Arial o Times New Roman, 11-12 puntos
- Título centrado y en mayúsculas
- Texto justificado o alineado a la izquierda
- Espaciado: 1.5 o doble espacio
- Firma al final del documento

**Elemento visual:**
```
┌────────────────────────────────────────────┐
│                                            │
│    DECLARACIÓN JURADA DE DOMICILIO        │
│                                            │
│                                            │
│ Yo, [NOMBRE], DNI [XXX], edad [XX]...     │
│ domicilio en [DIRECCIÓN]...               │
│                                            │
│                                            │
│ DECLARO BAJO JURAMENTO:                   │
│                                            │
│ Que la dirección señalada...              │
│ ...es mi domicilio real, actual...        │
│                                            │
│ Sanciones Art. 427° Código Penal...       │
│                                            │
│                                            │
│          [Ciudad], [Fecha]                 │
│                                            │
│                                            │
│          ___________________               │
│          Firma                             │
│          DNI No. [XXXXXXXX]               │
│                                            │
└────────────────────────────────────────────┘
```

---

## 4. CONSIDERACIONES PARA TEST ASSETS SINTÉTICOS

### Datos Ficticios a Usar

**Nombres peruanos típicos:**
- Hombres: José Luis, Carlos Alberto, Juan Carlos, Miguel Ángel, Ricardo
- Mujeres: María Elena, Rosa María, Carmen Rosa, Ana María, Patricia
- Apellidos: García, Rodríguez, López, Pérez, Gonzales, Ramírez, Torres, Flores, Vásquez, Chávez

**Direcciones ficticias:**
- Av. Javier Prado Este/Oeste
- Av. Arequipa
- Calle Las Begonias
- Jr. De la Unión
- Distritos: San Isidro, Miraflores, Surco, La Molina, San Borja, Jesús María

**Números de DNI:**
- Formato: 8 dígitos (ej: 45678912, 12345678)
- Evitar números reales, usar combinaciones aleatorias

**Números de suministro ficticios:**
- Luz: 7-10 dígitos (ej: 1234567, 98765432)
- Agua: 8-10 dígitos con guión (ej: 12345678-9)

### Rangos de Consumo Realistas

**Electricidad (hogar promedio):**
- Bajo consumo: 80-150 kWh/mes
- Consumo medio: 150-300 kWh/mes
- Consumo alto: 300-500 kWh/mes

**Agua (hogar promedio):**
- Bajo consumo: 8-15 m³/mes
- Consumo medio: 15-25 m³/mes
- Consumo alto: 25-40 m³/mes

### Herramientas Sugeridas para Crear Test Assets

1. **Para recibos PDF:**
   - Canva (plantillas editables)
   - Microsoft Word (formato A4, exportar a PDF)
   - Google Docs (exportar a PDF)

2. **Para declaraciones juradas:**
   - Microsoft Word / Google Docs
   - Formato simple, fácil de editar

3. **Códigos de barras:**
   - Generadores online: barcode.tec-it.com
   - Tipo: Code 128 o Code 39

---

## 5. FUENTES Y REFERENCIAS

### Documentación Oficial

- **Osinergmin:** Organismo regulador del sector eléctrico - [www.osinergmin.gob.pe](https://www.osinergmin.gob.pe)
- **Sunass:** Regulador del sector agua y saneamiento - [www.sunass.gob.pe](https://www.sunass.gob.pe)
- **Gobierno del Perú:** Plataforma oficial de trámites - [www.gob.pe](https://www.gob.pe)

### Fuentes Consultadas (Enero 2026)

**Recibos de Luz:**
- [Consulta tu recibo de luz por Internet: guía paso a paso para Pluz y Luz del Sur - Infobae](https://www.infobae.com/peru/2024/12/10/consulta-tu-recibo-de-luz-por-internet-guia-paso-a-paso-para-enel-y-luz-del-sur/)
- [¿Cómo ver mi recibo de luz online de Enel, Luz del Sur y otras empresas eléctricas del Perú? - La República](https://larepublica.pe/datos-lr/2023/08/04/recibo-de-luz-online-como-ver-mi-recibo-con-mi-numero-de-dni-y-codigo-de-suministro-recibo-enel-recibo-luz-del-sur-recibo-distriluz-nspe-131040)
- [Nuevo recibo físico de Luz del Sur tiene diseño intuitivo - Luz del Sur](https://www.luzdelsur.pe/es/InformacionCorporativa/Noticia?id=5)

**Recibos de Agua:**
- [Sedapal: Recibos de agua en Lima y Callao sufrirían alza este 2026 - El Comercio](https://elcomercio.pe/economia/peru/recibos-de-agua-en-lima-y-callao-sufririan-alza-este-2026-conoce-cuales-seran-los-nuevos-montos-l-ultimas-noticia/)
- [Acceder a la oficina virtual de Sedapal - Aquanet - gob.pe](https://www.gob.pe/12766-acceder-a-la-oficina-virtual-de-sedapal-aquanet)
- [Sedapal en línea: ¿cómo puedo ver mi recibo de agua por internet? - La República](https://larepublica.pe/sociedad/2023/06/01/recibo-de-agua-2023-con-numero-de-suministro-como-puedo-ver-mi-recibo-de-agua-por-internet-y-como-saber-mi-recibo-de-pago-de-agua-en-sedapal-wwwsedapalcompe-88495)
- [Cómo leer tu recibo de agua para saber qué te están cobrando - Gestión](https://gestion.pe/economia/como-leer-tu-recibo-de-agua-para-saber-que-te-estan-cobrando-sedapal-sunass-nnda-nnlt-noticia/)
- [Oficializan cambios en la tarifa del agua: Sedapal, Sedapar y Sedalib - Infobae](https://www.infobae.com/peru/2025/12/23/oficializan-cambios-en-tarifas-de-agua-sedapal-sedapar-y-sedalib-aplicaran-nuevos-cobros-desde-el-proximo-recibo/)

**Declaración Jurada de Domicilio:**
- [Formato Declaración Jurada de Domicilio - gob.pe](https://cdn.www.gob.pe/uploads/document/file/2260574/formato%20declaracion%20jurada%20domicilio.pdf.pdf)
- [¿Cómo escribir una declaración jurada de domicilio simple? - Gestión](https://gestion.pe/economia/management-empleo/escribir-declaracion-jurada-domicilio-simple-sirve-documento-modelo-nnda-nnlt-252039-noticia/)
- [¿Qué es y cómo hacer la declaración jurada de domicilio? - Prestamype](https://www.prestamype.com/articulos/que-es-y-como-hacer-la-declaracion-jurada-de-domicilio)

---

**Última actualización:** 13 de Enero de 2026
**Versión:** 1.0
**Proyecto:** EcoPlaza Dashboard - Test Assets Documentation
