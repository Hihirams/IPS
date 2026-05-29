/**
 * Script de diagnóstico: ¿Cuántos productos tiene Syscom disponibles vía API?
 *
 * Compara la cantidad reportada por la API (sumando por categorías nivel 1)
 * vs. los productos únicos reales, y analiza si el parámetro "agrupar"
 * cambia el total.
 *
 * Uso: node check-syscom-total.js
 */
const fs = require('fs');
const path = require('path');

// ── Load .env ──
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) {
    let value = match[2];
    const commentIndex = value.indexOf('#');
    if (commentIndex !== -1) value = value.slice(0, commentIndex);
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[match[1]] = value;
  }
}

const CLIENT_ID = envVars.SYSCOM_CLIENT_ID;
const CLIENT_SECRET = envVars.SYSCOM_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing SYSCOM_CLIENT_ID or SYSCOM_CLIENT_SECRET in .env');
  process.exit(1);
}

const TOKEN_URL = 'https://developers.syscom.mx/oauth/token';
const CATEGORIES_URL = 'https://developers.syscom.mx/api/v1/categorias';
const PRODUCTS_URL = 'https://developers.syscom.mx/api/v1/productos';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getToken() {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token request failed: ${response.status} ${text}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function apiGet(token, url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 429) {
    console.log('  ⚠ Rate limited (429), esperando 60s...');
    await sleep(60000);
    return apiGet(token, url);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

async function main() {
  const token = await getToken();
  console.log('✅ Token obtenido\n');

  // ── 1. Obtener categorías top-level ──
  const categories = await apiGet(token, CATEGORIES_URL);
  console.log(`📂 Categorías nivel 1: ${categories.length}\n`);

  // ── 2. Para cada categoría, obtener la cantidad SIN agrupar ──
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FASE 1: Cantidad de productos POR CATEGORÍA (sin agrupar)');
  console.log('═══════════════════════════════════════════════════════\n');

  const resultsSinAgrupar = [];
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    console.log(`  [${i + 1}/${categories.length}] ${cat.nombre} (id: ${cat.id})...`);
    try {
      const data = await apiGet(token, `${PRODUCTS_URL}?categoria=${encodeURIComponent(cat.id)}&pagina=1`);
      const cantidad = data.cantidad || 0;
      const paginas = data.paginas || 0;
      console.log(`      → cantidad: ${cantidad.toLocaleString()}, páginas: ${paginas}`);
      resultsSinAgrupar.push({ id: cat.id, nombre: cat.nombre, cantidad, paginas });
    } catch (err) {
      console.error(`      ✗ Error: ${err.message}`);
      resultsSinAgrupar.push({ id: cat.id, nombre: cat.nombre, cantidad: 0, paginas: 0, error: err.message });
    }
    await sleep(1100);
  }

  const sumSinAgrupar = resultsSinAgrupar.reduce((s, r) => s + r.cantidad, 0);

  // ── 3. Para cada categoría, obtener la cantidad CON agrupar=1 ──
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  FASE 2: Cantidad de productos POR CATEGORÍA (con agrupar=1)');
  console.log('═══════════════════════════════════════════════════════\n');

  const resultsConAgrupar = [];
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    console.log(`  [${i + 1}/${categories.length}] ${cat.nombre} (id: ${cat.id})...`);
    try {
      const data = await apiGet(token, `${PRODUCTS_URL}?categoria=${encodeURIComponent(cat.id)}&pagina=1&agrupar=1`);
      const cantidad = data.cantidad || 0;
      const paginas = data.paginas || 0;
      console.log(`      → cantidad: ${cantidad.toLocaleString()}, páginas: ${paginas}`);
      resultsConAgrupar.push({ id: cat.id, nombre: cat.nombre, cantidad, paginas });
    } catch (err) {
      console.error(`      ✗ Error: ${err.message}`);
      resultsConAgrupar.push({ id: cat.id, nombre: cat.nombre, cantidad: 0, paginas: 0, error: err.message });
    }
    await sleep(1100);
  }

  const sumConAgrupar = resultsConAgrupar.reduce((s, r) => s + r.cantidad, 0);

  // ── 4. Prueba adicional: buscar por marcas para ver si hay productos fuera de categorías ──
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  FASE 3: Prueba con búsqueda genérica (busqueda="*")');
  console.log('═══════════════════════════════════════════════════════\n');

  let busquedaTotal = 'N/A';
  try {
    // Intentar buscar con wildcard
    const data = await apiGet(token, `${PRODUCTS_URL}?busqueda=a&pagina=1`);
    busquedaTotal = `cantidad=${data.cantidad}, paginas=${data.paginas}`;
    console.log(`  busqueda="a" → ${busquedaTotal}`);
  } catch (err) {
    console.log(`  busqueda="a" → Error: ${err.message}`);
  }
  await sleep(1100);

  let busquedaTotal2 = 'N/A';
  try {
    const data = await apiGet(token, `${PRODUCTS_URL}?busqueda=e&pagina=1`);
    busquedaTotal2 = `cantidad=${data.cantidad}, paginas=${data.paginas}`;
    console.log(`  busqueda="e" → ${busquedaTotal2}`);
  } catch (err) {
    console.log(`  busqueda="e" → Error: ${err.message}`);
  }
  await sleep(1100);

  // Intentar con stock=0 para incluir productos sin stock
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  FASE 4: Verificar si stock=0 trae más productos');
  console.log('═══════════════════════════════════════════════════════\n');

  // Probar una categoría grande con y sin stock
  const bigCat = resultsSinAgrupar.sort((a, b) => b.cantidad - a.cantidad)[0];
  if (bigCat) {
    try {
      const dataConStock = await apiGet(token, `${PRODUCTS_URL}?categoria=${bigCat.id}&pagina=1&stock=1`);
      console.log(`  Categoría "${bigCat.nombre}" (id: ${bigCat.id}):`);
      console.log(`    Sin filtro stock: cantidad=${bigCat.cantidad}`);
      console.log(`    Con stock=1:      cantidad=${dataConStock.cantidad || 0}`);
    } catch (err) {
      console.log(`  Error con stock=1: ${err.message}`);
    }
  }

  // ── 5. Resumen ──
  console.log('\n\n╔═══════════════════════════════════════════════════════╗');
  console.log('║              RESUMEN DE RESULTADOS                    ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║ Categorías nivel 1:              ${String(categories.length).padStart(10)}       ║`);
  console.log(`║                                                       ║`);
  console.log(`║ Suma por categoría (sin agrupar): ${sumSinAgrupar.toLocaleString().padStart(10)}       ║`);
  console.log(`║ Suma por categoría (con agrupar): ${sumConAgrupar.toLocaleString().padStart(10)}       ║`);
  console.log(`║                                                       ║`);
  console.log(`║ Nota: la suma por categoría incluye DUPLICADOS        ║`);
  console.log(`║ (un producto puede estar en varias categorías)        ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');

  console.log('\n── Detalle por categoría (sin agrupar) ──');
  console.log('Rank | Categoría | Cantidad | Páginas');
  console.log('-----|-----------|----------|--------');
  resultsSinAgrupar
    .sort((a, b) => b.cantidad - a.cantidad)
    .forEach((r, i) => {
      console.log(`${String(i + 1).padStart(4)} | ${r.nombre.padEnd(35).slice(0, 35)} | ${String(r.cantidad).padStart(8)} | ${r.paginas}`);
    });

  console.log('\n── Detalle por categoría (con agrupar) ──');
  console.log('Rank | Categoría | Cantidad | Páginas');
  console.log('-----|-----------|----------|--------');
  resultsConAgrupar
    .sort((a, b) => b.cantidad - a.cantidad)
    .forEach((r, i) => {
      console.log(`${String(i + 1).padStart(4)} | ${r.nombre.padEnd(35).slice(0, 35)} | ${String(r.cantidad).padStart(8)} | ${r.paginas}`);
    });

  console.log(`\n── Búsqueda genérica ──`);
  console.log(`  busqueda="a": ${busquedaTotal}`);
  console.log(`  busqueda="e": ${busquedaTotal2}`);

  // Guardar resultados en archivo
  const report = {
    timestamp: new Date().toISOString(),
    categoriasNivel1: categories.length,
    sumSinAgrupar,
    sumConAgrupar,
    detalleSinAgrupar: resultsSinAgrupar.sort((a, b) => b.cantidad - a.cantidad),
    detalleConAgrupar: resultsConAgrupar.sort((a, b) => b.cantidad - a.cantidad),
    busquedaGenerica: { a: busquedaTotal, e: busquedaTotal2 },
  };
  fs.writeFileSync(path.join(__dirname, 'syscom-product-count-report.json'), JSON.stringify(report, null, 2));
  console.log('\n📄 Reporte guardado en syscom-product-count-report.json');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
