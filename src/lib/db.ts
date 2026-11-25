import Dexie, { type Table } from 'dexie';
import type { UserText } from '@/types';

export interface KV {
  key: string;
  value: unknown;
}
export interface AICacheRow {
  key: string;
  text: string;
  provider: string;
  ts: number;
}

/** IndexedDB: прогресс (kv['progress']), кэш ответов ИИ, пользовательские тексты для читалки. */
class MishaDB extends Dexie {
  kv!: Table<KV, string>;
  aiCache!: Table<AICacheRow, string>;
  texts!: Table<UserText, string>;
  constructor() {
    super('misha-react');
    this.version(1).stores({ kv: 'key', aiCache: 'key, ts', texts: 'id' });
  }
}
export const db = new MishaDB();

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await db.kv.get(key))?.value as T | undefined;
  } catch (e) {
    console.warn('[db] kvGet', e);
    return undefined;
  }
}
export async function kvSet(key: string, value: unknown): Promise<boolean> {
  try {
    await db.kv.put({ key, value });
    return true;
  } catch (e) {
    console.warn('[db] kvSet', e);
    return false;
  }
}

/** Удаляет самые старые записи кэша ИИ, если их больше limit. */
export async function trimAICache(limit = 1500) {
  try {
    const n = await db.aiCache.count();
    if (n > limit) {
      const old = await db.aiCache.orderBy('ts').limit(n - limit).primaryKeys();
      await db.aiCache.bulkDelete(old);
    }
  } catch {
    /* не критично */
  }
}
