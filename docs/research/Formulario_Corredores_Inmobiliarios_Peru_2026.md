# Investigación: Formularios de Corredores Inmobiliarios - EcoPlaza 2026

## Resumen Ejecutivo

Esta investigación analiza las mejores prácticas para implementar un sistema de registro de corredores inmobiliarios y envío de terrenos para EcoPlaza, enfocado en el mercado peruano y orientado al desarrollo de mercados comerciales.

### Hallazgos Clave

1. **Marco Legal Establecido**: Perú cuenta con la Ley 29080 que regula el Registro de Agentes Inmobiliarios del Ministerio de Vivienda, estableciendo requisitos claros para ejercer como corredor.

2. **Documentación Estándar**: Los corredores peruanos requieren certificación formal, DNI, RUC y antecedentes penales limpios.

3. **Evaluación de Terrenos**: Los desarrolladores inmobiliarios evalúan terrenos considerando: ubicación estratégica, zonificación comercial, partida registral, documentos de propiedad, topografía y habilitación urbana.

4. **Benchmarks de Industria**: Plataformas como Urbania (668 agentes registrados) y Adondevivir lideran el mercado peruano, priorizando formularios simples con integración CRM.

5. **UX/UI Optimizada**: Las mejores prácticas indican formularios accesibles, sencillos, con integración CRM automática y sin solicitar información excesiva en la primera etapa.

---

## Hallazgos Principales

### 1. Marco Legal y Requisitos para Corredores en Perú

**Fuente:** Ministerio de Vivienda, Construcción y Saneamiento (MVCS)

**Regulación:** Ley N° 29080 - Ley de Creación del Registro del Agente Inmobiliario

**Relevancia para ECOPLAZA:**
Para que EcoPlaza opere un sistema de corredores legalmente, debe verificar que los corredores registrados cumplan con la normativa peruana. Esto protege a la empresa de responsabilidad legal y garantiza profesionalismo.

#### Documentos Requeridos por Ley:

| Documento | Descripción | Obligatorio |
|-----------|-------------|-------------|
| **DNI** | Documento Nacional de Identidad | SÍ |
| **RUC** | Registro Único de Contribuyentes | SÍ |
| **Código Agente Inmobiliario** | Código del Ministerio de Vivienda | RECOMENDADO |
| **Constancia de Curso** | Curso de Especialización para Agentes Inmobiliarios | PARA CERTIFICADOS |
| **Antecedentes Penales** | Certificado de Registro Nacional de Condenas | PARA CERTIFICADOS |
| **Declaración Jurada Domicilio** | Según Ley 28882 | PARA CERTIFICADOS |
| **Partida Registral** | Solo si es persona jurídica | OPCIONAL |

#### Proceso de Certificación:

1. Realizar Curso de Especialización en institución autorizada por MVCS
2. Completar Formulario FIR (Formulario de Inscripción en el Registro)
3. Presentar documentos requeridos
4. Obtener Código de Agente Inmobiliario (plazo: 10 días)

**Recomendación para EcoPlaza:**
- **Nivel Básico**: Solicitar DNI y RUC como mínimo
- **Nivel Verificado**: Solicitar Código de Agente Inmobiliario del MVCS
- **Nivel Premium**: Verificar certificación completa y antecedentes

---

### 2. Evaluación de Terrenos para Desarrollo Comercial

**Fuente:** Estudios de mercado inmobiliario peruano 2026, desarrolladores líderes

**Relevancia para ECOPLAZA:**
EcoPlaza construye mercados comerciales (como Trapiche y Mariátegui). Los criterios de evaluación deben enfocarse en terrenos aptos para uso comercial, con alta densidad poblacional y accesibilidad.

#### Criterios Clave de Evaluación:

##### A. Ubicación Estratégica

**Datos de Industria 2026:**
- Desarrolladores como Solar Inmobiliaria y Tale Inmobiliaria están invirtiendo US$15-18 millones en adquisición de terrenos estratégicos
- Focos: Surquillo, Magdalena, Chorrillos, Barranco (Lima Moderna y Lima Sur)
- Criterio: Proximidad a infraestructura, proyectos de transporte, densidad poblacional

**Campos del Formulario:**
```
- Departamento / Provincia / Distrito
- Dirección exacta
- Coordenadas GPS (latitud/longitud)
- Zona (urbana/periurbana/rural)
- Acceso a vías principales (sí/no)
- Transporte público cercano (sí/no)
- Distancia al centro comercial más cercano
```

##### B. Características del Terreno

**Según Reglamento Nacional de Tasaciones de Perú:**

| Factor | Descripción | Impacto en Valor |
|--------|-------------|------------------|
| **Topografía** | Plano, pendiente leve, pendiente pronunciada | Alto |
| **Geometría** | Regular, irregular, forma óptima | Medio |
| **Calidad del Suelo** | Firme, inundable, rocoso | Alto |
| **Área Total** | m² disponibles | Crítico |
| **Habilitación Urbana** | Con servicios / sin servicios | Alto |

**Campos del Formulario:**
```
- Área total del terreno (m²)
- Frente del terreno (m)
- Fondo del terreno (m)
- Topografía (plano/pendiente leve/pronunciada)
- Forma (regular/irregular)
- Nivel de suelo (firme/inundable/rocoso)
```

##### C. Zonificación y Uso de Suelo

**Marco Legal:** Regulado por Ley 27972 (Ley Orgánica de Municipalidades) y Reglamento Nacional de Edificaciones (RNE)

**Tipos de Zonificación Comercial en Perú:**
- **CV (Comercio Vecinal)**: Tiendas de barrio, pequeño comercio
- **CZ (Comercio Zonal)**: Centros comerciales medianos
- **CM (Comercio Metropolitano)**: Grandes centros comerciales, mercados

**Relevancia para Mercados EcoPlaza:**
Los mercados requieren zonificación **Comercio Zonal (CZ)** o **Comercio Metropolitano (CM)** según el tamaño proyectado.

**Campos del Formulario:**
```
- Zonificación actual (Residencial/Comercial/Industrial/Mixta)
- Tipo de zonificación comercial (CV/CZ/CM)
- ¿Requiere cambio de zonificación? (sí/no)
- Compatibilidad para mercado comercial (alta/media/baja)
```

##### D. Servicios Básicos

**Campos del Formulario:**
```
- Agua potable (sí/no)
- Desagüe (sí/no)
- Electricidad (sí/no)
- Gas natural (sí/no)
- Internet/telecomunicaciones (sí/no)
- Pavimentación de vías (sí/no)
```

##### E. Documentación Legal del Terreno

**Según SUNARP (Superintendencia Nacional de Registros Públicos):**

**Documentos Esenciales:**

| Documento | Descripción | Propósito |
|-----------|-------------|-----------|
| **Partida Registral** | Historial registral del predio en SUNARP | Verificar propiedad, cargas, gravámenes |
| **Título de Propiedad** | Escritura pública de compraventa/donación | Acreditar propiedad legal |
| **Certificado de Parámetros Urbanísticos** | Emitido por municipalidad | Zonificación, altura permitida, uso de suelo |
| **Plano de Ubicación** | Sitúa el predio en la manzana | Verificar linderos y ubicación exacta |
| **Plano Perimétrico** | Dimensiones y linderos exactos | Medidas precisas |
| **Plano de Localización** | Contexto urbano amplio | Ubicación en el distrito/ciudad |

**Campos del Formulario (Upload de Documentos):**
```
- Partida registral SUNARP (PDF)
- Título de propiedad o promesa de venta (PDF)
- Certificado de parámetros urbanísticos (PDF)
- Plano de ubicación (PDF/JPG)
- Plano perimétrico (PDF/JPG)
- Fotos del terreno (múltiples JPG)
- Video del terreno (MP4) - OPCIONAL
```

##### F. Información del Propietario

**Campos del Formulario:**
```
- Nombre del propietario actual
- Tipo de propietario (persona natural/jurídica)
- DNI/RUC del propietario
- Teléfono de contacto del propietario
- ¿Propietario dispuesto a vender? (sí/no/negociando)
- Precio solicitado por el propietario (opcional)
```

---

### 3. Tasación y Precio de Terrenos

**Fuente:** Reglamento Nacional de Tasaciones del Perú

**Relevancia para ECOPLAZA:**
EcoPlaza necesita evaluar rápidamente si el precio de un terreno es razonable antes de invertir tiempo en due diligence completo.

#### Métodos de Tasación en Perú:

**Método de Mercado (más usado para terrenos):**
- Comparar valores de terrenos similares en la zona
- Ajustar por diferencias (área, ubicación, servicios)
- Analizar ventas recientes

**Factores de Ajuste:**
- **Sin habilitación urbana**: -15% a -30%
- **Topografía irregular**: -10% a -20%
- **Zonificación incompatible**: -20% a -40%
- **Sin acceso a vías principales**: -15% a -25%

**Costos de Tasación Profesional en Lima:**
- Terreno menor a 1,000 m²: S/ 500 soles
- Terreno mayor a 1,000 m²: S/ 800-1,200 soles

**Campos del Formulario:**
```
- Precio solicitado por propietario (USD o PEN)
- Precio por m² (calculado automáticamente)
- ¿Ya cuenta con tasación profesional? (sí/no)
- Documento de tasación (PDF) - OPCIONAL
- Precio de terrenos comparables en la zona (referencia)
```

---

### 4. Benchmarks de Plataformas Similares en Perú

**Fuente:** Análisis de Urbania, Adondevivir, plataformas líderes 2026

#### Urbania - Líder del Mercado Peruano

**Datos Clave:**
- **668 agentes registrados** en su plataforma
- **12 años en el mercado**
- **3.2 millones de avisos publicados**
- Modelo de pago por publicación (no gratuito)

**Características de UX/UI:**
- Portal centralizado para búsqueda de propiedades
- Perfiles de corredores con calificaciones
- Filtros avanzados (ubicación, precio, tipo)
- Integración con WhatsApp para contacto directo

**Lecciones para EcoPlaza:**
- Perfil de corredor con historial de envíos
- Sistema de calificación/reputación
- Notificaciones automáticas de estado de evaluación
- Panel de control para corredores con métricas

#### Mejores Prácticas de UX/UI 2026

**Según estudios de plataformas inmobiliarias:**

**1. Formularios Sencillos y Directos**
- No pedir información excesiva en la primera etapa
- Dividir formulario largo en pasos (wizard)
- Guardar progreso automáticamente
- Campos obligatorios claramente marcados

**2. Integración con CRM**
- Información guardada automáticamente
- Seguimiento de leads centralizado
- Correos electrónicos personalizados automáticos
- Organización de contactos sin esfuerzo manual

**3. Accesibilidad y Disponibilidad**
- Formularios accesibles en todo momento
- Diseño responsive (móvil, tablet, desktop)
- Carga de documentos desde cualquier dispositivo
- WhatsApp integration para consultas rápidas

**4. Transparencia y Comunicación**
- Estados claros del proceso de evaluación
- Notificaciones en tiempo real
- Timeline visible del avance
- Feedback constructivo si el terreno no es aprobado

---

### 5. Tendencias del Mercado Inmobiliario Peruano 2026

**Fuente:** Gestión, Infobae, análisis de mercado

**Inversiones Activas:**
- Solar Inmobiliaria: US$15 millones en proyectos para 2026
- Tale Inmobiliaria: US$15.7 millones (primer trimestre) en 4 proyectos nuevos
- Viva Inmobiliaria: US$18 millones triplicando inversión
- Cencosud: US$600 millones (70% en crecimiento, expansión de centros comerciales)

**Zonas Estratégicas 2026:**
- **Lima Moderna**: Barranco, Chorrillos, San Isidro, San Miguel, Surco, Miraflores
- **Lima Sur**: Surquillo, Magdalena
- **Expansión Regional**: Arequipa, Tacna, Ilo

**Drivers de Crecimiento:**
- Proyectos de infraestructura (transporte, vías)
- Crecimiento demográfico en zonas emergentes
- Tecnología y digitalización del sector
- Sostenibilidad ambiental como diferenciador

**Relevancia para EcoPlaza:**
El mercado está activo y competitivo. Un sistema eficiente de captación de terrenos vía corredores puede darle ventaja competitiva a EcoPlaza para encontrar oportunidades antes que la competencia.

---

## Flujo Óptimo del Proceso

### Fase 1: Registro del Corredor

```
1. Landing page con value proposition clara
   "Conviértete en Corredor Asociado de EcoPlaza"

2. Formulario de Registro Inicial (simple)
   - Nombre completo
   - Email
   - Teléfono/WhatsApp
   - DNI
   - RUC (opcional en esta etapa)
   - ¿Tienes código de agente inmobiliario? (sí/no)
   - Breve descripción de experiencia

3. Confirmación por email
   "Tu solicitud ha sido recibida. Te contactaremos en 48h"

4. Revisión Interna por EcoPlaza
   - Verificar DNI en RENIEC
   - Verificar RUC en SUNAT
   - Verificar código agente en MVCS (si aplica)
   - Llamada de validación

5. Aprobación/Rechazo
   - Email de aprobación con acceso al portal
   - O email de rechazo con razones
```

**Tiempo estimado:** 2-5 días

### Fase 2: Envío de Terreno por Corredor

```
1. Login al Portal de Corredores

2. Dashboard con:
   - Terrenos enviados (pendientes/aprobados/rechazados)
   - Métricas personales
   - Notificaciones

3. Botón "Enviar Nuevo Terreno"

4. Formulario de Terreno (Wizard en 5 pasos)

   PASO 1: Ubicación
   - Departamento
   - Provincia
   - Distrito
   - Dirección exacta
   - Coordenadas GPS (opcional, auto-detectar)

   PASO 2: Características del Terreno
   - Área total (m²)
   - Frente (m) / Fondo (m)
   - Topografía
   - Forma
   - Zonificación actual
   - Servicios disponibles (checkboxes)

   PASO 3: Documentación Legal
   - Upload Partida Registral
   - Upload Título de propiedad
   - Upload Certificado parámetros
   - Upload Planos
   - Fotos del terreno (mínimo 5)

   PASO 4: Información del Propietario
   - Nombre
   - Contacto
   - Precio solicitado
   - ¿Dispuesto a vender?

   PASO 5: Información Adicional
   - Observaciones
   - Por qué este terreno es ideal para un mercado
   - Análisis de la zona (opcional)

5. Confirmación de Envío
   "Tu terreno ha sido enviado con código #TER-2026-001"

6. Notificaciones automáticas de cambio de estado
```

**Tiempo de llenado estimado:** 15-20 minutos

### Fase 3: Evaluación Interna por EcoPlaza

```
1. Notificación al equipo de Desarrollo

2. Revisión Preliminar (1-3 días)
   - Verificar documentos completos
   - Análisis rápido de viabilidad
   - Clasificación: Alta/Media/Baja prioridad

3. Due Diligence Completo (5-15 días)
   - Verificación legal en SUNARP
   - Visita al terreno
   - Análisis de mercado de la zona
   - Estudio de factibilidad técnica
   - Evaluación financiera

4. Decisión Final
   - Aprobar para negociación
   - Rechazar con feedback
   - Poner en espera para revisión futura

5. Notificación al Corredor
   - Email con decisión
   - Si aprobado: Siguiente pasos
   - Si rechazado: Razones constructivas
```

**Tiempo total:** 7-20 días

### Fase 4: Negociación y Comisión

```
1. Si aprobado, EcoPlaza contacta al propietario

2. Proceso de negociación

3. Si se concreta la compra:
   - Corredor recibe comisión acordada
   - Registro en sistema de pagos
   - Certificado de reconocimiento

4. Actualización del perfil del corredor
   - Terreno exitoso agregado al historial
   - Mejora de reputación/nivel
```

---

## Campos Recomendados - Detallados

### A. Registro de Corredor

#### Información Personal
```json
{
  "nombre_completo": "string (required)",
  "email": "string (required, unique)",
  "telefono": "string (required)",
  "whatsapp": "string (required)",
  "dni": "string (8 digits, required)",
  "fecha_nacimiento": "date",
  "direccion": "string",
  "distrito": "string",
  "provincia": "string",
  "departamento": "string"
}
```

#### Información Profesional
```json
{
  "ruc": "string (11 digits)",
  "tiene_codigo_agente": "boolean",
  "codigo_agente_mvcs": "string (si tiene_codigo_agente = true)",
  "anios_experiencia": "integer",
  "especialidad": "enum [residencial, comercial, industrial, terrenos]",
  "zona_trabajo": "array[string]",
  "descripcion_experiencia": "text"
}
```

#### Documentos de Registro
```json
{
  "foto_dni_frente": "file (jpg/png)",
  "foto_dni_reverso": "file (jpg/png)",
  "certificado_agente": "file (pdf, opcional)",
  "cv": "file (pdf, opcional)"
}
```

#### Estado y Aprobación
```json
{
  "estado": "enum [pendiente, aprobado, rechazado]",
  "fecha_registro": "timestamp",
  "fecha_aprobacion": "timestamp",
  "aprobado_por": "user_id",
  "notas_internas": "text",
  "nivel": "enum [basico, verificado, premium]"
}
```

### B. Envío de Terreno

#### Ubicación
```json
{
  "departamento": "string (required)",
  "provincia": "string (required)",
  "distrito": "string (required)",
  "direccion_exacta": "string (required)",
  "referencia": "string",
  "latitud": "decimal (optional)",
  "longitud": "decimal (optional)",
  "zona_tipo": "enum [urbana, periurbana, rural]"
}
```

#### Características Físicas
```json
{
  "area_total_m2": "decimal (required)",
  "frente_m": "decimal",
  "fondo_m": "decimal",
  "topografia": "enum [plano, pendiente_leve, pendiente_pronunciada]",
  "forma": "enum [regular, irregular]",
  "nivel_suelo": "enum [firme, inundable, rocoso, arenoso]",
  "perimetro": "decimal",
  "linderos": {
    "norte": "string",
    "sur": "string",
    "este": "string",
    "oeste": "string"
  }
}
```

#### Zonificación y Uso
```json
{
  "zonificacion_actual": "enum [residencial, comercial, industrial, mixta, agricola]",
  "tipo_comercial": "enum [CV, CZ, CM, N/A]",
  "uso_actual": "string",
  "requiere_cambio_zonificacion": "boolean",
  "compatibilidad_mercado": "enum [alta, media, baja]",
  "restricciones": "text"
}
```

#### Servicios e Infraestructura
```json
{
  "agua_potable": "boolean",
  "desague": "boolean",
  "electricidad": "boolean",
  "gas_natural": "boolean",
  "internet": "boolean",
  "pavimentacion": "boolean",
  "transporte_publico": "boolean",
  "distancia_via_principal_m": "integer",
  "distancia_transporte_m": "integer"
}
```

#### Accesibilidad
```json
{
  "acceso_vehicular": "boolean",
  "tipo_via_acceso": "enum [asfaltada, afirmada, trocha]",
  "ancho_via_m": "decimal",
  "estacionamiento_disponible": "boolean",
  "vias_principales_cercanas": "array[string]"
}
```

#### Documentación Legal
```json
{
  "partida_registral": "file (pdf, required)",
  "numero_partida": "string",
  "titulo_propiedad": "file (pdf, required)",
  "certificado_parametros": "file (pdf)",
  "plano_ubicacion": "file (pdf/jpg)",
  "plano_perimetrico": "file (pdf/jpg)",
  "plano_localizacion": "file (pdf/jpg)",
  "certificado_gravamenes": "file (pdf)",
  "tasacion_profesional": "file (pdf, opcional)"
}
```

#### Imágenes y Multimedia
```json
{
  "fotos_terreno": "array[file] (jpg/png, min 5, max 20)",
  "foto_fachada": "file",
  "foto_vista_aerea": "file (opcional)",
  "video_terreno": "file (mp4, max 50MB, opcional)",
  "descripcion_fotos": "text"
}
```

#### Información del Propietario
```json
{
  "nombre_propietario": "string (required)",
  "tipo_propietario": "enum [persona_natural, persona_juridica]",
  "dni_ruc_propietario": "string (required)",
  "telefono_propietario": "string (required)",
  "email_propietario": "string",
  "dispuesto_vender": "enum [si, no, negociando]",
  "razon_venta": "text",
  "tiempo_disponibilidad": "string"
}
```

#### Información Comercial
```json
{
  "precio_solicitado": "decimal",
  "moneda": "enum [USD, PEN]",
  "precio_por_m2": "decimal (calculado)",
  "precio_negociable": "boolean",
  "forma_pago_preferida": "enum [contado, financiado, permuta]",
  "tiene_deudas": "boolean",
  "monto_deudas": "decimal (si tiene_deudas = true)",
  "gravamenes": "boolean",
  "descripcion_gravamenes": "text"
}
```

#### Análisis del Corredor
```json
{
  "porque_ideal_mercado": "text (required)",
  "analisis_zona": "text",
  "competencia_cercana": "text",
  "potencial_flujo_personas": "text",
  "observaciones": "text",
  "ventajas_terreno": "array[string]",
  "desventajas_terreno": "array[string]"
}
```

#### Metadata del Envío
```json
{
  "codigo_terreno": "string (auto-generado: TER-YYYY-NNNN)",
  "corredor_id": "integer (foreign key)",
  "fecha_envio": "timestamp",
  "estado": "enum [pendiente, revision, aprobado, rechazado, en_espera]",
  "prioridad": "enum [alta, media, baja]",
  "evaluador_asignado": "user_id",
  "fecha_evaluacion": "timestamp",
  "notas_evaluacion": "text",
  "razon_rechazo": "text (si estado = rechazado)",
  "comision_estimada": "decimal"
}
```

---

## Recomendaciones de UX/UI

### 1. Wizard Multi-Step para Envío de Terreno

**Ventajas:**
- Reduce ansiedad del usuario
- Permite guardar progreso
- Más fácil de completar en móvil
- Mejora tasa de completación

**Estructura Sugerida:**

```
Paso 1/5: Ubicación del Terreno
[Progress bar: 20%]
[Campos: departamento, provincia, distrito, dirección, mapa]
[Botón: Siguiente]

Paso 2/5: Características del Terreno
[Progress bar: 40%]
[Campos: área, medidas, topografía, forma, zonificación]
[Botones: Anterior | Siguiente]

Paso 3/5: Documentación Legal
[Progress bar: 60%]
[Upload de documentos con drag & drop]
[Preview de documentos cargados]
[Botones: Anterior | Siguiente]

Paso 4/5: Información del Propietario
[Progress bar: 80%]
[Campos: datos del propietario, precio]
[Botones: Anterior | Siguiente]

Paso 5/5: Revisión y Envío
[Progress bar: 100%]
[Resumen de todo lo ingresado]
[Checkbox: "Confirmo que la información es correcta"]
[Botones: Anterior | Enviar Terreno]
```

### 2. Dashboard del Corredor

**Elementos Clave:**

```
+----------------------------------------------------------+
|  Bienvenido, [Nombre Corredor]      [Avatar] [Logout]   |
+----------------------------------------------------------+
|                                                          |
|  MÉTRICAS                                                |
|  +------------+  +------------+  +------------+          |
|  | Terrenos   |  | Aprobados  |  | Comisiones |          |
|  | Enviados   |  |     3      |  | S/ 12,500  |          |
|  |    15      |  +------------+  +------------+          |
|  +------------+                                          |
|                                                          |
|  [+ Enviar Nuevo Terreno]                                |
|                                                          |
|  MIS TERRENOS                                            |
|  +------------------------------------------------------+|
|  | Código      | Distrito    | Estado      | Fecha     ||
|  |-------------|-------------|-------------|------------||
|  | TER-2026-15 | San Miguel  | En revisión | 12/01/26  ||
|  | TER-2026-14 | Surquillo   | Aprobado    | 05/01/26  ||
|  | TER-2026-13 | Chorrillos  | Rechazado   | 28/12/25  ||
|  +------------------------------------------------------+|
|                                                          |
+----------------------------------------------------------+
```

### 3. Sistema de Notificaciones

**Canales:**
- Email
- WhatsApp (integrado)
- Notificaciones in-app

**Eventos a Notificar:**

| Evento | Mensaje Sugerido |
|--------|------------------|
| Registro aprobado | "¡Felicidades! Tu registro como corredor EcoPlaza ha sido aprobado. Ya puedes empezar a enviar terrenos." |
| Terreno recibido | "Hemos recibido tu terreno TER-2026-015 en San Miguel. Lo evaluaremos en los próximos 5 días." |
| Terreno en revisión | "Tu terreno TER-2026-015 está siendo evaluado por nuestro equipo de desarrollo." |
| Terreno aprobado | "¡Excelente noticia! Tu terreno TER-2026-015 ha sido aprobado. Iniciaremos negociaciones con el propietario." |
| Terreno rechazado | "Tu terreno TER-2026-015 no cumple con nuestros criterios actuales. Ver razones: [link]" |
| Compra concretada | "¡Felicidades! Compramos el terreno TER-2026-015. Tu comisión de S/ 5,000 será procesada." |

### 4. Validaciones en Tiempo Real

**Implementar:**
- Validación de DNI (8 dígitos, solo números)
- Validación de RUC (11 dígitos, solo números)
- Validación de email (formato correcto)
- Validación de teléfono (9 dígitos, empieza con 9)
- Validación de área m² (mayor a 0)
- Validación de formato de archivos
- Validación de tamaño de archivos (max 10MB por documento)

**Mensajes de Error Claros:**
```
❌ "El DNI debe tener exactamente 8 dígitos"
❌ "El archivo debe ser PDF, peso máximo 10MB"
✅ "Documento cargado correctamente"
```

### 5. Mobile-First Design

**Consideraciones:**
- 60%+ de corredores usarán móvil
- Optimizar para pantallas pequeñas
- Botones grandes y táctiles
- Upload de fotos desde cámara del móvil
- Geolocalización automática
- Formularios adaptables

### 6. Sistema de Ayuda Contextual

**Implementar tooltips con:**
- "?" junto a campos complejos
- Ejemplos de cómo llenar cada campo
- Links a documentos de referencia
- Videos tutoriales cortos
- FAQs integradas

---

## Casos de Éxito Relevantes

### 1. Urbania - Modelo de Marketplace Inmobiliario

**Empresa:** Urbania (Perú)

**Qué hicieron:**
- Crearon marketplace centralizado con 668 agentes
- Sistema de perfiles verificados
- Modelo de pago por publicación
- 12 años de operación, 3.2 millones de avisos

**Resultados:**
- Líder del mercado peruano
- Alta confianza de usuarios
- Flujo constante de propiedades

**Aplicable a EcoPlaza:**
- Sistema de perfiles de corredores con reputación
- Verificación de documentos antes de aprobar
- Dashboard transparente para corredores

### 2. Desarrolladores Líderes 2026 - Estrategia de Land Banking

**Empresas:** Solar, Tale, Viva Inmobiliaria

**Qué hicieron:**
- Inversión agresiva en adquisición de terrenos (US$15-18 millones)
- Foco en ubicaciones estratégicas antes de boom
- Due diligence riguroso pero ágil
- Equipos dedicados a prospección

**Resultados:**
- Portafolio robusto de terrenos
- Ventaja competitiva en proyectos futuros
- ROI alto por apreciación de terrenos

**Aplicable a EcoPlaza:**
- Implementar sistema de corredores para multiplicar prospección
- Evaluar rápido para captar oportunidades
- Crear banco de terrenos estratégicos

### 3. Cencosud - Expansión Retail con Foco en Real Estate

**Empresa:** Cencosud (Perú)

**Qué hicieron:**
- Inversión de US$600 millones (70% en crecimiento)
- Adquisición de terrenos para centros comerciales
- Desarrollo de terrenos propios disponibles

**Resultados:**
- Crecimiento sostenido
- Control de costos de expansión
- Modelo integrado retail + real estate

**Aplicable a EcoPlaza:**
- Mercados EcoPlaza = modelo similar (terreno + desarrollo)
- Corredores ayudan a encontrar oportunidades de terrenos
- Enfoque en zonas con alto potencial comercial

---

## Regulaciones Peruanas - Resumen Ejecutivo

### Ley de Corredores Inmobiliarios

**Marco Legal Principal:**
- **Ley N° 29080**: Creación del Registro del Agente Inmobiliario
- **Decreto Supremo N° 010-2016-VIVIENDA**: Reglamento de la Ley 29080

**Autoridad Reguladora:**
Ministerio de Vivienda, Construcción y Saneamiento (MVCS)

**Requisitos para Ejercer como Corredor:**
1. Completar Curso de Especialización en institución autorizada por MVCS
2. Registrarse en el Registro del Agente Inmobiliario
3. Obtener Código de Agente Inmobiliario
4. Antecedentes penales limpios (certificado RNCJ)
5. Estar en pleno goce de derechos civiles

**Proceso de Registro:**
- Plazo: 10 días o menos
- Modalidad: Virtual o presencial
- Costo: Variable según institución (tasas administrativas)

**Implicaciones para EcoPlaza:**
- Verificar que corredores tengan código MVCS (recomendado, no obligatorio para EcoPlaza)
- Sistema de niveles: Básico (sin código) / Verificado (con código)
- Mayor confianza con corredores certificados

### Regulación de Propiedad y Transferencias

**Entidad Reguladora:** SUNARP (Superintendencia Nacional de Registros Públicos)

**Documentos Legales Clave:**
- Partida Registral: Documento oficial que acredita propiedad
- Título de Propiedad: Escritura pública de compraventa
- Certificado de Gravámenes: Verifica cargas sobre el inmueble

**Proceso de Verificación:**
- Consulta en línea en portal SUNARP
- Verificación de propietario actual
- Revisión de hipotecas, embargos, gravámenes

**Zonificación y Uso de Suelo:**
- Regulado por cada municipalidad distrital
- Certificado de Parámetros Urbanísticos (obligatorio)
- Cambio de zonificación: proceso municipal (2-6 meses)

---

## Cronograma de Implementación Sugerido

### Fase 1: Setup Inicial (2 semanas)

**Semana 1-2:**
- Diseño de base de datos (tablas corredores, terrenos)
- Wireframes de formularios
- Definición de campos obligatorios/opcionales
- Setup de storage para documentos (AWS S3 / Supabase Storage)

### Fase 2: Desarrollo MVP (4 semanas)

**Semana 3-4:**
- Formulario de registro de corredor (básico)
- Sistema de aprobación interna
- Dashboard admin para revisar solicitudes

**Semana 5-6:**
- Formulario de envío de terreno (wizard 5 pasos)
- Upload de documentos
- Dashboard del corredor

### Fase 3: Integraciones (2 semanas)

**Semana 7-8:**
- Integración con APIs de validación (RENIEC, SUNAT)
- Sistema de notificaciones (email + WhatsApp)
- Integración con sistema de pagos/comisiones

### Fase 4: Testing y Refinamiento (2 semanas)

**Semana 9-10:**
- Testing con usuarios reales (5-10 corredores beta)
- Ajustes de UX/UI
- Optimización de performance
- Documentación

### Fase 5: Lanzamiento (1 semana)

**Semana 11:**
- Deploy a producción
- Campaña de invitación a corredores
- Onboarding de primeros corredores
- Monitoreo y soporte

**Tiempo Total:** 11 semanas (~3 meses)

---

## KPIs Recomendados

### Métricas de Corredores

| KPI | Fórmula | Meta Año 1 |
|-----|---------|------------|
| **Corredores Registrados** | Total de registros aprobados | 50-100 |
| **Tasa de Aprobación** | Aprobados / Solicitudes * 100 | 60-70% |
| **Corredores Activos** | Enviaron ≥1 terreno en últimos 30 días | 30-40% |
| **Terrenos por Corredor** | Promedio terrenos enviados / corredor | 2-3 |

### Métricas de Terrenos

| KPI | Fórmula | Meta Año 1 |
|-----|---------|------------|
| **Terrenos Recibidos** | Total de terrenos enviados | 100-150 |
| **Tasa de Aprobación de Terrenos** | Aprobados / Enviados * 100 | 10-15% |
| **Tiempo de Evaluación** | Promedio días desde envío a decisión | 7-10 días |
| **Conversión a Compra** | Terrenos comprados / Aprobados * 100 | 30-50% |

### Métricas de Calidad

| KPI | Fórmula | Meta |
|-----|---------|------|
| **Documentos Completos** | Terrenos con docs completos / Total * 100 | 80%+ |
| **Precisión de Información** | Terrenos sin discrepancias / Total * 100 | 90%+ |
| **Satisfacción del Corredor** | NPS o encuesta post-evaluación | 7+/10 |

### Métricas Financieras

| KPI | Fórmula | Objetivo |
|-----|---------|----------|
| **Comisiones Pagadas** | Total comisiones a corredores | Variable |
| **ROI del Sistema** | Valor terrenos comprados / Costo sistema | 10x+ |
| **Ahorro vs Prospección Directa** | Comparativo costo interno vs corredores | 30%+ |

---

## Conclusiones y Próximos Pasos

### Resumen de Hallazgos

1. **Marco Legal Claro**: Perú cuenta con regulación específica (Ley 29080) que facilita la verificación de corredores legítimos.

2. **Documentación Estándar**: Los requisitos para evaluar terrenos están bien definidos por SUNARP y municipalidades, facilitando la estandarización del formulario.

3. **Mercado Activo**: El mercado inmobiliario peruano está en crecimiento en 2026, con inversiones millonarias, lo que valida la oportunidad de un sistema de captación de terrenos.

4. **UX/UI Optimizada**: Las mejores prácticas indican formularios multi-step, integración CRM, y notificaciones automáticas.

5. **Competencia Establecida**: Plataformas como Urbania demuestran que el modelo marketplace funciona en Perú.

### Recomendaciones Prioritarias para EcoPlaza

#### 1. Implementar Sistema de Niveles de Corredores

```
- Nivel 1 (Básico): DNI + RUC + Experiencia
- Nivel 2 (Verificado): + Código Agente MVCS
- Nivel 3 (Premium): + Track record comprobado
```

**Beneficio:** Mayor confianza, incentiva profesionalización.

#### 2. Wizard Multi-Step para Envío de Terrenos

**Razón:** Reduce abandono del formulario, mejora UX en móvil.

#### 3. Integración con APIs de Validación

```
- RENIEC API (validar DNI)
- SUNAT API (validar RUC)
- SUNARP API (consultar partida registral)
```

**Beneficio:** Automatiza verificaciones, reduce fraude.

#### 4. Sistema de Notificaciones Automáticas

**Canales:** Email + WhatsApp

**Eventos:** Registro, Envío, Cambio de Estado, Aprobación, Rechazo, Pago de Comisión

**Beneficio:** Transparencia, mejora experiencia del corredor.

#### 5. Dashboard con Métricas para Corredores

**Mostrar:**
- Terrenos enviados
- Tasa de aprobación personal
- Comisiones ganadas
- Ranking (gamificación)

**Beneficio:** Engagement, motivación.

#### 6. Programa de Incentivos

```
- Bonos por primer terreno aprobado
- Comisiones escalonadas (más terrenos = mayor %)
- Reconocimientos públicos
- Eventos exclusivos para top corredores
```

**Beneficio:** Retención, calidad de envíos.

---

## Anexos

### A. Checklist de Campos del Formulario

**Registro de Corredor (Mínimo Viable):**
- [ ] Nombre completo
- [ ] Email
- [ ] Teléfono/WhatsApp
- [ ] DNI
- [ ] RUC (opcional)
- [ ] Años de experiencia
- [ ] Descripción breve

**Envío de Terreno (Mínimo Viable):**
- [ ] Departamento/Provincia/Distrito
- [ ] Dirección exacta
- [ ] Área total (m²)
- [ ] Partida registral (PDF)
- [ ] Título de propiedad (PDF)
- [ ] Fotos del terreno (mín. 5)
- [ ] Nombre del propietario
- [ ] Teléfono del propietario
- [ ] Precio solicitado
- [ ] Por qué es ideal para mercado

### B. Ejemplo de Email de Notificación

**Asunto:** Tu terreno TER-2026-015 ha sido aprobado

```
Hola [Nombre Corredor],

¡Excelentes noticias!

Tu terreno TER-2026-015 ubicado en San Miguel, Lima, ha sido APROBADO
por nuestro equipo de desarrollo.

Detalles:
- Código: TER-2026-015
- Ubicación: Av. Universitaria 1234, San Miguel
- Área: 2,500 m²
- Fecha de aprobación: 16 Enero 2026

PRÓXIMOS PASOS:
1. Nuestro equipo contactará al propietario en las próximas 48 horas
2. Si la negociación es exitosa, procesaremos tu comisión de S/ 5,000
3. Te mantendremos informado del avance

Ver detalles completos: [Link al dashboard]

¡Sigue enviando terrenos!

Equipo EcoPlaza
---
¿Preguntas? Responde este email o escríbenos al WhatsApp 999 888 777
```

### C. Glosario de Términos

| Término | Definición |
|---------|------------|
| **Partida Registral** | Documento de SUNARP que acredita la propiedad de un inmueble |
| **SUNARP** | Superintendencia Nacional de Registros Públicos |
| **MVCS** | Ministerio de Vivienda, Construcción y Saneamiento |
| **Zonificación CV** | Comercio Vecinal (pequeño comercio de barrio) |
| **Zonificación CZ** | Comercio Zonal (centros comerciales medianos) |
| **Zonificación CM** | Comercio Metropolitano (grandes centros comerciales) |
| **Habilitación Urbana** | Proceso de dotar servicios básicos a un terreno |
| **Certificado de Parámetros** | Documento municipal con zonificación y normas edificatorias |
| **Gravamen** | Carga sobre un inmueble (hipoteca, embargo, etc.) |
| **Land Banking** | Estrategia de comprar terrenos para desarrollo futuro |

---

## Fuentes

### Regulación y Marco Legal:
- [¿Cómo ser un corredor inmobiliario en Perú?](https://firmavirtual.legal/como-ser-un-corredor-inmobiliario-en-peru)
- [Consultar el Registro del agente inmobiliario - MVCS](https://www.gob.pe/7634-consultar-el-registro-del-agente-inmobiliario)
- [Marco normativo del Registro del Agente Inmobiliario - Ley 29080](https://aspai.pe/2020/01/18/marco-normativo-del-registro-del-agente-inmobiliario-del-ministerio-de-vivienda-ley-29080-y-su-reglamento/)
- [Requisitos para los Agentes Inmobiliarios - MVCS](https://agenteinmobiliario.vivienda.gob.pe/RequisitosAgentesInmobiliarios.aspx)
- [Una mirada general al agente inmobiliario - LP Derecho](https://lpderecho.pe/mirada-general-agente-inmobiliario/)

### Documentación de Terrenos:
- [Titulación de un predio en la SUNARP – Catastro](https://catastro.6te.net/index.php/catastro/titulacion-de-un-predio-en-la-sunarp/)
- [Conoce cómo registrar una compraventa de inmueble en la Sunarp](https://www.gob.pe/institucion/sunarp/noticias/167857-conoce-como-registrar-una-compraventa-de-inmueble-en-la-sunarp)
- [¿Cómo realizar la consulta de un terreno en Sunarp? - Munay](https://ciudadmunay.com/blog/consultar-propiedad-de-un-terreno-en-sunarp/)

### Zonificación y Uso de Suelo:
- [Zonificación en Perú: Definición, características e importancia - IUS Latin](https://iuslatin.pe/zonificacion-en-peru-definicion-caracteristicas-e-importancia/)
- [Planos de Zonificación – Instituto Metropolitano de Planificación](https://portal.imp.gob.pe/normas-zonificacion-y-sistema-vial-metropolitano/planos-de-zonificacion/)
- [Requisitos Para Solicitar Cambio De Uso De Suelo Perú • 2026](https://micertificado.pe/requisitos-para-solicitar-cambio-de-uso-de-suelo-peru/)

### Tasación de Terrenos:
- [Tasación de inmuebles en Perú: ¿cómo se realiza? - DSI](https://dsinmobiliario.com.pe/blog/tasacion-de-inmuebles-peru/)
- [Reglamento Nacional de Tasaciones del Perú](https://www.municportillo.gob.pe/images/pdf/doc2015/varios/reg_nt.pdf)
- [Tasación de inmuebles urbanos en Perú - Capithalis](https://www.capithalis.com/l/tasacion-de-inmuebles-urbanos-en-peru/)

### Mercado Inmobiliario 2026:
- [Mercado inmobiliario 2026: nuevas inversiones redibujan el mapa urbano de Lima - Gestión](https://gestion.pe/economia/empresas/mercado-inmobiliario-2026-nuevas-inversiones-redibujan-el-mapa-urbano-de-lima-noticia/)
- [Barranco, Chorrillos y San Isidro en el foco de Solar Inmobiliaria 2026 - Gestión](https://gestion.pe/economia/empresas/barranco-chorrillos-y-san-isidro-en-el-foco-de-solar-inmobiliaria-los-proyectos-para-2026-con-una-inversion-de-us-15-millones-noticia/)
- [Oferta de terrenos: tres aspectos a evaluar - Gestión](https://gestion.pe/tu-dinero/inmobiliarias/oferta-de-terrenos-tres-aspectos-a-evaluar-para-decidir-si-compra-este-tipo-de-inmuebles-noticia/)

### Plataformas y Benchmarks:
- [Urbania Perú - 668 agentes](https://urbania.pe/corredores.bum)
- [Proyectos inmobiliarios - Urbania](https://urbania.pe/buscar/proyectos-propiedades)
- [Publicar en Urbania gratis en Perú - Houcify](https://houcify.com/publicar-en-urbania-gratis-en-peru/)

### Mejores Prácticas UX/UI:
- [Diseño Web para Inmobiliarias Ejemplos y Mejores Prácticas](https://trichterconsulting.com/paginas-web-para-inmobiliarias-que-necesito-para-destacarme-de-la-competencia/)
- [Formato de registro de cliente inmobiliario - Inmogesco](https://inmogesco.com/blog/registro-de-cliente-inmobiliario/)
- [Página web para corredores inmobiliarios - 1001propiedades](https://www.1001propiedades.com/guia-completa-para-crear-una-pagina-web-exitosa-para-corredores-inmobiliarios-de-cero-a-resultados/)

### Best Practices Internacionales:
- [Deep Dive - Land Acquisition and Assemblage - Adventures in CRE](https://www.adventuresincre.com/deep-dive-land-acquisition/)
- [Land Acquisition 101: What Investors & Developers Need to Know - Botero Homes](https://boterohomes.com/land-acquisition-101-what-investors-developers-need-to-know/)
- [The Ultimate Guide to Land Acquisition in Real Estate - Harbinger Land](https://blog.harbingerland.com/the-ultimate-guide-to-land-acquisition-in-real-estate/)
- [Buying Land: 10 Keys for Successful Site Selection - Marsh Partners](https://marsh-partners.com/blog/buying-land-10-keys-for-successful-site-selection-and-land-acquisition)

---

**Fecha de Investigación:** 16 Enero 2026

**Investigador:** Claude (Strategic Researcher)

**Solicitado por:** EcoPlaza - Proyecto Dashboard

**Próxima Revisión:** Junio 2026 (actualizar regulaciones y tendencias de mercado)
