CREATE TABLE IF NOT EXISTS objects (
  store TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (store, key)
) WITHOUT ROWID;

-- Chunks retain the existing 2 MiB upload limit without exceeding D1's
-- 2,000,000-byte maximum row size. Batch writes are atomic.
CREATE TABLE IF NOT EXISTS object_chunks (
  store TEXT NOT NULL,
  key TEXT NOT NULL,
  part INTEGER NOT NULL,
  value BLOB NOT NULL,
  PRIMARY KEY (store, key, part)
) WITHOUT ROWID;
