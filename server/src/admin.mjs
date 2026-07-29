// 管理者権限のアクティベート（F-12）
//
// 役割（parent / student / tutor）は初回登録で固定され、以後変更できない。
// 管理者はその仕組みに割り込まず「属性」として後から付ける ——
// Google でログインした利用者が合言葉を入力し、それが通ったときだけ is_admin が立つ。
//
// 管理 API の認証に Google の ID トークンは使わない。1時間で切れるため
// 画面を開いたままにできないうえ、管理操作のたびに再ログインが要る。
// 代わりにアクティベート時に自前のトークンを発行し、ハッシュだけを DB に置く。

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { one, run } from './db.mjs';
import { verifyIdToken } from './google.mjs';

const PASSWORD = process.env.ADMIN_ACTIVATION_PASSWORD;

/** 管理トークンの有効期間。切れたら合言葉から取り直す */
const SESSION_DAYS = 30;

const bad = (status, message) => Object.assign(new Error(message), { status });

const sha256 = (value) => createHash('sha256').update(value).digest();

/**
 * 合言葉の照合。
 * 長さが違うと timingSafeEqual が例外を投げるため、必ず固定長のダイジェストで比べる。
 * 素朴な `===` は先頭から一致した文字数で応答時間が変わり、1文字ずつ当てられる。
 */
function passwordMatches(input) {
  if (!PASSWORD || typeof input !== 'string' || !input) return false;
  return timingSafeEqual(sha256(input), sha256(PASSWORD));
}

// 総当たり対策。プロセス内に持つだけなのでサーバー再起動で消えるが、
// 攻撃を現実的でない速度まで落とす目的には足りる。
// DB に持たせると「未認証のリクエストが書き込みを起こせる」経路を作ってしまう。
const failures = new Map(); // auth_uid -> { count, lockedUntil }
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function assertNotLocked(uid) {
  const rec = failures.get(uid);
  if (!rec?.lockedUntil) return;
  if (Date.now() < rec.lockedUntil) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    throw bad(429, `試行回数の上限に達しました。${mins}分後にもう一度お試しください。`);
  }
  failures.delete(uid);
}

function recordFailure(uid) {
  const rec = failures.get(uid) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.lockedUntil = Date.now() + LOCK_MS;
  failures.set(uid, rec);
}

/**
 * SQLite の datetime('now') は「2026-07-29 12:00:00」というタイムゾーン無しの UTC を返す。
 * これを素の new Date() に渡すと JS はローカル時刻として読むため、JST では9時間ずれ、
 * 発行直後のトークンが期限切れに見える。ISO 形式なら Z が付いているのでそのまま通す。
 */
function parseUtc(value) {
  return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).getTime();
}

async function issueToken(userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await run('insert into admin_sessions (token_hash, user_id, expires_at) values (?,?,?)', [
    sha256(token).toString('hex'),
    userId,
    expiresAt,
  ]);
  return { token, expiresAt };
}

/**
 * 合言葉で管理者属性を立てる。
 * ここを通れる条件は「Google の ID トークンが検証できる」かつ「合言葉が一致する」の両方。
 */
export async function activate({ id_token, password }) {
  if (!PASSWORD) throw bad(503, 'サーバー側に管理者の合言葉が設定されていません');

  const identity = await verifyIdToken(id_token);
  assertNotLocked(identity.uid);

  const user = await one(
    'select id, display_name, role, is_admin from users where auth_uid = ?',
    [identity.uid],
  );
  // 未登録の Google アカウントには付けない。役割を先に決めさせる
  if (!user) throw bad(404, '先に利用者登録を済ませてください');

  if (!passwordMatches(password)) {
    recordFailure(identity.uid);
    throw bad(401, '合言葉が違います');
  }
  failures.delete(identity.uid);

  await run(
    `update users set is_admin = 1,
       admin_activated_at = coalesce(admin_activated_at, datetime('now')),
       updated_at = datetime('now')
     where id = ?`,
    [user.id],
  );

  const { token, expiresAt } = await issueToken(user.id);
  return {
    user: { id: user.id, display_name: user.display_name, role: user.role, is_admin: true },
    admin_token: token,
    expires_at: expiresAt,
  };
}

/** 管理者権限を自分で降ろす。発行済みトークンもすべて無効にする */
export async function deactivate(headers) {
  const admin = await requireAdmin(headers);
  await run(
    `update users set is_admin = 0, admin_activated_at = null, updated_at = datetime('now')
     where id = ?`,
    [admin.id],
  );
  await run('delete from admin_sessions where user_id = ?', [admin.id]);
  return {
    user: { id: admin.id, display_name: admin.display_name, role: admin.role, is_admin: false },
  };
}

/**
 * 管理 API の入口。`Authorization: Bearer <admin_token>` を検証し、管理者本人を返す。
 * is_admin を降ろされた利用者は、トークンが生きていても通さない。
 */
export async function requireAdmin(headers) {
  const raw = headers?.authorization ?? headers?.Authorization ?? '';
  const token = /^Bearer\s+(.+)$/i.exec(String(raw))?.[1];
  if (!token) throw bad(401, '管理者の認証が必要です');

  const session = await one(
    `select s.user_id, s.expires_at, u.display_name, u.role, u.is_admin
     from admin_sessions s join users u on u.id = s.user_id
     where s.token_hash = ?`,
    [sha256(token).toString('hex')],
  );
  if (!session) throw bad(401, '管理者の認証が必要です');

  if (parseUtc(session.expires_at) < Date.now()) {
    await run('delete from admin_sessions where token_hash = ?', [sha256(token).toString('hex')]);
    throw bad(401, '管理者の認証の有効期限が切れました。合言葉を入力し直してください。');
  }
  if (!session.is_admin) throw bad(403, '管理者権限がありません');

  return { id: session.user_id, display_name: session.display_name, role: session.role };
}
