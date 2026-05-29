const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) {
    let value = match[2];
    const ci = value.indexOf('#');
    if (ci !== -1) value = value.slice(0, ci);
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[match[1]] = value;
  }
}

const CLIENT_ID = envVars.SYSCOM_CLIENT_ID;
const CLIENT_SECRET = envVars.SYSCOM_CLIENT_SECRET;
const TOKEN_URL = 'https://developers.syscom.mx/oauth/token';
const PRODUCTS_URL = 'https://developers.syscom.mx/api/v1/productos';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getToken() {
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials' })
  });
  const d = await r.json();
  return d.access_token;
}

async function apiGet(token, url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 429) { console.log('  Rate limited, waiting 60s...'); await sleep(60000); return apiGet(token, url); }
  if (!r.ok) { const t = await r.text(); throw new Error(`${r.status}: ${t.slice(0, 300)}`); }
  return r.json();
}

async function main() {
  const token = await getToken();
  console.log('Token OK\n');

  // --- Búsqueda 1: por keywords del producto ---
  const searches = [
    'bifacial+620',
    'modulo+solar+bifacial+620',
    'TOPCON+620',
    'solar+620W',
    'bifacial+TOPCON',
  ];

  for (const q of searches) {
    console.log(`\n🔍 busqueda="${q}"`);
    try {
      const data = await apiGet(token, `${PRODUCTS_URL}?busqueda=${encodeURIComponent(q)}&pagina=1`);
      console.log(`   cantidad: ${data.cantidad}, paginas: ${data.paginas}`);
      if (data.productos && data.productos.length > 0) {
        for (const p of data.productos.slice(0, 5)) {
          console.log(`   ├─ ID: ${p.producto_id} | ${p.modelo} | ${p.titulo}`);
          console.log(`   │  marca: ${p.marca} | stock: ${p.total_existencia}`);
          if (p.categorias) {
            console.log(`   │  categorías: ${p.categorias.map(c => `${c.nombre}(${c.id})`).join(', ')}`);
          }
        }
      } else {
        console.log('   (sin resultados)');
      }
    } catch (err) {
      console.log(`   ERROR: ${err.message}`);
    }
    await sleep(1100);
  }

  // --- Búsqueda 2: por categoría de Energía (id: 30) con término ---
  console.log('\n\n🔍 Categoría Energía (30) + busqueda="bifacial"');
  try {
    const data = await apiGet(token, `${PRODUCTS_URL}?categoria=30&busqueda=${encodeURIComponent('bifacial')}&pagina=1`);
    console.log(`   cantidad: ${data.cantidad}, paginas: ${data.paginas}`);
    if (data.productos) {
      for (const p of data.productos.slice(0, 10)) {
        console.log(`   ├─ ID: ${p.producto_id} | ${p.modelo} | ${p.titulo}`);
        console.log(`   │  marca: ${p.marca} | stock: ${p.total_existencia}`);
        if (p.categorias) {
          console.log(`   │  categorías: ${p.categorias.map(c => `${c.nombre}(${c.id})`).join(', ')}`);
        }
      }
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }
  await sleep(1100);

  // --- Búsqueda 3: por categoría Energía (30), buscar "620" ---
  console.log('\n\n🔍 Categoría Energía (30) + busqueda="620"');
  try {
    const data = await apiGet(token, `${PRODUCTS_URL}?categoria=30&busqueda=${encodeURIComponent('620')}&pagina=1`);
    console.log(`   cantidad: ${data.cantidad}, paginas: ${data.paginas}`);
    if (data.productos) {
      for (const p of data.productos.slice(0, 10)) {
        console.log(`   ├─ ID: ${p.producto_id} | ${p.modelo} | ${p.titulo}`);
        console.log(`   │  marca: ${p.marca} | stock: ${p.total_existencia}`);
        if (p.categorias) {
          console.log(`   │  categorías: ${p.categorias.map(c => `${c.nombre}(${c.id})`).join(', ')}`);
        }
      }
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }
  await sleep(1100);

  // --- Búsqueda 4: solo categoría Energía, últimas páginas para ver productos nuevos ---
  console.log('\n\n🔍 Categoría Energía (30) - página 1 (verificar total)');
  try {
    const data = await apiGet(token, `${PRODUCTS_URL}?categoria=30&pagina=1`);
    console.log(`   cantidad total: ${data.cantidad}, paginas: ${data.paginas}`);
    // También buscar en última página
    if (data.paginas > 1) {
      await sleep(1100);
      console.log(`\n🔍 Categoría Energía (30) - última página (${data.paginas})`);
      const lastPage = await apiGet(token, `${PRODUCTS_URL}?categoria=30&pagina=${data.paginas}`);
      console.log(`   productos en última página: ${lastPage.productos?.length || 0}`);
      if (lastPage.productos) {
        for (const p of lastPage.productos.slice(-5)) {
          console.log(`   ├─ ID: ${p.producto_id} | ${p.modelo} | ${p.titulo}`);
        }
      }
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }

  // --- Búsqueda 5: buscar "modulo solar" genérico ---
  await sleep(1100);
  console.log('\n\n🔍 busqueda="modulo+solar+doble+vidrio"');
  try {
    const data = await apiGet(token, `${PRODUCTS_URL}?busqueda=${encodeURIComponent('modulo+solar+doble+vidrio')}&pagina=1`);
    console.log(`   cantidad: ${data.cantidad}, paginas: ${data.paginas}`);
    if (data.productos) {
      for (const p of data.productos.slice(0, 10)) {
        console.log(`   ├─ ID: ${p.producto_id} | ${p.modelo} | ${p.titulo}`);
        console.log(`   │  marca: ${p.marca} | stock: ${p.total_existencia}`);
      }
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
