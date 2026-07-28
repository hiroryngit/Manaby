// manaby API サーバー
//
// 役割は 2 つ。どちらもクライアントに秘密情報を渡さないために存在する。
//   1. Turso への DB アクセス代行
//      Turso には行レベル権限がないため、トークンをアプリに埋めると
//      誰でも全生徒のデータを読み書きできてしまう。
//   2. OpenRouter への中継
//      API キーをアプリのバンドルに含めないため。

import { createServer } from 'node:http';
import { createClient } from '@libsql/client';

const PORT = Number(process.env.PORT ?? 8787);
const {
  TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN,
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL = 'google/gemma-4-31b-it:free',
} = process.env;

const missing = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[fatal] 必須の環境変数が未設定: ${missing.join(', ')}`);
  process.exit(1);
}

const db = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });

// --- ルーティング ------------------------------------------------------------

const routes = {
  'GET /health': async () => {
    // DB まで到達できて初めて healthy とみなす。プロセスの生存だけでは不十分
    const r = await db.execute('select sqlite_version() as v');
    return { ok: true, db: 'up', sqlite: r.rows[0].v, model: OPENROUTER_MODEL };
  },

  // AI 分析ノート生成（F-10）。授業記録を受け取り OpenRouter に中継する
  'POST /ai/report': async (body) => {
    if (!OPENROUTER_API_KEY) {
      const err = new Error('OPENROUTER_API_KEY が未設定です');
      err.status = 503;
      throw err;
    }
    if (!body?.lessonRecord) {
      const err = new Error('lessonRecord がリクエストに含まれていません');
      err.status = 400;
      throw err;
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content:
              '家庭教師の授業記録から保護者向けレポートを作成します。' +
              '専門用語を使わず、1分で読み切れる分量で、' +
              '「できたこと」「つまずいた点」「今後の方針」を必ず含めてください。',
          },
          { role: 'user', content: JSON.stringify(body.lessonRecord) },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = new Error(`OpenRouter がエラーを返しました: ${res.status}`);
      err.status = 502;
      err.detail = await res.text().catch(() => '');
      throw err;
    }
    const data = await res.json();
    return { report: data.choices?.[0]?.message?.content ?? '' };
  },
};

// --- HTTP サーバー -----------------------------------------------------------

const server = createServer(async (req, res) => {
  const send = (status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  const handler = routes[`${req.method} ${req.url.split('?')[0]}`];
  if (!handler) return send(404, { error: 'not found' });

  try {
    let body;
    if (req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      body = raw ? JSON.parse(raw) : undefined;
    }
    send(200, await handler(body));
  } catch (e) {
    // 意図しない例外の詳細はクライアントに返さない（情報漏洩を避ける）
    const status = e.status ?? 500;
    console.error(`[error] ${req.method} ${req.url}`, e.message, e.detail ?? '');
    send(status, { error: status === 500 ? 'internal error' : e.message });
  }
});

server.listen(PORT, () => console.log(`[manaby-api] listening on :${PORT}`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
