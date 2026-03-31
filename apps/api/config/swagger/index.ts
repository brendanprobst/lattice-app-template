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
- Protected routes expect a **Supabase Auth access token** (JWT), not the anon key, service_role key, or API key.
- In Swagger UI, click **Authorize** and paste **only the JWT** (Swagger adds the \`Bearer \` prefix). Do not paste \`Bearer …\` again.
- Get a token: sign in via the web app (\`/login\`), then read \`session.access_token\` from the Supabase client (or Application → Local Storage / session in devtools for the Supabase project).
- The API must use the same Supabase project as the token: set \`SUPABASE_URL\` (and optional \`SUPABASE_JWT_ISSUER\`) in \`apps/api/.env\` to match that project.
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
          description:
            'Supabase session access_token (JWT only). Paste the token here — do not include the word Bearer.',
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
