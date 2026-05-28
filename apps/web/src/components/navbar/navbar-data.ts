export interface PanelSubItem {
  icon: string;
  label: string;
}

export interface PanelItem {
  icon: string;
  label: string;
  tag?: string;
  tagClass?: 'hot' | 'new';
  sub?: PanelSubItem[];
}

export interface PanelColumn {
  head: string;
  items: PanelItem[];
}

export interface PanelData {
  cols: PanelColumn[];
}

export const PANELS: Record<string, PanelData> = {
  inicio: {
    cols: [
      {
        head: 'Inicio',
        items: [
          { icon: 'ti-layout-dashboard', label: 'Dashboard' },
          { icon: 'ti-trending-up', label: 'Más vendidos', tag: 'Popular' },
          { icon: 'ti-star', label: 'Destacados' },
          { icon: 'ti-flame', label: 'Tendencias', tag: 'Hot', tagClass: 'hot' },
        ],
      },
    ],
  },
  categorias: {
    cols: [
      {
        head: 'Categorías',
        items: [
          {
            icon: 'ti-device-mobile',
            label: 'Tecnología',
            sub: [
              { icon: 'ti-phone', label: 'Smartphones' },
              { icon: 'ti-headphones', label: 'Audio' },
              { icon: 'ti-laptop', label: 'Laptops' },
              { icon: 'ti-device-tv', label: 'TV y pantallas' },
              { icon: 'ti-camera', label: 'Fotografía' },
            ],
          },
          {
            icon: 'ti-shirt',
            label: 'Moda y ropa',
            sub: [
              { icon: 'ti-shirt', label: 'Hombre' },
              { icon: 'ti-dress', label: 'Mujer' },
              { icon: 'ti-baby-carriage', label: 'Niños' },
              { icon: 'ti-shoe', label: 'Calzado' },
            ],
          },
          {
            icon: 'ti-home',
            label: 'Hogar y deco',
            sub: [
              { icon: 'ti-sofa', label: 'Muebles' },
              { icon: 'ti-lamp', label: 'Iluminación' },
              { icon: 'ti-tools-kitchen-2', label: 'Cocina' },
              { icon: 'ti-bed', label: 'Dormitorio' },
            ],
          },
          {
            icon: 'ti-barbell',
            label: 'Deporte',
            sub: [
              { icon: 'ti-run', label: 'Running' },
              { icon: 'ti-swimming', label: 'Natación' },
              { icon: 'ti-bike', label: 'Ciclismo' },
              { icon: 'ti-yoga', label: 'Yoga y fitness' },
            ],
          },
          {
            icon: 'ti-leaf',
            label: 'Salud y belleza',
            sub: [
              { icon: 'ti-droplet', label: 'Skincare' },
              { icon: 'ti-heart-rate-monitor', label: 'Suplementos' },
              { icon: 'ti-bottle', label: 'Perfumes' },
            ],
          },
          {
            icon: 'ti-school',
            label: 'Librería y arte',
            sub: [
              { icon: 'ti-book', label: 'Libros' },
              { icon: 'ti-pencil', label: 'Papelería' },
              { icon: 'ti-paint', label: 'Materiales de arte' },
            ],
          },
        ],
      },
    ],
  },
  novedades: {
    cols: [
      {
        head: 'Novedades',
        items: [
          { icon: 'ti-clock', label: 'Últimas 24 h', tag: 'Nuevo', tagClass: 'new' },
          { icon: 'ti-calendar-week', label: 'Esta semana' },
          { icon: 'ti-award', label: 'Lanzamientos' },
          { icon: 'ti-eye', label: 'Pre-ventas' },
        ],
      },
    ],
  },
  ofertas: {
    cols: [
      {
        head: 'Ofertas',
        items: [
          { icon: 'ti-percentage', label: 'Hasta 50% off', tag: 'Hot', tagClass: 'hot' },
          { icon: 'ti-clock-hour-4', label: 'Ofertas del día' },
          { icon: 'ti-gift', label: 'Bundles y packs' },
          { icon: 'ti-coin', label: 'Liquidación' },
          { icon: 'ti-credit-card', label: 'Meses sin intereses' },
        ],
      },
    ],
  },
  pedidos: {
    cols: [
      {
        head: 'Mis pedidos',
        items: [
          { icon: 'ti-truck', label: 'En camino', tag: '2' },
          { icon: 'ti-check', label: 'Entregados' },
          { icon: 'ti-clock', label: 'En proceso' },
          { icon: 'ti-refresh', label: 'Devoluciones' },
          { icon: 'ti-file-invoice', label: 'Facturas' },
        ],
      },
    ],
  },
  favoritos: {
    cols: [
      {
        head: 'Favoritos',
        items: [
          { icon: 'ti-heart', label: 'Mi lista', tag: '12' },
          { icon: 'ti-bell', label: 'Alertas de precio' },
          { icon: 'ti-share', label: 'Compartir lista' },
        ],
      },
    ],
  },
  cuenta: {
    cols: [
      {
        head: 'Mi cuenta',
        items: [
          { icon: 'ti-user', label: 'Perfil' },
          { icon: 'ti-map-pin', label: 'Direcciones' },
          { icon: 'ti-credit-card', label: 'Métodos de pago' },
          { icon: 'ti-lock', label: 'Seguridad' },
          { icon: 'ti-bell', label: 'Notificaciones' },
          { icon: 'ti-logout', label: 'Cerrar sesión' },
        ],
      },
    ],
  },
  ayuda: {
    cols: [
      {
        head: 'Ayuda',
        items: [
          { icon: 'ti-book', label: 'Preguntas frecuentes' },
          { icon: 'ti-truck', label: 'Envíos y entregas' },
          { icon: 'ti-receipt-refund', label: 'Devoluciones' },
          { icon: 'ti-shield-check', label: 'Garantías' },
        ],
      },
    ],
  },
  contacto: {
    cols: [
      {
        head: 'Contacto',
        items: [
          { icon: 'ti-message-dots', label: 'Chat en vivo' },
          { icon: 'ti-mail', label: 'Enviar correo' },
          { icon: 'ti-phone', label: 'Llamar soporte' },
          { icon: 'ti-brand-whatsapp', label: 'WhatsApp' },
        ],
      },
    ],
  },
};

export interface SideNavItem {
  id: string;
  icon: string;
  label: string;
  panelKey?: string;
  href?: string;
}

export const SIDE_NAV_GROUPS: { label?: string; items: SideNavItem[] }[] = [
  {
    label: 'Tienda',
    items: [
      { id: 'inicio', icon: 'ti-home', label: 'Inicio', href: '/' },
      { id: 'cat', icon: 'ti-grid-dots', label: 'Categorías', panelKey: 'categorias' },
      { id: 'new', icon: 'ti-sparkles', label: 'Novedades', panelKey: 'novedades' },
      { id: 'sale', icon: 'ti-tag', label: 'Ofertas', panelKey: 'ofertas' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { id: 'orders', icon: 'ti-package', label: 'Mis pedidos', panelKey: 'pedidos' },
      { id: 'wish', icon: 'ti-heart', label: 'Favoritos', panelKey: 'favoritos' },
      { id: 'account', icon: 'ti-user-circle', label: 'Mi cuenta', panelKey: 'cuenta' },
    ],
  },
  {
    label: 'Soporte',
    items: [
      { id: 'help', icon: 'ti-help-circle', label: 'Ayuda', panelKey: 'ayuda' },
      { id: 'contact', icon: 'ti-message', label: 'Contacto', panelKey: 'contacto' },
    ],
  },
];