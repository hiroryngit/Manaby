import { createClient } from '@libsql/client';

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;

export const db = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

/** 複数行を素の配列で返す */
export async function all(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows.map((row) => ({ ...row }));
}

/** 1行だけ返す。無ければ null */
export async function one(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] ?? null;
}

export async function run(sql, args = []) {
  return db.execute({ sql, args });
}

/** SQLite に配列型がないため JSON 文字列で持っている列を復元する */
export function parseJson(value, fallback = []) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const newId = () => crypto.randomUUID();
