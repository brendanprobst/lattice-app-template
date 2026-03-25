import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lattice API',
      version: '1.0.0',
      description: 'API documentation for the Lattice API',
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
              type: 'string',
              description: 'Thing ID',
              example: 'thing-550e8400-e29b-41d4-a716-446655440000',
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
  } as SwaggerDefinition,
  apis: [
    './routes/*.ts',
    './routes/*.js',
    './config/swagger/decorators/things.decorators.ts',
    './config/swagger/decorators/index.decorators.ts',
    './app.ts',
    './app.js'
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
