import type { FastifyInstance } from 'fastify';

const SYSCOM_BASE_URL = 'https://developers.syscom.mx/api/v1';
const SYSCOM_TOKEN_URL = 'https://developers.syscom.mx/oauth/token';
const TOKEN_CACHE_KEY = 'syscom:access_token';
const TOKEN_EXPIRY_BUFFER_SECONDS = 60;
const RATE_LIMIT_PER_MINUTE = 60;
const THROTTLE_INTERVAL_MS = Math.ceil(60_000 / RATE_LIMIT_PER_MINUTE); // ~1000ms entre requests

export interface SyscomCategory {
  id: string;
  nombre: string;
  nivel: number;
}

export interface SyscomCategoryDetail {
  id: string;
  nombre: string;
  nivel: string;
  origen?: SyscomCategory[];
  /** API OpenAPI usa clave con acento */
  subcategorías?: SyscomCategory[];
  /** Alias sin acento por compatibilidad */
  subcategorias?: SyscomCategory[];
}

export interface SyscomBrand {
  id: string;
  nombre: string;
}

export interface SyscomBrandDetail {
  titulo: string;
  logo: string;
  descripcion?: string;
  categorias?: Array<{
    nombre: string;
    id: string;
    imagen?: string;
    cantidad?: number;
  }>;
}

export interface SyscomProductSearchResult {
  cantidad: number;
  pagina: number;
  paginas: number;
  productos: SyscomProduct[];
}

export interface SyscomProduct {
  producto_id: string | number;
  modelo: string;
  total_existencia: number;
  titulo: string;
  marca: string;
  sat_key?: string;
  img_portada?: string;
  categorias?: Array<{ id: string | number; nombre: string; nivel?: string | number }>;
  marca_logo?: string;
  link?: string;
  iconos?: Record<string, string | undefined>;
  precios?: {
    precio_especial?: string | number;
    precio_descuento?: string | number;
    precio_lista?: string | number;
  };
}

export interface SyscomProductDetail extends SyscomProduct {
  descripcion?: string;
  caracteristicas?: string[];
  imagenes?: Array<{ orden: number; url: string }>;
  recursos?: Array<{ recurso: string; path: string }>;
  existencia?: Record<string, unknown>;
}

export interface SyscomExchangeRate {
  normal: string;
  un_dia: string;
  una_semana: string;
  dos_semanas: string;
  tres_semanas: string;
  un_mes: string;
}

type SyscomTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
};

export class SyscomService {
  private clientId: string;
  private clientSecret: string;
  private redis: FastifyInstance['redis'];
  private lastRequestTime = 0;
  private log: FastifyInstance['log'];

  constructor(app: FastifyInstance) {
    this.clientId = app.config.SYSCOM_CLIENT_ID;
    this.clientSecret = app.config.SYSCOM_CLIENT_SECRET;
    this.redis = app.redis;
    this.log = app.log;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < THROTTLE_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, THROTTLE_INTERVAL_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async getAccessToken(): Promise<string> {
    const cached = await this.redis.get(TOKEN_CACHE_KEY);
    if (cached) {
      return cached;
    }

    this.log.info('Obteniendo nuevo token de acceso SYSCOM...');

    const response = await fetch(SYSCOM_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}&grant_type=client_credentials`,
    });

    if (!response.ok) {
      const text = await response.text();
      this.log.error({ status: response.status, body: text }, 'Error obteniendo token SYSCOM');
      throw new Error(`SYSCOM token request failed: ${response.status}`);
    }

    const data = (await response.json()) as SyscomTokenResponse;
    const ttl = Math.max(
      TOKEN_EXPIRY_BUFFER_SECONDS,
      data.expires_in - TOKEN_EXPIRY_BUFFER_SECONDS
    );
    await this.redis.setex(TOKEN_CACHE_KEY, ttl, data.access_token);

    return data.access_token;
  }

  private async request<T>(
    path: string,
    params?: Record<string, string | number>,
    retried = false
  ): Promise<T> {
    await this.throttle();

    const token = await this.getAccessToken();
    const url = new URL(`${SYSCOM_BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        url.searchParams.set(key, String(val));
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401 && !retried) {
      await this.redis.del(TOKEN_CACHE_KEY);
      return this.request(path, params, true);
    }

    if (response.status === 429) {
      this.log.warn('Rate limit SYSCOM alcanzado, reintentando en 60s...');
      await new Promise((resolve) => setTimeout(resolve, 60_000));
      return this.request(path, params, retried);
    }

    if (!response.ok) {
      const text = await response.text();
      this.log.error({ status: response.status, path, body: text }, 'Error en request SYSCOM');
      throw new Error(`SYSCOM API error: ${response.status} - ${path}`);
    }

    return response.json() as Promise<T>;
  }

  async getCategories(): Promise<SyscomCategory[]> {
    return this.request<SyscomCategory[]>('/categorias');
  }

  async getCategoryById(id: string | number): Promise<SyscomCategoryDetail> {
    return this.request<SyscomCategoryDetail>(`/categorias/${id}`);
  }

  async getBrands(): Promise<SyscomBrand[]> {
    return this.request<SyscomBrand[]>('/marcas');
  }

  async getBrandById(id: string | number): Promise<SyscomBrandDetail> {
    return this.request<SyscomBrandDetail>(`/marcas/${id}`);
  }

  async getBrandProducts(
    brandId: string | number,
    params?: { categoria?: string; stock?: boolean; agrupar?: boolean; pagina?: number }
  ): Promise<SyscomProductSearchResult> {
    const queryParams: Record<string, string | number> = {};
    if (params?.categoria) queryParams.categoria = params.categoria;
    if (params?.stock !== undefined) queryParams.stock = params.stock ? '1' : '0';
    if (params?.agrupar !== undefined) queryParams.agrupar = params.agrupar ? '1' : '0';
    if (params?.pagina) queryParams.pagina = params.pagina;
    return this.request<SyscomProductSearchResult>(`/marcas/${brandId}/productos`, queryParams);
  }

  async getProducts(params: {
    categoria?: string;
    marca?: string;
    busqueda?: string;
    orden?: string;
    stock?: boolean;
    agrupar?: boolean;
    pagina?: number;
  }): Promise<SyscomProductSearchResult> {
    const queryParams: Record<string, string | number> = {};
    if (params.categoria) queryParams.categoria = params.categoria;
    if (params.marca) queryParams.marca = params.marca;
    if (params.busqueda) queryParams.busqueda = params.busqueda;
    if (params.orden) queryParams.orden = params.orden;
    if (params.stock !== undefined) queryParams.stock = params.stock ? '1' : '0';
    if (params.agrupar !== undefined) queryParams.agrupar = params.agrupar ? '1' : '0';
    if (params.pagina) queryParams.pagina = params.pagina;
    return this.request<SyscomProductSearchResult>('/productos', queryParams);
  }

  async getProductById(id: string | number): Promise<SyscomProductDetail> {
    return this.request<SyscomProductDetail>(`/productos/${id}`);
  }

  async getRelatedProducts(id: string | number): Promise<SyscomProduct[]> {
    return this.request<SyscomProduct[]>(`/productos/${id}/relacionados`);
  }

  async getAccessoryProducts(id: string | number): Promise<SyscomProduct[]> {
    return this.request<SyscomProduct[]>(`/productos/${id}/accesorios`);
  }

  async getExchangeRate(): Promise<SyscomExchangeRate> {
    return this.request<SyscomExchangeRate>('/tipocambio');
  }

  async getProductStockAndPrice(productId: string | number): Promise<{
    stock: number;
    precioLista: number;
    precioEspecial: number;
    precioDescuento: number;
  }> {
    const detail = await this.getProductById(productId);
    const precios = detail.precios || {};
    return {
      stock: detail.total_existencia ?? 0,
      precioLista: Number(precios.precio_lista ?? 0),
      precioEspecial: Number(precios.precio_especial ?? 0),
      precioDescuento: Number(precios.precio_descuento ?? 0),
    };
  }
}