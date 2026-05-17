import { build } from 'esbuild';

await build({
  entryPoints: ['./src/index.ts'],
  outdir: './dist',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  keepNames: true,
  external: [
    '@prisma/client',
    '@prisma/adapter-pg',
    '@prisma/extension-omit',
    'fastify',
    '@fastify/*',
    'bcryptjs',
    'otplib',
    'qrcode',
    'stripe',
    'ioredis',
    'zod',
    'dotenv',
    'uuid',
  ],
});

console.log('Built ./dist/index.js');