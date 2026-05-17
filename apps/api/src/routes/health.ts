import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        status: 'ok',
        service: 'ecommerce-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    });
  });
}
