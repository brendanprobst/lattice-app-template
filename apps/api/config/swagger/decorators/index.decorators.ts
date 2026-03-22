import { swaggerRoute } from './route.decorator';

/**
 * Swagger decorators for Index/General routes
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get API information
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: DDD API Template
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
export const getApiInfoDoc = swaggerRoute({
  path: '/',
  method: 'get',
  summary: 'Get API information',
  tags: ['General'],
  responses: [
    {
      status: 200,
      description: 'API information',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'DDD API Template' },
              version: { type: 'string', example: '1.0.0' },
            },
          },
        },
      },
    },
  ],
});
