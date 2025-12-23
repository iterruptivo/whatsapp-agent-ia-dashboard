import { NextRequest } from 'next/server';

/**
 * Verifica autenticación Basic Auth para Swagger UI en producción
 * En desarrollo (localhost) permite acceso sin password
 */
export function verifySwaggerAuth(request: NextRequest): boolean {
  const host = request.headers.get('host') || '';

  // En desarrollo (localhost) permitir acceso sin autenticación
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }

  // En producción requiere Basic Auth
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const base64Credentials = authHeader.replace('Basic ', '');
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  const validUsername = process.env.SWAGGER_USERNAME;
  const validPassword = process.env.SWAGGER_PASSWORD;

  // Verificar que las variables de entorno estén configuradas
  if (!validUsername || !validPassword) {
    console.warn('SWAGGER_USERNAME o SWAGGER_PASSWORD no están configurados');
    return false;
  }

  return username === validUsername && password === validPassword;
}

/**
 * Genera respuesta de autenticación requerida (WWW-Authenticate)
 */
export function createUnauthorizedResponse() {
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Swagger UI", charset="UTF-8"',
    },
  });
}
