import type { FastifyInstance } from 'fastify';

/**
 * Servicio de cache centralizado usando Redis.
 *
 * Abstrae todas las operaciones de cache para mantener
 * consistencia en las keys y estrategias de invalidacion.
 */

const DEFAULT_PAGE_TTL = 5 * 60; // 5 minutos
const DEFAULT_PRODUCT_TTL = 10 * 60; // 10 minutos
const DEFAULT_SEARCH_TTL = 2 * 60; // 2 minutos
const DEFAULT_CATEGORY_TTL = 15 * 60; // 15 minutos
const DEFAULT_BRAND_TTL = 30 * 60; // 30 minutos

export class CacheService {
  private redis: FastifyInstance['redis'];

  constructor(fastify: FastifyInstance) {
    this.redis = fastify.redis;
  }

  /**
   * Obtiene un valor del cache. Retorna null si no existe.
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Guarda un valor en Redis con TTL.
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  /**
   * Elimina keys que coincidan con un patron usando SCAN (no KEYS).
   * Retorna el numero de keys eliminadas.
   */
  async invalidate(pattern: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;

    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await this.redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');

    return deleted;
  }

  /**
   * Invalida todas las keys relacionadas a un producto especifico.
   */
  async invalidateProduct(slug: string): Promise<number> {
    let deleted = 0;
    deleted += await this.invalidate(`products:slug:${slug}`);
    deleted += await this.invalidate('products:list:*');
    deleted += await this.invalidate('products:search:*');
    deleted += await this.invalidate(`products:category:*`);
    return deleted;
  }

  /**
   * Invalida todas las keys de productos y categorias.
   */
  async invalidateAllProducts(): Promise<number> {
    let deleted = 0;
    deleted += await this.invalidate('products:*');
    deleted += await this.invalidate('categories:*');
    return deleted;
  }

  /**
   * Genera una key de cache consistente basada en prefijo y parametros.
   */
  generateKey(prefix: string, params: Record<string, unknown>): string {
    // Ordenar keys para consistencia
    const sortedKeys = Object.keys(params).sort();
    const parts = sortedKeys.map((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === '') return '';
      return `${k}:${v}`;
    }).filter(Boolean);

    return `${prefix}:${parts.join(':')}`;
  }

  // ==========================================
  // Helpers con TTLs predefinidos
  // ==========================================

  async getProductList<T>(params: Record<string, unknown>): Promise<T | null> {
    const key = this.generateKey('products:list', params);
    return this.get<T>(key);
  }

  async setProductList<T>(params: Record<string, unknown>, value: T): Promise<void> {
    const key = this.generateKey('products:list', params);
    await this.set(key, value, DEFAULT_PAGE_TTL);
  }

  async getProductDetail<T>(slug: string): Promise<T | null> {
    return this.get<T>(`products:slug:${slug}`);
  }

  async setProductDetail<T>(slug: string, value: T): Promise<void> {
    await this.set(`products:slug:${slug}`, value, DEFAULT_PRODUCT_TTL);
  }

  async getSearch<T>(params: Record<string, unknown>): Promise<T | null> {
    const key = this.generateKey('products:search', params);
    return this.get<T>(key);
  }

  async setSearch<T>(params: Record<string, unknown>, value: T): Promise<void> {
    const key = this.generateKey('products:search', params);
    await this.set(key, value, DEFAULT_SEARCH_TTL);
  }

  async getCategories<T>(): Promise<T | null> {
    return this.get<T>('categories:list');
  }

  async setCategories<T>(value: T): Promise<void> {
    await this.set('categories:list', value, DEFAULT_CATEGORY_TTL);
  }

  async getCategoryDetail<T>(slug: string): Promise<T | null> {
    return this.get<T>(`categories:slug:${slug}`);
  }

  async setCategoryDetail<T>(slug: string, value: T): Promise<void> {
    await this.set(`categories:slug:${slug}`, value, DEFAULT_CATEGORY_TTL);
  }

  async getBrands<T>(): Promise<T | null> {
    return this.get<T>('brands:list');
  }

  async setBrands<T>(value: T): Promise<void> {
    await this.set('brands:list', value, DEFAULT_BRAND_TTL);
  }

  // ==========================================
  // Cart cache helpers
  // ==========================================

  async getCart<T>(userId: string): Promise<T | null> {
    return this.get<T>(`cart:user:${userId}`);
  }

  async setCart<T>(userId: string, value: T): Promise<void> {
    await this.set(`cart:user:${userId}`, value, 5 * 60); // 5 min
  }

  async invalidateCart(userId: string): Promise<void> {
    await this.invalidate(`cart:user:${userId}`);
  }

  async getCartBySession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`cart:session:${sessionId}`);
  }

  async setCartBySession<T>(sessionId: string, value: T): Promise<void> {
    await this.set(`cart:session:${sessionId}`, value, 30 * 60); // 30 min
  }

  async invalidateCartBySession(sessionId: string): Promise<void> {
    await this.invalidate(`cart:session:${sessionId}`);
  }
}
