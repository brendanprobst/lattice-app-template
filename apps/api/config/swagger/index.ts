import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lattice API',
      version: '1.0.0',
      description: `API documentation for the Lattice API.

Authentication:
- Protected routes use Bearer auth with a Supabase access token.
- In Swagger UI, click **Authorize** and set value as: 'Bearer <access_token></access_token>'.
- You can get 'access_toke' by signing in through the web app ('/login') and reading the Supabase session token in browser storage/devtools.
`,
      contact: {
        name: 'Lattice Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase access token. Format: Bearer <access_token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                status: {
                  type: 'number',
                  description: 'HTTP status code',
                },
                code: {
                  type: 'string',
                  description: 'Error code for programmatic handling',
                  example: 'THING_NOT_FOUND',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                stack: {
                  type: 'string',
                  description: 'Stack trace (development only)',
                },
              },
              required: ['status', 'code', 'message'],
            },
          },
        },
        Thing: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Thing ID',
              example: 1001,
            },
            name: {
              type: 'string',
              description: 'Display name',
              example: 'Example thing',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation time (ISO 8601)',
            },
          },
          required: ['id', 'name', 'createdAt'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  } as SwaggerDefinition,
  apis: [
    './routes/*.ts',
    './routes/*.js',
    './config/swagger/decorators/things.decorators.ts',
    './config/swagger/decorators/profile.decorators.ts',
    './config/swagger/decorators/index.decorators.ts',
    './app.ts',
    './app.js'
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
