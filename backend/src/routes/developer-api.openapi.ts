export const openApiSpecification = {
  openapi: '3.0.3',
  info: {
    title: 'TeleDrive Developer API',
    version: '1.0.0',
    description:
      'High-performance, reliable Telegram-backed cloud storage and streaming download API with distributed delivery.',
  },
  servers: [
    {
      url: '/developer/v1',
      description: 'Primary Developer API Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Developer API key formatted as keyId:rawSecret',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Session authorization token',
      },
    },
    schemas: {
      File: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          size: { type: 'integer' },
          mimeType: { type: 'string' },
          checksum: { type: 'string' },
          status: { type: 'string', enum: ['ready', 'processing', 'failed'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
  paths: {
    '/status': {
      get: {
        summary: 'Check API status',
        responses: {
          '200': {
            description: 'API operational status',
          },
        },
      },
    },
    '/files': {
      get: {
        summary: 'List user files with pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'folderId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Paginated file list',
          },
        },
      },
    },
    '/upload': {
      post: {
        summary: 'Direct bounded streaming upload',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  folderId: { type: 'string' },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'File uploaded successfully',
          },
        },
      },
    },
    '/files/{fileId}/downloads': {
      post: {
        summary: 'Generate signed streaming download authorization URL',
        parameters: [
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  expiresInSeconds: { type: 'integer', minimum: 60, maximum: 86400, default: 3600 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Cryptographically signed download URL generated',
          },
        },
      },
    },
  },
};
