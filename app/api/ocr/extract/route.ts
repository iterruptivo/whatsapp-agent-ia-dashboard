// ============================================================================
// API ROUTE: /api/ocr/extract
// ============================================================================
// Extrae datos de documentos usando GPT-4 Vision
// Tipos soportados: voucher, dni, dni_reverso, boleta, recibo_luz, declaracion_jurada
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  extractVoucherData,
  extractDNIData,
  extractBoletaData,
  extractDNIReversoData,
  extractReciboLuzData,
  extractDeclaracionJuradaData,
  OCRDocumentType,
} from '@/lib/actions-ocr';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { image, type, mimeType } = body as {
      image: string;
      type: OCRDocumentType;
      mimeType?: string;
    };

    // Validaciones
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No se proporciono imagen' },
        { status: 400 }
      );
    }

    if (!type || !['voucher', 'dni', 'boleta', 'dni_reverso', 'recibo_luz', 'declaracion_jurada'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de documento invalido. Use: voucher, dni, boleta, dni_reverso, recibo_luz, declaracion_jurada' },
        { status: 400 }
      );
    }

    // Validar tamano del base64 (aproximadamente 10MB max)
    const maxSize = 10 * 1024 * 1024 * 1.37; // 10MB + overhead base64
    if (image.length > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Imagen demasiado grande. Maximo 10MB' },
        { status: 400 }
      );
    }

    // Extraer datos segun tipo
    let result;
    const mime = mimeType || 'image/jpeg';

    switch (type) {
      case 'voucher':
        result = await extractVoucherData(image, mime);
        break;
      case 'dni':
        result = await extractDNIData(image, mime);
        break;
      case 'boleta':
        result = await extractBoletaData(image, mime);
        break;
      case 'dni_reverso':
        result = await extractDNIReversoData(image, mime);
        break;
      case 'recibo_luz':
        result = await extractReciboLuzData(image, mime);
        break;
      case 'declaracion_jurada':
        result = await extractDeclaracionJuradaData(image, mime);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de documento no soportado' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      type,
    });
  } catch (error) {
    console.error('OCR API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

// Configurar limite de tamano del body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};
