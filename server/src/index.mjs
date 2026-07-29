// manaby API サーバー
//
// 役割は 2 つ。どちらもクライアントに秘密情報を渡さないために存在する。
//   1. Turso への DB アクセス代行
//      Turso には行レベル権限がないため、トークンをアプリに埋めると
//      誰でも全生徒のデータを読み書きできてしまう。
//   2. OpenRouter への中継
//      API キーをアプリのバンドルに含めないため。

import { createServer } from 'node:http';
import { routes } from './routes.mjs';

const PORT = Number(process.env.PORT ?? 8787);
// Caddy(443) からのみ到達させる。0.0.0.0 で待つと 8787 が直接叩けてしまう
const HOST = process.env.BIND_HOST ?? '127.0.0.1';

const missing = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[fatal] 必須の環境変数が未設定: ${missing.join(', ')}`);
  process.exit(1);
}

// `GET /users/:id/notifications` のようなパターンを正規表現に変換しておく
const table = Object.entries(routes).map(([pattern, handler]) => {
  const [method, path] = pattern.split(' ');
  const names = [];
  const source = path.replace(/:([A-Za-z_]+)/g, (_, name) => {
    names.push(name);
    return '([^/]+)';
  });
  return { method, regexp: new RegExp(`^${source}$`), names, handler };
});

function match(method, pathname) {
  for (const r of table) {
    if (r.method !== method) continue;
    const m = pathname.match(r.regexp);
    if (!m) continue;
    const params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
    return { handler: r.handler, params };
  }
  return null;
}

const server = createServer(async (req, res) => {
  const send = (status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  const url = new URL(req.url, 'http://localhost');
  // HEAD は GET と同じ経路を通す（外形監視ツールが使うため）
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  const route = match(method, url.pathname);
  if (!route) return send(404, { error: 'not found' });

  try {
    let body;
    if (method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      body = raw ? JSON.parse(raw) : undefined;
    }
    const result = await route.handler(body, route.params, url.searchParams);
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end();
    }
    send(200, result ?? { ok: true });
  } catch (e) {
    // 意図しない例外の詳細はクライアントに返さない（情報漏洩を避ける）
    const status = e.status ?? 500;
    console.error(`[error] ${req.method} ${url.pathname}`, e.message, e.detail ?? '');
    send(status, { error: status === 500 ? 'internal error' : e.message });
  }
});

server.listen(PORT, HOST, () => console.log(`[manaby-api] listening on ${HOST}:${PORT}`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
