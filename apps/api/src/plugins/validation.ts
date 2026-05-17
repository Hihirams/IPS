import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

class ValidationError extends Error {
  statusCode = 400;
  details: { path: string; message: string }[];

  constructor(details: { path: string; message: string }[]) {
    super('Los datos enviados no son validos.');
    this.details = details;
  }
}

/**
 * Plugin de validacion con Zod para Fastify.
 *
 * Proporciona el decorator `request.validate(schema, target)`
 * donde target = 'body' | 'params' | 'query'.
 *
 * En caso de error, responde 400 con mensajes claros SIN exponer detalles internos.
 */
export default fp(async function validationPlugin(_app: FastifyInstance) {
  _app.decorateRequest(
    'validate',
    function (
      this: FastifyRequest,
      schema: ZodSchema,
      target: 'body' | 'params' | 'query' = 'body'
    ) {
      try {
        let data: unknown;
        switch (target) {
          case 'body':
            data = this.body;
            break;
          case 'params':
            data = this.params;
            break;
          case 'query':
            data = this.query;
            break;
        }
        return schema.parse(data);
      } catch (err) {
        if (err instanceof ZodError) {
          const details = err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }));

          throw new ValidationError(details);
        }
        throw err;
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