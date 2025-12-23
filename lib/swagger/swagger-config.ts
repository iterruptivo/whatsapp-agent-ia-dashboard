import { OpenAPIV3 } from 'openapi-types';

export const swaggerDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'EcoPlaza Dashboard API',
    version: '1.0.0',
    description: 'API documentation for EcoPlaza WhatsApp Agent IA Dashboard - 2025',
    contact: {
      name: 'EcoPlaza Development Team',
      email: 'gerencia@ecoplaza.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://whatsapp-agent-ia-dashboard.vercel.app',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtenido desde el endpoint /api/extension/login',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error description',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'alonso@ecoplaza.com',
            description: 'Email del usuario registrado en el sistema',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'Q0KlC36J4M_y',
            description: 'Contraseña del usuario',
          },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          session: {
            type: 'object',
            properties: {
              access_token: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refresh_token: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              expires_at: {
                type: 'number',
                example: 1735257600,
              },
            },
          },
          user: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: 'a3b5c7d9-1234-5678-9abc-def012345678',
              },
              email: {
                type: 'string',
                example: 'alonso@ecoplaza.com',
              },
              nombre: {
                type: 'string',
                example: 'Alonso Gutierrez',
              },
              rol: {
                type: 'string',
                enum: ['admin', 'jefe_ventas', 'vendedor', 'vendedor_caseta', 'coordinador', 'finanzas', 'marketing'],
                example: 'vendedor',
              },
              vendedor_id: {
                type: 'string',
                format: 'uuid',
                nullable: true,
                example: 'a3b5c7d9-1234-5678-9abc-def012345678',
              },
            },
          },
          proyectos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  example: 'a3b5c7d9-1234-5678-9abc-def012345678',
                },
                nombre: {
                  type: 'string',
                  example: 'Victoria Eco Plaza Callao',
                },
                slug: {
                  type: 'string',
                  example: 'callao',
                },
                color: {
                  type: 'string',
                  example: '#3B82F6',
                },
                activo: {
                  type: 'boolean',
                  example: true,
                },
              },
            },
          },
        },
      },
      CreateLeadRequest: {
        type: 'object',
        required: ['telefono', 'nombre', 'proyectoId'],
        properties: {
          telefono: {
            type: 'string',
            example: '+51987654321',
            description: 'Teléfono del lead (se limpiará automáticamente)',
          },
          nombre: {
            type: 'string',
            example: 'Juan Perez',
            description: 'Nombre completo del lead',
          },
          proyectoId: {
            type: 'string',
            format: 'uuid',
            example: 'a3b5c7d9-1234-5678-9abc-def012345678',
            description: 'ID del proyecto al que pertenece el lead',
          },
          vendedorId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: 'a3b5c7d9-1234-5678-9abc-def012345678',
            description: 'ID del vendedor asignado (opcional)',
          },
          userId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: 'a3b5c7d9-1234-5678-9abc-def012345678',
            description: 'ID del usuario que crea el lead',
          },
          rubro: {
            type: 'string',
            nullable: true,
            example: 'Restaurante',
            description: 'Tipo de negocio',
          },
          email: {
            type: 'string',
            format: 'email',
            nullable: true,
            example: 'juan@example.com',
          },
          horarioVisita: {
            type: 'string',
            nullable: true,
            example: '2025-12-24 10:00',
          },
          horarioVisitaTimestamp: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2025-12-24T10:00:00.000Z',
          },
          historialConversacion: {
            type: 'string',
            nullable: true,
            description: 'Historial completo de la conversación',
          },
          historialReciente: {
            type: 'string',
            nullable: true,
            description: 'Últimos mensajes de la conversación',
          },
          ultimoMensaje: {
            type: 'string',
            nullable: true,
            example: 'Estoy interesado en un local',
          },
          tipificacionNivel1: {
            type: 'string',
            nullable: true,
            example: 'Interesado',
          },
          tipificacionNivel2: {
            type: 'string',
            nullable: true,
            example: 'Pregunta por disponibilidad',
          },
          tipificacionNivel3: {
            type: 'string',
            nullable: true,
            example: 'Solicita visita',
          },
        },
      },
      CreateLeadSuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          lead: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: 'a3b5c7d9-1234-5678-9abc-def012345678',
              },
              nombre: {
                type: 'string',
                example: 'Juan Perez',
              },
              telefono: {
                type: 'string',
                example: '51987654321',
              },
            },
          },
          message: {
            type: 'string',
            example: 'Lead "Juan Perez" creado exitosamente',
          },
        },
      },
      CreateLeadDuplicateResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          duplicate: {
            type: 'boolean',
            example: true,
          },
          existingLead: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: 'a3b5c7d9-1234-5678-9abc-def012345678',
              },
              nombre: {
                type: 'string',
                example: 'Juan Perez',
              },
              telefono: {
                type: 'string',
                example: '51987654321',
              },
              vendedor_nombre: {
                type: 'string',
                example: 'Alonso Gutierrez',
              },
            },
          },
        },
      },
      Proyecto: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: 'a3b5c7d9-1234-5678-9abc-def012345678',
          },
          nombre: {
            type: 'string',
            example: 'Victoria Eco Plaza Callao',
          },
          slug: {
            type: 'string',
            example: 'callao',
          },
          color: {
            type: 'string',
            example: '#3B82F6',
          },
          activo: {
            type: 'boolean',
            example: true,
          },
        },
      },
    },
  },
  paths: {
    '/api/public/proyectos': {
      get: {
        tags: ['Public'],
        summary: 'Obtener lista de proyectos activos',
        description: 'Endpoint público que retorna todos los proyectos activos del sistema. Usado por app móvil para dropdown de proyectos.',
        responses: {
          '200': {
            description: 'Lista de proyectos activos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    proyectos: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Proyecto',
                      },
                    },
                  },
                },
                example: {
                  success: true,
                  proyectos: [
                    {
                      id: 'a3b5c7d9-1234-5678-9abc-def012345678',
                      nombre: 'Victoria Eco Plaza Callao',
                      slug: 'callao',
                      color: '#3B82F6',
                    },
                  ],
                },
              },
            },
          },
          '500': {
            description: 'Error interno del servidor',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/extension/login': {
      post: {
        tags: ['Extension'],
        summary: 'Autenticación de usuario',
        description: 'Endpoint público para login de usuarios de la extensión Chrome. Retorna tokens de sesión y datos del usuario.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login exitoso',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse',
                },
              },
            },
          },
          '400': {
            description: 'Datos faltantes',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  success: false,
                  error: 'Email y contraseña son requeridos',
                },
              },
            },
          },
          '401': {
            description: 'Credenciales inválidas',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  success: false,
                  error: 'Credenciales inválidas',
                },
              },
            },
          },
          '403': {
            description: 'Usuario sin permisos o desactivado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  success: false,
                  error: 'No tienes permisos para usar esta extensión',
                },
              },
            },
          },
          '404': {
            description: 'Usuario no encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  success: false,
                  error: 'Usuario no encontrado en el sistema',
                },
              },
            },
          },
          '500': {
            description: 'Error interno del servidor',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/extension/create-lead': {
      post: {
        tags: ['Extension'],
        summary: 'Crear nuevo lead',
        description: 'Endpoint protegido para crear leads desde la extensión Chrome. Requiere autenticación Bearer token.',
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateLeadRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Lead creado exitosamente o duplicado detectado',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      $ref: '#/components/schemas/CreateLeadSuccessResponse',
                    },
                    {
                      $ref: '#/components/schemas/CreateLeadDuplicateResponse',
                    },
                  ],
                },
              },
            },
          },
          '400': {
            description: 'Datos faltantes',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  success: false,
                  error: 'Teléfono, nombre y proyecto son requeridos',
                },
              },
            },
          },
          '401': {
            description: 'No autorizado - Token faltante o inválido',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  tokenMissing: {
                    summary: 'Token no proporcionado',
                    value: {
                      success: false,
                      error: 'Token de autorización requerido',
                    },
                  },
                  tokenInvalid: {
                    summary: 'Token inválido o expirado',
                    value: {
                      success: false,
                      error: 'Sesión inválida o expirada',
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Error interno del servidor',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Public',
      description: 'Endpoints públicos sin autenticación',
    },
    {
      name: 'Extension',
      description: 'Endpoints para la extensión Chrome de WhatsApp',
    },
  ],
};
