export interface PanelSubItem {
  icon: string;
  label: string;
  href?: string;
}

export interface PanelItem {
  icon: string;
  label: string;
  tag?: string;
  tagClass?: 'hot' | 'new';
  href?: string;
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
  camaras: {
    cols: [{ head: 'Camaras y Videovigilancia', items: [
      { icon: 'ti-camera', label: 'Camaras IP', href: '/productos?categoria=camaras-videovigilancia&busqueda=ip' },
      { icon: 'ti-device-tv', label: 'DVR / NVR', href: '/productos?categoria=camaras-videovigilancia&busqueda=dvr' },
      { icon: 'ti-circle', label: 'Domo / PTZ', href: '/productos?categoria=camaras-videovigilancia&busqueda=domo' },
      { icon: 'ti-eye', label: 'Todos', href: '/productos?categoria=camaras-videovigilancia' },
    ]}],
  },
  redes: {
    cols: [{ head: 'Redes y Conectividad', items: [
      { icon: 'ti-circle', label: 'Switches', href: '/productos?categoria=redes-conectividad&busqueda=switch' },
      { icon: 'ti-circle', label: 'Access Points', href: '/productos?categoria=redes-conectividad&busqueda=access+point' },
      { icon: 'ti-circle', label: 'Fibra Optica', href: '/productos?categoria=redes-conectividad&busqueda=fibra' },
      { icon: 'ti-eye', label: 'Todos', href: '/productos?categoria=redes-conectividad' },
    ]}],
  },
  acceso: {
    cols: [{ head: 'Control de Acceso', items: [
      { icon: 'ti-circle', label: 'Biometricos', href: '/productos?categoria=control-acceso&busqueda=biometrico' },
      { icon: 'ti-circle', label: 'Torniquetes', href: '/productos?categoria=control-acceso&busqueda=torniquete' },
      { icon: 'ti-circle', label: 'Lectores', href: '/productos?categoria=control-acceso&busqueda=lector' },
      { icon: 'ti-eye', label: 'Todos', href: '/productos?categoria=control-acceso' },
    ]}],
  },
  alarmas: {
    cols: [{ head: 'Alarmas / Intrusion', items: [
      { icon: 'ti-circle', label: 'Paneles de Alarma', href: '/productos?categoria=alarmas-intrusion&busqueda=panel' },
      { icon: 'ti-circle', label: 'Detectores', href: '/productos?categoria=alarmas-intrusion&busqueda=detector' },
      { icon: 'ti-bell', label: 'Sirenas', href: '/productos?categoria=alarmas-intrusion&busqueda=sirena' },
      { icon: 'ti-eye', label: 'Todos', href: '/productos?categoria=alarmas-intrusion' },
    ]}],
  },
  incendio: {
    cols: [{ head: 'Sensores de Incendio', items: [
      { icon: 'ti-flame', label: 'Detectores de Humo', href: '/productos?categoria=sensores-incendio&busqueda=humo' },
      { icon: 'ti-circle', label: 'Detectores de Calor', href: '/productos?categoria=sensores-incendio&busqueda=calor' },
      { icon: 'ti-eye', label: 'Todos', href: '/productos?categoria=sensores-incendio' },
    ]}],
  },
  computo: {
    cols: [{ head: 'Computo y Almacenamiento', items: [
      { icon: 'ti-laptop', label: 'Laptops / PC', href: '/productos?categoria=computo-almacenamiento&busqueda=laptop' },
      { icon: 'ti-circle', label: 'Discos y SSD', href: '/productos?categoria=computo-almacenamiento&busqueda=disco' },
      { icon: 'ti-circle', label: 'Servidores / NAS', href: '/productos?categoria=computo-almacenamiento&busqueda=servidor' },
      { icon: 'ti-eye', label: 'Todos', href: '/productos?categoria=computo-almacenamiento' },
    ]}],
  },
  energia: {
    cols: [{ head: 'Energia y UPS', items: [
      { icon: 'ti-circle', label: 'UPS / No Break', href: '/productos?categoria=energia-ups&busqueda=ups' },
      { icon: 'ti-circle', label: 'Reguladores', href: '/productos?categoria=energia-ups&busqueda=regulador' },
      { icon: 'ti-circle', label: 'Solar', href: '/productos?categoria=energia-ups&busqueda=solar' },
      { icon: 'ti-eye', label: 'Todos', href: '/productos?categoria=energia-ups' },
    ]}],
  },
  audioVideo: {
    cols: [{ head: 'Audio y Video Profesional', items: [
      { icon: 'ti-device-tv', label: 'Videowall', href: '/productos?categoria=audio-video-profesional&busqueda=videowall' },
      { icon: 'ti-circle', label: 'Proyectores', href: '/productos?categoria=audio-video-profesional&busqueda=proyector' },
      { icon: 'ti-eye', label: 'Todos', href: '/productos?categoria=audio-video-profesional' },
    ]}],
  },
  backorders: {
    cols: [{ head: 'Back Orders', items: [
      { icon: 'ti-clock', label: 'Productos bajo pedido', href: '/productos?categoria=back-orders' },
    ]}],
  },
  pedidos: {
    cols: [{ head: 'Mis pedidos', items: [
      { icon: 'ti-truck', label: 'En camino', href: '/perfil/pedidos' },
      { icon: 'ti-check', label: 'Entregados', href: '/perfil/pedidos' },
      { icon: 'ti-clock', label: 'En proceso', href: '/perfil/pedidos' },
      { icon: 'ti-refresh', label: 'Devoluciones', href: '/perfil/pedidos' },
    ]}],
  },
  cuenta: {
    cols: [{ head: 'Mi cuenta', items: [
      { icon: 'ti-user', label: 'Perfil', href: '/perfil' },
      { icon: 'ti-map-pin', label: 'Direcciones', href: '/perfil' },
      { icon: 'ti-credit-card', label: 'Pagos', href: '/perfil' },
      { icon: 'ti-lock', label: 'Seguridad', href: '/perfil' },
      { icon: 'ti-bell', label: 'Notificaciones', href: '/perfil' },
    ]}],
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
    label: 'General',
    items: [
      { id: 'inicio', icon: 'ti-home', label: 'Inicio', href: '/' },
      { id: 'todos', icon: 'ti-grid-dots', label: 'Todos', href: '/productos' },
    ],
  },
  {
    label: 'Seguridad',
    items: [
      { id: 'camaras', icon: 'ti-camera', label: 'Camaras', panelKey: 'camaras' },
      { id: 'acceso', icon: 'ti-lock', label: 'Acceso', panelKey: 'acceso' },
      { id: 'alarmas', icon: 'ti-bell', label: 'Alarmas', panelKey: 'alarmas' },
      { id: 'incendio', icon: 'ti-flame', label: 'Incendio', panelKey: 'incendio' },
    ],
  },
  {
    label: 'IT / Red',
    items: [
      { id: 'redes', icon: 'ti-router', label: 'Redes', panelKey: 'redes' },
      { id: 'computo', icon: 'ti-laptop', label: 'Computo', panelKey: 'computo' },
      { id: 'energia', icon: 'ti-bolt', label: 'Energia', panelKey: 'energia' },
    ],
  },
  {
    label: 'AV / Pedidos',
    items: [
      { id: 'audioVideo', icon: 'ti-device-tv', label: 'Audio/Video', panelKey: 'audioVideo' },
      { id: 'backorders', icon: 'ti-clock', label: 'Back Orders', panelKey: 'backorders' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { id: 'orders', icon: 'ti-package', label: 'Pedidos', panelKey: 'pedidos' },
      { id: 'account', icon: 'ti-user-circle', label: 'Mi cuenta', panelKey: 'cuenta' },
    ],
  },
];
