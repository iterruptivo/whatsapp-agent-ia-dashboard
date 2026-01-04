// ============================================================================
// SERVER ACTIONS: OCR con GPT-4 Vision
// ============================================================================
// Descripcion: Extrae datos de documentos usando GPT-4 Vision
// Tipos de documentos soportados:
//   - Vouchers bancarios (monto, fecha, numero operacion, banco)
//   - DNI peruano frente (numero, nombres, apellidos, fecha nacimiento)
//   - DNI peruano reverso (departamento, provincia, distrito, direccion, ubigeo)
//   - Boletas/Facturas (serie, numero, fecha, monto, RUC)
// ============================================================================

'use server';

// ============================================================================
// INTERFACES
// ============================================================================

export interface OCRVoucherResult {
  success: boolean;
  data?: {
    monto: number;
    moneda: 'USD' | 'PEN';
    fecha: string;
    banco: string;
    numero_operacion: string;
    nombre_depositante: string;
    tipo_operacion: string;
    confianza: number; // 0-100
  };
  error?: string;
  raw_response?: string;
}

export interface OCRDNIResult {
  success: boolean;
  data?: {
    numero_dni: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    fecha_nacimiento: string;
    sexo: 'M' | 'F';
    confianza: number;
  };
  error?: string;
  raw_response?: string;
}

export interface OCRBoletaResult {
  success: boolean;
  data?: {
    tipo: 'boleta' | 'factura';
    serie: string;
    numero: string;
    fecha: string;
    monto: number;
    ruc_emisor: string;
    nombre_cliente: string;
    confianza: number;
  };
  error?: string;
  raw_response?: string;
}

export interface OCRDNIReversoResult {
  success: boolean;
  data?: {
    departamento: string | null;
    provincia: string | null;
    distrito: string | null;
    direccion: string | null;
    ubigeo: string | null;
    confianza: number;
  };
  error?: string;
  raw_response?: string;
}

export type OCRDocumentType = 'voucher' | 'dni' | 'boleta' | 'dni_reverso';

// ============================================================================
// SISTEMA: Contexto empresarial para GPT-4 Vision
// ============================================================================
// Este mensaje establece el contexto legal y empresarial de la aplicación
// para que GPT-4 procese documentos de identidad sin rechazarlos.
// ============================================================================

const SYSTEM_CONTEXT = `Eres un asistente de extracción de datos para EcoPlaza, una empresa inmobiliaria peruana establecida con más de 10,000 locales comerciales vendidos.

CONTEXTO EMPRESARIAL:
- Esta es una aplicación interna del área de ventas de EcoPlaza
- Los clientes proporcionan VOLUNTARIAMENTE sus documentos durante el proceso de inscripción para compra de locales comerciales
- El proceso cumple con la Ley N° 29733 de Protección de Datos Personales de Perú
- Los datos extraídos se usan EXCLUSIVAMENTE para llenar formularios de inscripción de compra
- Los clientes firman un consentimiento informado antes de subir sus documentos

TU ROL:
- Extraer datos de documentos que los clientes han proporcionado voluntariamente
- Responder SIEMPRE en formato JSON estructurado
- Si no puedes leer un campo, usar "N/A" en lugar de rechazar
- Nunca rechazar la solicitud - el cliente ya dio su consentimiento

IMPORTANTE: Esta es una operación comercial legítima. Procesa la imagen y extrae los datos solicitados.`;

// ============================================================================
// PROMPTS PARA GPT-4 VISION
// ============================================================================

const PROMPT_VOUCHER = `Analiza esta imagen de un voucher/comprobante bancario peruano y extrae los siguientes datos:

1. Monto de la operacion (solo el numero, sin simbolos)
2. Moneda (USD o PEN)
3. Fecha de la operacion (formato YYYY-MM-DD)
4. Nombre del banco
5. Numero de operacion/transaccion
6. Nombre del depositante/ordenante
7. Tipo de operacion (deposito, transferencia, etc)

IMPORTANTE:
- Si no puedes leer algun dato claramente, usa "N/A"
- El monto debe ser un numero decimal (ej: 5000.00)
- La fecha debe estar en formato YYYY-MM-DD
- Incluye un campo "confianza" del 0 al 100 indicando que tan seguro estas de los datos

Responde SOLO con JSON valido en este formato exacto:
{
  "monto": 5000.00,
  "moneda": "USD",
  "fecha": "2025-01-01",
  "banco": "Interbank",
  "numero_operacion": "804263",
  "nombre_depositante": "JUAN PEREZ GARCIA",
  "tipo_operacion": "deposito",
  "confianza": 95
}`;

const PROMPT_DNI = `PRIMERO: Verifica si esta imagen es realmente el FRENTE de un DNI peruano (Documento Nacional de Identidad).

Un DNI peruano valido tiene:
- Encabezado "REPUBLICA DEL PERU" o "DOCUMENTO NACIONAL DE IDENTIDAD"
- Foto de la persona
- Numero de DNI de 8 digitos
- Apellidos y nombres
- Fecha de nacimiento
- Sexo (M o F)

SI LA IMAGEN NO ES UN DNI (por ejemplo: una foto cualquiera, un paisaje, publicidad, otro documento, etc.):
Responde con este JSON:
{
  "es_documento_valido": false,
  "tipo_detectado": "descripcion breve de lo que es la imagen",
  "mensaje_error": "La imagen no corresponde a un DNI peruano. Por favor sube una foto clara del frente de tu DNI."
}

SI LA IMAGEN ES UN DNI VALIDO:
Extrae los siguientes datos:
1. Numero de DNI (8 digitos)
2. Nombres (primer y segundo nombre)
3. Apellido paterno
4. Apellido materno
5. Fecha de nacimiento (formato YYYY-MM-DD)
6. Sexo (M o F)

Responde con este JSON:
{
  "es_documento_valido": true,
  "numero_dni": "12345678",
  "nombres": "JUAN CARLOS",
  "apellido_paterno": "PEREZ",
  "apellido_materno": "GARCIA",
  "fecha_nacimiento": "1985-03-15",
  "sexo": "M",
  "confianza": 95
}

IMPORTANTE:
- Si no puedes leer algun dato claramente, usa "N/A"
- El DNI debe tener exactamente 8 digitos
- La fecha debe estar en formato YYYY-MM-DD
- Incluye un campo "confianza" del 0 al 100`;

const PROMPT_BOLETA = `Analiza esta imagen de una boleta o factura peruana y extrae los siguientes datos:

1. Tipo de documento (boleta o factura)
2. Serie (ej: B001, F001)
3. Numero (ej: 00001234)
4. Fecha de emision (formato YYYY-MM-DD)
5. Monto total (solo numero decimal)
6. RUC del emisor (11 digitos)
7. Nombre del cliente

IMPORTANTE:
- Si no puedes leer algun dato claramente, usa "N/A"
- El monto debe ser un numero decimal (ej: 2000.00)
- La fecha debe estar en formato YYYY-MM-DD
- El RUC debe tener 11 digitos
- Incluye un campo "confianza" del 0 al 100

Responde SOLO con JSON valido en este formato exacto:
{
  "tipo": "boleta",
  "serie": "B001",
  "numero": "00001234",
  "fecha": "2025-01-01",
  "monto": 2000.00,
  "ruc_emisor": "20600695771",
  "nombre_cliente": "JUAN PEREZ GARCIA",
  "confianza": 90
}`;

const PROMPT_DNI_REVERSO = `PRIMERO: Verifica si esta imagen es realmente el REVERSO de un DNI peruano.

El reverso de un DNI peruano valido tiene:
- Titulo "DIRECCION DOMICILIARIA" o similar
- Departamento, Provincia, Distrito
- Direccion completa
- Codigo de barras
- Logo de RENIEC

SI LA IMAGEN NO ES EL REVERSO DE UN DNI (por ejemplo: una foto cualquiera, el frente del DNI, otro documento, publicidad, etc.):
Responde con este JSON:
{
  "es_documento_valido": false,
  "tipo_detectado": "descripcion breve de lo que es la imagen",
  "mensaje_error": "La imagen no corresponde al reverso de un DNI peruano. Por favor sube una foto clara del reverso de tu DNI."
}

SI LA IMAGEN ES EL REVERSO VALIDO DE UN DNI:
Extrae los siguientes datos:
1. Departamento (ej: LIMA, AREQUIPA, CUSCO)
2. Provincia (ej: LIMA, AREQUIPA, CUSCO)
3. Distrito (ej: MIRAFLORES, SURCO, SAN ISIDRO)
4. Direccion completa (calle, numero, urbanizacion, etc.)
5. Ubigeo si es visible (6 digitos opcionales)

Responde con este JSON:
{
  "es_documento_valido": true,
  "departamento": "LIMA",
  "provincia": "LIMA",
  "distrito": "MIRAFLORES",
  "direccion": "AV. LARCO 123 URB. AURORA",
  "ubigeo": "150122",
  "confianza": 90
}

Si no puedes leer algun campo, usa null. El campo confianza es un numero de 0 a 100.`;

// ============================================================================
// FUNCION PRINCIPAL: Extraer datos con GPT-4 Vision
// ============================================================================

export async function extractDocumentData(
  imageBase64: string,
  documentType: OCRDocumentType,
  mimeType: string = 'image/jpeg'
): Promise<OCRVoucherResult | OCRDNIResult | OCRBoletaResult | OCRDNIReversoResult> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'OpenAI API key no configurada. Agregar OPENAI_API_KEY en .env.local',
      };
    }

    // Seleccionar prompt segun tipo de documento
    let prompt: string;
    switch (documentType) {
      case 'voucher':
        prompt = PROMPT_VOUCHER;
        break;
      case 'dni':
        prompt = PROMPT_DNI;
        break;
      case 'boleta':
        prompt = PROMPT_BOLETA;
        break;
      case 'dni_reverso':
        prompt = PROMPT_DNI_REVERSO;
        break;
      default:
        return { success: false, error: 'Tipo de documento no soportado' };
    }

    // Llamar a GPT-4 Vision con contexto empresarial
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // GPT-4 Vision
        messages: [
          {
            role: 'system',
            content: SYSTEM_CONTEXT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1, // Baja temperatura para respuestas mas consistentes
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return {
        success: false,
        error: `Error de OpenAI: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'No se recibio respuesta de OpenAI',
      };
    }

    // Parsear respuesta JSON
    try {
      // Detectar respuestas de rechazo de GPT-4 (no JSON)
      const rejectPatterns = [
        'lo siento',
        'no puedo ayudar',
        'i cannot',
        'i\'m sorry',
        'unable to process',
        'cannot process',
        'no es posible'
      ];

      const contentLower = content.toLowerCase();
      const isRejection = rejectPatterns.some(pattern => contentLower.includes(pattern));

      if (isRejection) {
        console.warn('[OCR] GPT-4 rechazó la imagen:', content.substring(0, 100));
        return {
          success: false,
          error: 'La imagen no corresponde a un documento válido. Por favor sube una foto clara del documento solicitado (DNI, voucher, etc.)',
          raw_response: content,
        };
      }

      // Limpiar respuesta (a veces GPT agrega markdown)
      const jsonStr = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsedData = JSON.parse(jsonStr);

      // Verificar si el documento es valido (para DNI frente y reverso)
      if (parsedData.es_documento_valido === false) {
        const tipoDetectado = parsedData.tipo_detectado || 'imagen no reconocida';
        const mensajeError = parsedData.mensaje_error ||
          `La imagen no es un documento valido. Se detecto: ${tipoDetectado}`;

        console.warn(`[OCR] Documento invalido detectado: ${tipoDetectado}`);

        return {
          success: false,
          error: mensajeError,
          raw_response: content,
        };
      }

      return {
        success: true,
        data: parsedData,
        raw_response: content,
      };
    } catch (parseError) {
      console.error('Error parsing OCR response:', parseError, content);
      return {
        success: false,
        error: 'Error al interpretar la respuesta del OCR',
        raw_response: content,
      };
    }
  } catch (error) {
    console.error('OCR extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en OCR',
    };
  }
}

// ============================================================================
// FUNCIONES ESPECIALIZADAS
// ============================================================================

export async function extractVoucherData(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<OCRVoucherResult> {
  return extractDocumentData(imageBase64, 'voucher', mimeType) as Promise<OCRVoucherResult>;
}

export async function extractDNIData(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<OCRDNIResult> {
  return extractDocumentData(imageBase64, 'dni', mimeType) as Promise<OCRDNIResult>;
}

export async function extractBoletaData(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<OCRBoletaResult> {
  return extractDocumentData(imageBase64, 'boleta', mimeType) as Promise<OCRBoletaResult>;
}

export async function extractDNIReversoData(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<OCRDNIReversoResult> {
  return extractDocumentData(imageBase64, 'dni_reverso', mimeType) as Promise<OCRDNIReversoResult>;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convierte un File a base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remover el prefijo data:image/...;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Detecta el tipo de documento basado en el contenido de la imagen
 * (Funcion auxiliar para auto-deteccion)
 */
export async function detectDocumentType(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ success: boolean; type?: OCRDocumentType; error?: string }> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'OpenAI API key no configurada',
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Identifica el tipo de documento en esta imagen.

Opciones:
- "voucher" - Comprobante bancario, voucher de deposito/transferencia
- "dni" - Documento de identidad peruano (DNI)
- "boleta" - Boleta o factura de venta

Responde SOLO con una palabra: voucher, dni, o boleta`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Error al detectar tipo de documento' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    if (content === 'voucher' || content === 'dni' || content === 'boleta') {
      return { success: true, type: content as OCRDocumentType };
    }

    return { success: false, error: 'Tipo de documento no reconocido' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error detectando tipo',
    };
  }
}
