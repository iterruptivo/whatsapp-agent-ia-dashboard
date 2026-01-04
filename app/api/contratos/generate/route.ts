// ============================================================================
// API ROUTE: Generate Contract Word Document
// ============================================================================
// POST /api/contratos/generate
// Body: { controlPagoId: string, tipoCambio?: number, templatePersonalizadoBase64?: string, templatePersonalizadoNombre?: string }
// Returns: Word document file download
// Fase: 7 - Contratos Flexibles
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateContrato } from '@/lib/actions-contratos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      controlPagoId,
      tipoCambio = 3.80,
      templatePersonalizadoBase64,
      templatePersonalizadoNombre,
    } = body;

    if (!controlPagoId) {
      return NextResponse.json(
        { success: false, error: 'controlPagoId es requerido' },
        { status: 400 }
      );
    }

    const result = await generateContrato(
      controlPagoId,
      tipoCambio,
      templatePersonalizadoBase64,
      templatePersonalizadoNombre
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Error al generar contrato' },
        { status: 400 }
      );
    }

    // Return the Word document as a downloadable file
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(result.data);
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error in contract generation API:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
