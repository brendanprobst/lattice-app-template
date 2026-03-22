/**
 * Swagger route decorators - Helper functions to generate Swagger JSDoc comments
 */

export interface SwaggerRouteOptions {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  summary: string;
  tags: string[];
  parameters?: SwaggerParameter[];
  requestBody?: SwaggerRequestBody;
  responses: SwaggerResponse[];
}

export interface SwaggerParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema?: {
    type: string;
    enum?: string[];
  };
  description?: string;
}

export interface SwaggerRequestBody {
  required?: boolean;
  content: {
    [key: string]: {
      schema: {
        type: string;
        required?: string[];
        properties?: Record<string, any>;
      };
    };
  };
}

export interface SwaggerResponse {
  status: number;
  description: string;
  content?: {
    [key: string]: {
      schema: any;
    };
  };
}

/**
 * Generates Swagger JSDoc comment for a route
 */
export function swaggerRoute(options: SwaggerRouteOptions): string {
  const { path, method, summary, tags, parameters, requestBody, responses } = options;

  let doc = `/**
 * @swagger
 * ${path}:
 *   ${method}:
 *     summary: ${summary}
 *     tags: [${tags.map(t => t).join(', ')}]`;

  // Add parameters
  if (parameters && parameters.length > 0) {
    doc += `\n *     parameters:`;
    for (const param of parameters) {
      doc += `\n *       - in: ${param.in}`;
      doc += `\n *         name: ${param.name}`;
      if (param.required !== undefined) {
        doc += `\n *         required: ${param.required}`;
      }
      if (param.schema) {
        doc += `\n *         schema:`;
        doc += `\n *           type: ${param.schema.type}`;
        if (param.schema.enum) {
          doc += `\n *           enum: [${param.schema.enum.join(', ')}]`;
        }
      }
      if (param.description) {
        doc += `\n *         description: ${param.description}`;
      }
    }
  }

  // Add request body
  if (requestBody) {
    doc += `\n *     requestBody:`;
    if (requestBody.required !== undefined) {
      doc += `\n *       required: ${requestBody.required}`;
    }
    doc += `\n *       content:`;
    for (const [contentType, content] of Object.entries(requestBody.content)) {
      doc += `\n *         ${contentType}:`;
      doc += `\n *           schema:`;
      doc += `\n *             type: ${content.schema.type}`;
      if (content.schema.required) {
        doc += `\n *             required:`;
        for (const req of content.schema.required) {
          doc += `\n *               - ${req}`;
        }
      }
      if (content.schema.properties) {
        doc += `\n *             properties:`;
        for (const [propName, propValue] of Object.entries(content.schema.properties)) {
          doc += `\n *               ${propName}:`;
          if (propValue.type) {
            doc += `\n *                 type: ${propValue.type}`;
          }
          if (propValue.enum) {
            doc += `\n *                 enum: [${propValue.enum.join(', ')}]`;
          }
          if (propValue.example) {
            doc += `\n *                 example: ${propValue.example}`;
          }
        }
      }
    }
  }

  // Add responses
  doc += `\n *     responses:`;
  for (const response of responses) {
    doc += `\n *       ${response.status}:`;
    doc += `\n *         description: ${response.description}`;
    if (response.content) {
      doc += `\n *         content:`;
      for (const [contentType, content] of Object.entries(response.content)) {
        doc += `\n *           ${contentType}:`;
        doc += `\n *             schema:`;
        if (content.schema.type) {
          doc += `\n *               type: ${content.schema.type}`;
        }
        if (content.schema.properties) {
          doc += `\n *               properties:`;
          for (const [propName, propValue] of Object.entries(content.schema.properties)) {
            // propValue is typed as unknown; cast to expected type
            const typedProp = propValue as { type?: string; example?: unknown };
            doc += `\n *                 ${propName}:`;
            if (typedProp.type) {
              doc += `\n *                   type: ${typedProp.type}`;
            }
            if (typedProp.example !== undefined) {
              doc += `\n *                   example: ${typedProp.example}`;
            }
          }
        }
      }
    }
  }

  doc += `\n */`;

  return doc;
}
