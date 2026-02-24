/**
 * Simple IndexedDB wrapper for offline read queue.
 */

import type { PendingRead } from './entities';

const DB_NAME = 'ImpactATMS';
const DB_VERSION = 1;
const STORE_NAME = 'pendingReads';

class AppDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('localReadId', 'localReadId', { unique: true });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async add(read: PendingRead): Promise<number> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(read);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async getPending(limit = 50): Promise<PendingRead[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('syncStatus');
      const req = index.openCursor(IDBKeyRange.only('pending'));
      const results: PendingRead[] = [];

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async updateByLocalReadId(localReadId: string, updates: Partial<PendingRead>): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('localReadId');
      const req = index.get(localReadId);

      req.onsuccess = () => {
        if (req.result) {
          const updated = { ...req.result, ...updates };
          store.put(updated);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async countPending(): Promise<number> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('syncStatus');
      const req = index.count(IDBKeyRange.only('pending'));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Get all reads from the last N days, newest first */
  async getRecentReads(days: number): Promise<PendingRead[]> {
    const db = await this.open();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      const results: PendingRead[] = [];

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const record = cursor.value as PendingRead;
          if (record.createdAt >= cutoff) {
            results.push(record);
          }
          cursor.continue();
        } else {
          results.sort((a, b) => b.createdAt - a.createdAt);
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Delete reads older than N days */
  async deleteOlderThan(days: number): Promise<number> {
    const db = await this.open();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      let deleted = 0;

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const record = cursor.value as PendingRead;
          if (record.createdAt < cutoff) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export const db = new AppDatabase();
