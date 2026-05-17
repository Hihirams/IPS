import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import type { ValidationErrorResponse } from '@ecommerce/types';

/**
 * Plugin de validación con Zod para Fastify.
 *
 * Proporciona el decorator `request.validate(schema, target)`
 * donde target = 'body' | 'params' | 'query'.
 *
 * En caso de error, responde 400 con mensajes claros SIN exponer detalles internos.
 */
export default fp(async function validationPlugin(app: FastifyInstance) {
  app.decorate(
    'validate',
    function (
      request: FastifyRequest,
      schema: ZodSchema,
      target: 'body' | 'params' | 'query' = 'body'
    ) {
      try {
        let data: unknown;
        switch (target) {
          case 'body':
            data = request.body;
            break;
          case 'params':
            data = request.params;
            break;
          case 'query':
            data = request.query;
            break;
        }
        return schema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const details = error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }));

          const response: ValidationErrorResponse = {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Los datos enviados no son válidos.',
              details,
            },
          };

          // Lanzar para que Fastify maneje el error
          throw app.httpErrors.badRequest(JSON.stringify(response));
        }
        throw error;
      }
    }
  );
});

// Type declaration for the decorator
declare module 'fastify' {
  interface FastifyRequest {
    validate: (
      schema: ZodSchema,
      target?: 'body' | 'params' | 'query'
    ) => unknown;
  }
}
