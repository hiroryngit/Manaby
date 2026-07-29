-- 管理者属性の追加（F-12）
--
-- 適用: turso db shell manaby < server/db/migrations/002_admin.sql
--
-- SQLite の ALTER TABLE ... ADD COLUMN に IF NOT EXISTS は無いため、
-- 適用済みの環境では "duplicate column name" で止まる。その場合は既に当たっている。

ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN admin_activated_at TEXT;

-- seed の管理者アカウントは最初から管理者として扱う
UPDATE users SET is_admin = 1 WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
