const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) {
    let value = match[2];
    // Remove comments and quotes
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

async function getCategories(token) {
  const response = await fetch(CATEGORIES_URL, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Categories request failed: ${response.status} ${text}`);
  }
  return response.json();
}

async function getProductCount(token, categoryId) {
  const url = `${PRODUCTS_URL}?categoria=${encodeURIComponent(categoryId)}&pagina=1`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Products request failed for category ${categoryId}: ${response.status} ${text}`);
  }
  return response.json();
}

async function main() {
  const token = await getToken();
  console.log('Got OAuth token');

  const categories = await getCategories(token);
  console.log(`Got ${categories.length} top-level categories`);

  const results = [];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    console.log(`Fetching category ${i + 1}/${categories.length}: ${cat.nombre} (id: ${cat.id})`);
    try {
      const data = await getProductCount(token, cat.id);
      results.push({
        id: cat.id,
        nombre: cat.nombre,
        cantidad: data.cantidad || 0,
        paginas: data.paginas || 0
      });
    } catch (err) {
      console.error(`Error for category ${cat.id}: ${err.message}`);
      results.push({
        id: cat.id,
        nombre: cat.nombre,
        cantidad: 0,
        paginas: 0
      });
    }

    if (i < categories.length - 1) {
      await sleep(1100);
    }
  }

  // Sort by cantidad descending
  results.sort((a, b) => b.cantidad - a.cantidad);

  const top10 = results.slice(0, 10);
  const sumTop10 = top10.reduce((sum, r) => sum + r.cantidad, 0);
  const sumAll = results.reduce((sum, r) => sum + r.cantidad, 0);

  console.log('\n=== RESULTS ===\n');
  console.log('Top 10 categories by cantidad:');
  console.log('Rank | Name | Cantidad | Paginas');
  console.log('---|---|---|---');
  top10.forEach((r, i) => {
    console.log(`${i + 1} | ${r.nombre} | ${r.cantidad} | ${r.paginas}`);
  });
  console.log('\nSum of top 10 cantidad:', sumTop10.toLocaleString());
  console.log('Sum of ALL categories cantidad:', sumAll.toLocaleString());
  console.log('\nNote: current DB has ~38,425 unique products');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
