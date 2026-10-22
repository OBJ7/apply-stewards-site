import { getRuntimeEnv, getRuntimeCache } from "../shared/runtime-context.mjs";

const chunkSize = 512 * 1024;
const database = () => {
  const db = getRuntimeEnv()?.DB;
  if (!db) throw new Error("Storage binding unavailable");
  return db;
};

// Narrow compatibility adapter for the Blobs methods used by this repository.
// Handles are safe at module scope; bindings and caches resolve per request.
export const getStore = (store) => ({
  async get(key, { type = "text" } = {}) {
    const cacheKey = JSON.stringify([store, key]);
    let row = getRuntimeCache()?.get(cacheKey);
    if (row === undefined) {
      row = await database().prepare("SELECT value FROM objects WHERE store = ? AND key = ?").bind(store, key).first();
    }
    if (!row) return null;
    if (type === "arrayBuffer") {
      const { results } = await database().prepare("SELECT value FROM object_chunks WHERE store = ? AND key = ? ORDER BY part").bind(store, key).all();
      const chunks = results.map(({ value }) => new Uint8Array(value));
      const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return bytes.buffer;
    }
    return type === "json" ? JSON.parse(row.value) : row.value;
  },
  async setJSON(key, value, { metadata = {} } = {}) {
    const serialized = JSON.stringify(value);
    await database().prepare("INSERT INTO objects (store, key, value, metadata) VALUES (?, ?, ?, ?) ON CONFLICT (store, key) DO UPDATE SET value = excluded.value, metadata = excluded.metadata")
      .bind(store, key, serialized, JSON.stringify(metadata)).run();
    getRuntimeCache()?.set(JSON.stringify([store, key]), { value: serialized });
  },
  async set(key, value, { metadata = {} } = {}) {
    const bytes = new Uint8Array(value);
    const db = database();
    const statements = [
      db.prepare("INSERT INTO objects (store, key, value, metadata) VALUES (?, ?, NULL, ?) ON CONFLICT (store, key) DO UPDATE SET value = NULL, metadata = excluded.metadata").bind(store, key, JSON.stringify(metadata)),
      db.prepare("DELETE FROM object_chunks WHERE store = ? AND key = ?").bind(store, key)
    ];
    for (let offset = 0, part = 0; offset < bytes.length; offset += chunkSize, part++) {
      statements.push(db.prepare("INSERT INTO object_chunks (store, key, part, value) VALUES (?, ?, ?, ?)").bind(store, key, part, bytes.slice(offset, offset + chunkSize).buffer));
    }
    await db.batch(statements);
    getRuntimeCache()?.delete(JSON.stringify([store, key]));
  },
  async list({ prefix = "" } = {}) {
    // Prefix range uses the primary-key index. Prefetch avoids N+1 D1 queries
    // (Workers Free permits 50 subrequests per invocation).
    const { results } = await database().prepare("SELECT key, value FROM objects WHERE store = ? AND key >= ? AND key < ? ORDER BY key")
      .bind(store, prefix, `${prefix}\uffff`).all();
    for (const row of results) getRuntimeCache()?.set(JSON.stringify([store, row.key]), { value: row.value });
    return { blobs: results.map(({ key }) => ({ key })) };
  }
});
