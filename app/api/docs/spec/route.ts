import { NextRequest, NextResponse } from 'next/server';
import { swaggerDocument } from '@/lib/swagger/swagger-config';
import { verifySwaggerAuth, createUnauthorizedResponse } from '@/lib/swagger/auth';

/**
 * GET /api/docs/spec
 *
 * Retorna la especificación OpenAPI en formato JSON
 * - Desarrollo: Acceso libre
 * - Producción: Requiere Basic Auth
 */
export async function GET(request: NextRequest) {
  // Verificar autenticación
  if (!verifySwaggerAuth(request)) {
    return createUnauthorizedResponse();
  }

  // Retornar especificación OpenAPI
  return NextResponse.json(swaggerDocument);
}
