import { build } from 'esbuild';

await build({
  entryPoints: ['./src/index.ts', './src/scripts/sync-full-catalog.ts'],
  outdir: './dist',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  keepNames: true,
  external: [
    '@prisma/client',
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
    'jsdom',
    'isomorphic-dompurify',
    'react',
    'react-dom',
    'react-dom/server',
    '@react-email/*',
    'resend',
  ],
});

console.log('Built ./dist/index.js and ./dist/scripts/sync-full-catalog.js');