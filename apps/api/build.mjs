import { build } from 'esbuild';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

async function getEntryPoints(dir, basePath = dir) {
  const entries = [];
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      entries.push(...await getEntryPoints(fullPath, basePath));
    } else if (item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
      entries.push(fullPath);
    }
  }
  return entries;
}

const entryPoints = await getEntryPoints('./src');

await build({
  entryPoints,
  outdir: './dist',
  bundle: false,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  keepNames: true,
});

console.log(`Built ${entryPoints.length} files to ./dist`);