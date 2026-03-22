import { swaggerRoute } from './route.decorator';

/**
 * Swagger decorators for Thing routes
 */

/**
 * @swagger
 * /things:
 *   get:
 *     summary: List all things
 *     tags: [Things]
 *     responses:
 *       200:
 *         description: List of things
 *   post:
 *     summary: Create a thing
 *     tags: [Things]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid input
 */
export const listThingsDoc = swaggerRoute({
  path: '/things',
  method: 'get',
  summary: 'List all things',
  tags: ['Things'],
  responses: [
    {
      status: 200,
      description: 'List of things',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/Thing' },
          },
        },
      },
    },
  ],
});

export const createThingDoc = swaggerRoute({
  path: '/things',
  method: 'post',
  summary: 'Create a thing',
  tags: ['Things'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Example thing' },
          },
        },
      },
    },
  },
  responses: [
    {
      status: 201,
      description: 'Created',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Thing' },
        },
      },
    },
    { status: 400, description: 'Validation error' },
  ],
});

/**
 * @swagger
 * /things/{id}:
 *   get:
 *     summary: Get a thing by id
 *     tags: [Things]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thing
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a thing
 *     tags: [Things]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a thing
 *     tags: [Things]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
export const getThingByIdDoc = swaggerRoute({
  path: '/things/{id}',
  method: 'get',
  summary: 'Get a thing by id',
  tags: ['Things'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Thing id',
    },
  ],
  responses: [
    {
      status: 200,
      description: 'Thing',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Thing' },
        },
      },
    },
    { status: 404, description: 'Not found' },
  ],
});

export const updateThingDoc = swaggerRoute({
  path: '/things/{id}',
  method: 'put',
  summary: 'Update a thing',
  tags: ['Things'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Thing id',
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Updated name' },
          },
        },
      },
    },
  },
  responses: [
    {
      status: 200,
      description: 'Updated thing',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Thing' },
        },
      },
    },
    { status: 400, description: 'Validation error' },
    { status: 404, description: 'Not found' },
  ],
});

export const deleteThingDoc = swaggerRoute({
  path: '/things/{id}',
  method: 'delete',
  summary: 'Delete a thing',
  tags: ['Things'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Thing id',
    },
  ],
  responses: [
    { status: 204, description: 'Deleted' },
    { status: 404, description: 'Not found' },
  ],
});
