import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  // ==========================================
  // 1. Categorías
  // ==========================================
  const laptops = await prisma.category.upsert({
    where: { slug: 'laptops' },
    update: {},
    create: {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Portátiles de alto rendimiento para trabajo, estudio y gaming.',
      image: 'https://res.cloudinary.com/demo/categories/laptops.jpg',
      isActive: true,
    },
  });

  const smartphones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Los smartphones más avanzados del mercado.',
      image: 'https://res.cloudinary.com/demo/categories/smartphones.jpg',
      isActive: true,
    },
  });

  const accesorios = await prisma.category.upsert({
    where: { slug: 'accesorios' },
    update: {},
    create: {
      name: 'Accesorios',
      slug: 'accesorios',
      description: 'Periféricos, audífonos, relojes inteligentes y más.',
      image: 'https://res.cloudinary.com/demo/categories/accesorios.jpg',
      isActive: true,
    },
  });

  // ==========================================
  // 2. Marcas
  // ==========================================
  const apple = await prisma.brand.upsert({
    where: { slug: 'apple' },
    update: {},
    create: {
      name: 'Apple',
      slug: 'apple',
      logo: 'https://res.cloudinary.com/demo/brands/apple.svg',
      isActive: true,
    },
  });

  const samsung = await prisma.brand.upsert({
    where: { slug: 'samsung' },
    update: {},
    create: {
      name: 'Samsung',
      slug: 'samsung',
      logo: 'https://res.cloudinary.com/demo/brands/samsung.svg',
      isActive: true,
    },
  });

  // ==========================================
  // 3. Productos (5 productos con specs realistas)
  // ==========================================
  const product1 = await prisma.product.upsert({
    where: { sku: 'MBP14-M3-512' },
    update: {},
    create: {
      sku: 'MBP14-M3-512',
      name: 'MacBook Pro 14" M3 Pro',
      slug: 'macbook-pro-14-m3-pro',
      description:
        'La MacBook Pro 14 pulgadas con chip M3 Pro ofrece un rendimiento extraordinario con hasta 18GB de memoria unificada y 512GB de almacenamiento SSD ultrarrápido. Pantalla Liquid Retina XDR de 14.2 pulgadas.',
      specs: {
        processor: 'Apple M3 Pro (11-core CPU, 14-core GPU)',
        ram: '18GB Unified Memory',
        storage: '512GB SSD',
        display: '14.2" Liquid Retina XDR (3024×1964)',
        battery: 'Hasta 18 horas',
        ports: '3× Thunderbolt 4, HDMI, SDXC, MagSafe 3',
        weight: '1.61 kg',
        os: 'macOS Sonoma',
      },
      price: 44999.0,
      comparePrice: 47999.0,
      cost: 32000.0,
      stock: 25,
      lowStockThreshold: 5,
      images: [
        'https://res.cloudinary.com/demo/products/mbp14-1.jpg',
        'https://res.cloudinary.com/demo/products/mbp14-2.jpg',
      ],
      isActive: true,
      isFeatured: true,
      categoryId: laptops.id,
      brandId: apple.id,
    },
  });

  const product2 = await prisma.product.upsert({
    where: { sku: 'IP15P-256-BLK' },
    update: {},
    create: {
      sku: 'IP15P-256-BLK',
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description:
        'iPhone 15 Pro con diseño en titanio de grado aeroespacial. Chip A17 Pro para gaming y experiencias inmersivas. Sistema de cámaras Pro de 48MP.',
      specs: {
        processor: 'Apple A17 Pro (3nm)',
        ram: '8GB',
        storage: '256GB',
        display: '6.1" Super Retina XDR OLED (2556×1179)',
        camera: '48MP Main + 12MP Ultra Wide + 12MP Telephoto',
        battery: 'Hasta 23 horas de reproducción de video',
        connectivity: '5G, Wi-Fi 6E, Bluetooth 5.3, USB-C 3.0',
        waterResistance: 'IP68 (6m por 30 min)',
        os: 'iOS 17',
      },
      price: 24999.0,
      comparePrice: 26999.0,
      cost: 18000.0,
      stock: 40,
      lowStockThreshold: 8,
      images: [
        'https://res.cloudinary.com/demo/products/iphone15pro-1.jpg',
        'https://res.cloudinary.com/demo/products/iphone15pro-2.jpg',
      ],
      isActive: true,
      isFeatured: true,
      categoryId: smartphones.id,
      brandId: apple.id,
    },
  });

  const product3 = await prisma.product.upsert({
    where: { sku: 'SGS24U-256-GRY' },
    update: {},
    create: {
      sku: 'SGS24U-256-GRY',
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description:
        'El Galaxy S24 Ultra redefine la movilidad con Galaxy AI. Pantalla de 6.8" con S Pen integrado. Cámara de 200MP con zoom óptico 5x.',
      specs: {
        processor: 'Snapdragon 8 Gen 3 for Galaxy',
        ram: '12GB',
        storage: '256GB',
        display: '6.8" Dynamic AMOLED 2X QHD+ (3120×1440), 120Hz',
        camera: '200MP Main + 50MP Periscope (5x) + 10MP Telephoto (3x) + 12MP Ultra Wide',
        battery: '5000mAh, carga rápida 45W',
        connectivity: '5G, Wi-Fi 7, Bluetooth 5.3, USB-C 3.2',
        waterResistance: 'IP68',
        sPen: 'Integrado con latencia de 2.8ms',
        os: 'Android 14 / One UI 6.1',
      },
      price: 27999.0,
      comparePrice: null,
      cost: 20000.0,
      stock: 30,
      lowStockThreshold: 6,
      images: [
        'https://res.cloudinary.com/demo/products/s24ultra-1.jpg',
        'https://res.cloudinary.com/demo/products/s24ultra-2.jpg',
      ],
      isActive: true,
      isFeatured: true,
      categoryId: smartphones.id,
      brandId: samsung.id,
    },
  });

  const product4 = await prisma.product.upsert({
    where: { sku: 'GW6-40-BLK' },
    update: {},
    create: {
      sku: 'GW6-40-BLK',
      name: 'Samsung Galaxy Watch 6',
      slug: 'samsung-galaxy-watch-6',
      description:
        'Reloj inteligente premium con seguimiento avanzado de salud y fitness. Pantalla Super AMOLED de 1.5". Resistencia al agua 5ATM + IP68.',
      specs: {
        processor: 'Exynos W930 (5nm)',
        ram: '2GB',
        storage: '16GB',
        display: '1.5" Super AMOLED (480×480), Always On Display',
        sensors: 'BioActive (ECG, BIA, SpO2, HR), Acelerómetro, Giroscopio, Barómetro',
        battery: '425mAh, hasta 40 horas',
        connectivity: 'Bluetooth 5.3, Wi-Fi, NFC (Samsung Pay), LTE (opcional)',
        waterResistance: '5ATM + IP68 + MIL-STD-810H',
        compatibility: 'Android 10+ con Samsung Wearable app',
        os: 'Wear OS 4 / One UI Watch 5',
      },
      price: 6499.0,
      comparePrice: 7499.0,
      cost: 4500.0,
      stock: 15,
      lowStockThreshold: 3,
      images: [
        'https://res.cloudinary.com/demo/products/gwatch6-1.jpg',
      ],
      isActive: true,
      isFeatured: false,
      categoryId: accesorios.id,
      brandId: samsung.id,
    },
  });

  const product5 = await prisma.product.upsert({
    where: { sku: 'APP2-USB-C' },
    update: {},
    create: {
      sku: 'APP2-USB-C',
      name: 'AirPods Pro 2 (USB-C)',
      slug: 'airpods-pro-2-usb-c',
      description:
        'AirPods Pro 2 con conector USB-C y chip H2. Cancelación activa de ruido de última generación, audio espacial personalizado y hasta 6 horas de audio con una sola carga.',
      specs: {
        chip: 'Apple H2',
        connectivity: 'Bluetooth 5.3, USB-C (estuche)',
        audio: 'Cancelación Activa de Ruido, Modo Transparencia, Audio Espacial Adaptativo',
        battery: 'Hasta 6h (ANC on), 30h total con estuche',
        sensors: 'Micrófono de haz dual, Sensor de fuerza, Sensor de piel',
        waterResistance: 'IP54 (auriculares y estuche)',
        case: 'Estuche de carga MagSafe con altavoz integrado',
        compatibility: 'iOS 17+, iPadOS 17+, macOS Sonoma+, tvOS 17+',
      },
      price: 5999.0,
      comparePrice: 6499.0,
      cost: 4000.0,
      stock: 50,
      lowStockThreshold: 10,
      images: [
        'https://res.cloudinary.com/demo/products/airpodspro2-1.jpg',
        'https://res.cloudinary.com/demo/products/airpodspro2-2.jpg',
      ],
      isActive: true,
      isFeatured: false,
      categoryId: accesorios.id,
      brandId: apple.id,
    },
  });

  // ==========================================
  // 4. Usuarios (1 admin + 1 normal)
  // ==========================================
  const adminPassword = await hashPassword('AdminSecure123!');
  const userPassword = await hashPassword('UserPass456!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      email: 'admin@ecommerce.com',
      passwordHash: adminPassword,
      name: 'Administrador',
      phone: '+52 55 1234 5678',
      role: Role.ADMIN,
      isEmailVerified: true,
      isBanned: false,
      failedLoginAttempts: 0,
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'user@ecommerce.com' },
    update: {},
    create: {
      email: 'user@ecommerce.com',
      passwordHash: userPassword,
      name: 'Usuario Demo',
      phone: '+52 55 9876 5432',
      role: Role.USER,
      isEmailVerified: true,
      isBanned: false,
      failedLoginAttempts: 0,
    },
  });

  // ==========================================
  // 5. Direcciones
  // ==========================================
  await prisma.address.upsert({
    where: { id: 'seed-addr-1' },
    update: {},
    create: {
      id: 'seed-addr-1',
      userId: normalUser.id,
      label: 'HOME',
      street: 'Av. Insurgentes Sur 1605, Torre A, Piso 12',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '03940',
      country: 'MX',
      isDefault: true,
    },
  });

  await prisma.address.upsert({
    where: { id: 'seed-addr-2' },
    update: {},
    create: {
      id: 'seed-addr-2',
      userId: normalUser.id,
      label: 'OFFICE',
      street: 'Paseo de la Reforma 505, Oficina 301',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06600',
      country: 'MX',
      isDefault: false,
    },
  });

  console.log('✅ Seed completado exitosamente:');
  console.log(`  - Categorías: ${[laptops.name, smartphones.name, accesorios.name].join(', ')}`);
  console.log(`  - Marcas: ${[apple.name, samsung.name].join(', ')}`);
  console.log(`  - Productos: ${[product1.name, product2.name, product3.name, product4.name, product5.name].join(', ')}`);
  console.log(`  - Usuarios: ${admin.email} (ADMIN), ${normalUser.email} (USER)`);
  console.log(`  - Direcciones: 2`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
