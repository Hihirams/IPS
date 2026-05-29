export interface DisplayCategory {
  name: string;
  slug: string;
  icon: string;
  description: string;
  keywords: string[];
}

export const DISPLAY_CATEGORIES: DisplayCategory[] = [
  {
    name: 'Cámaras y Videovigilancia',
    slug: 'camaras-videovigilancia',
    icon: '📹',
    description: 'Cámaras IP, DVR, NVR, lentes, accesorios de video',
    keywords: [
      'camara', 'video', 'cctv', 'vigilancia', 'dvr', 'nvr', 'turbohd',
      'ip megapixel', 'ptz', 'fisheye', 'hemisferic', 'domo', 'eyeball', 'turret',
      'oculta', 'pinhole', 'lente', 'motorizado', 'iluminador', 'ir',
      'videograbadora', 'mdvr', 'mnvr', 'probador', 'tvi', 'ahd', 'cv',
      'videovigilancia', 'analoga', 'body cam', 'dash cam',
    ],
  },
  {
    name: 'Redes y Conectividad',
    slug: 'redes-conectividad',
    icon: '🌐',
    description: 'Switches, routers, access points, fibra óptica, cableado',
    keywords: [
      'switch', 'router', 'punto de acceso', 'access point', 'wifi', 'fibra optica',
      'patch panel', 'patch cord', 'olt', 'onu', 'ont', 'rack abierto', 'rack cerrado',
      'gabinete', 'charola', 'organizador', 'splitter', 'transceptor', 'sfp',
      'fibra', 'conector', 'cable utp', 'cat5', 'cat6', 'poe', 'inyector',
      'extensor', 'kvm', 'balun', 'convertidor', 'multiplexor',
    ],
  },
  {
    name: 'Control de Acceso',
    slug: 'control-acceso',
    icon: '🔐',
    description: 'Biometría, tarjetas, torniquetes, cerraduras, lectores',
    keywords: [
      'control de acceso', 'biometrico', 'huella', 'rostro', 'proximidad',
      'mifare', 'iclass', 'nfc', 'tarjeta', 'credencial', 'tag', 'lector',
      'torniquete', 'puerta', 'bolardo', 'pilona', 'barrera', 'checador',
      'tiempo y asistencia', 'interfon', 'videoportero', 'doorbell',
      'enrolador', 'impresora', 'punto de venta', 'pos',
    ],
  },
  {
    name: 'Alarmas / Intrusión',
    slug: 'alarmas-intrusion',
    icon: '🚨',
    description: 'Paneles de alarma, detectores de movimiento, sirenas, sensores de intrusión',
    keywords: [
      'alarma', 'detector', 'sensor', 'movimiento', 'magnetico', 'contacto',
      'sismico', 'vibracion', 'rotura', 'vidrio', 'panel de alarma', 'sirena',
      'estrob', 'bocina', 'notificacion', 'voceo', 'honeywell', 'dsc', 'ajax',
      'paradox', 'pirl', 'pir', 'microondas', 'perimetral', 'radar', 'barra',
      'inalambrico', 'intrusion',
    ],
  },
  {
    name: 'Sensores de Incendio',
    slug: 'sensores-incendio',
    icon: '🔥',
    description: 'Detectores de humo, calor, gas, flama; paneles contra incendio',
    keywords: [
      'humo', 'temperatura', 'gas', 'flama', 'fuego', 'incendio', 'humedad',
      'presion', 'flujo', 'fotoelectrico', 'termico', 'detector de humo',
      'detector de calor', 'panel contra incendio', 'suppressant', 'supresion',
      'contra incendio', 'co2', 'agente limpio',
    ],
  },
  {
    name: 'Cómputo y Almacenamiento',
    slug: 'computo-almacenamiento',
    icon: '💻',
    description: 'Laptops, discos, SSD, memorias, servidores, monitores',
    keywords: [
      'laptop', 'computo', 'computadora', 'pc', 'servidor', 'nas', 'synology',
      'disco duro', 'ssd', 'memoria ram', 'memoria sd', 'microsd', 'usb',
      'procesador', 'motherboard', 'tarjeta', 'expansion', 'periferico',
      'monitor', 'pantalla', 'teclado', 'mouse', 'estacion de trabajo',
      'workstation', 'mini pc', 'kiosco', 'scanners', 'impresora',
    ],
  },
  {
    name: 'Energía y UPS',
    slug: 'energia-ups',
    icon: '🔋',
    description: 'Fuentes de alimentación, UPS, inversores, reguladores, PDUs',
    keywords: [
      'ups', 'no break', 'nobreak', 'fuente de alimentacion', 'fuente de poder',
      'regulador', 'pdu', 'inversor', 'bateria', 'cargador', 'energia',
      'planta de energia', 'generador', 'solar', 'panel solar', 'modulo solar',
      'respaldo', 'redundante', 'ats', 'riel din', 'industrial',
    ],
  },
  {
    name: 'Cableado y Conecciones',
    slug: 'cableado-conexiones',
    icon: '🔌',
    description: 'Cables, conectores, terminales, tubería, accesorios de instalación',
    keywords: [
      'cable', 'coaxial', 'conector', 'terminal', 'jack', 'plug', 'sma',
      'bnc', 'rg', 'lmr', 'helix', 'jumper', 'pigtail', 'ducto', 'tuberia',
      'conduit', 'pvc', 'canal', 'charola', 'pasacable', 'fijacion', 'taquete',
      'tornilleria', 'abrazadera', 'amarre', 'marquilla', 'etiqueta',
      'abeto', 'canaleta', 'bandeja',
    ],
  },
  {
    name: 'Audio y Comunicación',
    slug: 'audio-comunicacion',
    icon: '🎙️',
    description: 'Micrófonos, bocinas, radios, interfonos, telefonía IP',
    keywords: [
      'microfono', 'bocina', 'altavoz', 'audio', 'radio', 'comunicacion',
      'interfon', 'intercomunicador', 'telefono ip', 'telefonia', 'voip',
      'gateway', 'ata', 'sip', 'megafonia', 'voceo', 'pa',
      'portatil', 'uhf', 'vhf', 'kenwood', 'icom', 'motorola',
      'diadema', 'audifono', 'antena', 'mastil', 'torre',
    ],
  },
  {
    name: 'Audio y Video Profesional',
    slug: 'audio-video-profesional',
    icon: '📺',
    description: 'Videowall, pantallas profesionales, señalización digital, distribuidores AV',
    keywords: [
      'videowall', 'video wall', 'pantalla profesional', 'led wall', 'display',
      'señalizacion digital', 'digital signage', 'splitter hdmi', 'matrix',
      'distribuidor av', 'extensor hdmi', 'scaler', 'procesador de video',
      'presentacion', 'sala de conferencias', 'auditorio', 'proyector',
      'pantalla de proyeccion', 'videoproyector', 'hdmi', 'displayport',
    ],
  },
  {
    name: 'Herramientas e Instalación',
    slug: 'herramientas-instalacion',
    icon: '🛠️',
    description: 'Herramientas eléctricas, manuales, medición, soldadura',
    keywords: [
      'herramienta', 'soldar', 'desoldar', 'multimetro', 'medicion', 'probador',
      'tester', 'wattmetro', 'osciloscopio', 'generador', 'aislamiento',
      'pelacable', 'crimpea', 'ponchadora', 'prensadora', 'taladro',
      'Destornillador', 'alicate', 'pinza', 'sierra', 'escalera',
      'fundas', 'maletin', 'estuche', 'kit',
    ],
  },
  {
    name: 'Racks y Gabinetes',
    slug: 'racks-gabinetes',
    icon: '🗄️',
    description: 'Racks, gabinetes, accesorios de montaje, parcheo',
    keywords: [
      'rack', 'gabinete', 'charola', 'organizador', 'ventilador', 'ventilacion',
      'brecha', 'cortafuego', 'blindado', 'intemperie', 'antiexplosion',
      'distribuidor', 'crossover', 'patch panel', 'switch', 'poe',
    ],
  },
  {
    name: 'Automatización y Control',
    slug: 'automatizacion-control',
    icon: '⚙️',
    description: 'PLCs, sensores industriales, BMS, termostatos, domótica',
    keywords: [
      'plc', 'automatizacion', 'control', 'bms', 'termostato', 'domotica',
      'lutron', 'persiana', 'cortinero', 'iluminacion', 'dali',
      'variador', 'frecuencia', 'inversor', 'neumatica', 'valvula',
      'actuador', 'hmi', 'supervisory', 'niagara', 'vykon', 'sensor',
      'presion', 'flujo', 'nivel', 'instrumentacion', 'industrial',
    ],
  },
  {
    name: 'Cercas y Perimetral',
    slug: 'cercas-perimetral',
    icon: '🔒',
    description: 'Cercas electrificadas, detección perimetral, puertas',
    keywords: [
      'cerca', 'electrica', 'energizador', 'aislador', 'picos', 'poncha',
      'perimetral', 'puerta de garage', 'puerta corrediza', 'puerta abatible',
      'semaforo', 'senalizacion', 'topes', 'reductor',
    ],
  },
  {
    name: 'Identificación y Punto de Venta',
    slug: 'identificacion-punto-venta',
    icon: '🪪',
    description: 'Impresoras de credenciales, lectores de códigos, kioskos',
    keywords: [
      'impresora', 'laminacion', 'credencial', 'identificacion', 'eas',
      'codigo', 'lector', 'scanner', 'kiosko', 'pantalla interactiva',
      'digital signage', 'publicidad digital',
    ],
  },
  {
    name: 'Energía Solar',
    slug: 'energia-solar',
    icon: '☀️',
    description: 'Paneles solares, inversores, baterías, kits solares',
    keywords: [
      'solar', 'panel solar', 'modulo solar', 'microinversor', 'inversor',
      'hibrido', 'off grid', 'on grid', 'bateria', 'cargador solar',
      'kit solar', 'remolque', 'estacion de energia',
    ],
  },
  {
    name: 'Pólizas y Servicios',
    slug: 'polizas-servicios',
    icon: '📋',
    description: 'Garantías extendidas, licencias, servicios de instalación',
    keywords: [
      'poliza', 'garantia', 'licencia', 'software', 'suscripcion', 'servicio',
      'programacion', 'mantenimiento', 'instalacion',
    ],
  },
  {
    name: 'Back Orders',
    slug: 'back-orders',
    icon: '⏳',
    description: 'Productos bajo pedido — entrega en días hábiles',
    keywords: [
      'back order', 'backorder', 'pedido especial', 'por encargo', 'bajo pedido',
      'disponibilidad especial', 'preventa', 'entrega programada',
    ],
  },
];

export function findDisplayCategory(syscomCategoryName: string): DisplayCategory | undefined {
  const lower = syscomCategoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch: DisplayCategory | undefined;
  let bestScore = 0;

  for (const dc of DISPLAY_CATEGORIES) {
    for (const keyword of dc.keywords) {
      const kw = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes(kw)) {
        const score = kw.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = dc;
        }
      }
    }
  }

  return bestMatch;
}

export function getDisplayCategoriesWithProducts(
  categories: Array<{ id: string; name: string; slug: string; _count?: { products?: number } }>
): Array<DisplayCategory & { productCount: number }> {
  const counts = new Map<string, number>();

  for (const dc of DISPLAY_CATEGORIES) {
    counts.set(dc.slug, 0);
  }

  for (const cat of categories) {
    const dc = findDisplayCategory(cat.name);
    if (!dc) continue;
    const current = counts.get(dc.slug) ?? 0;
    const catCount = (cat._count as Record<string, number> | undefined)?.products ?? 0;
    counts.set(dc.slug, current + catCount);
  }

  return DISPLAY_CATEGORIES.map((dc) => ({
    ...dc,
    productCount: counts.get(dc.slug) ?? 0,
  })).filter((dc) => dc.productCount > 0);
}

export function getDisplayCategorySlugs(displaySlug: string): string[] {
  const dc = DISPLAY_CATEGORIES.find((c) => c.slug === displaySlug);
  return dc ? dc.keywords : [];
}

export function getDisplayCategoryForProduct(
  productCategory: { id: string; name: string; slug: string } | undefined | null
): DisplayCategory | undefined {
  if (!productCategory) return undefined;
  return findDisplayCategory(productCategory.name);
}
