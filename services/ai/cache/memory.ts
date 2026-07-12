interface CacheEntry {
  response: any;
  expiry: number;
}

export class MemoryCache {
  private static cache = new Map<string, CacheEntry>();

  public static get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  public static set(key: string, value: any, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      response: value,
      expiry: Date.now() + ttlMs,
    });
  }

  public static delete(key: string): void {
    this.cache.delete(key);
  }

  public static clear(): void {
    this.cache.clear();
  }
}
export default MemoryCache;
