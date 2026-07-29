// Google ID トークンの検証。
//
// クライアントから送られてくる auth_uid を無条件に信じると、
// 他人の uid を送るだけで成りすませてしまう。
// ここで Google の公開鍵による署名検証と aud / iss / exp の確認を行い、
// トークンから取り出した sub を唯一の身元として扱う。

import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;

// 将来ネイティブ版を出したとき、iOS/Android のクライアントIDも許可対象に加える
const AUDIENCES = [CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID]
  .filter(Boolean);

const client = new OAuth2Client();

export const GOOGLE_CONFIGURED = AUDIENCES.length > 0;

/**
 * ID トークンを検証し、確認済みの身元を返す。
 * 検証に失敗したら例外を投げる（呼び出し側は 401 にする）。
 */
export async function verifyIdToken(idToken) {
  if (!GOOGLE_CONFIGURED) {
    throw Object.assign(new Error('サーバー側に Google クライアントIDが未設定です'), { status: 503 });
  }
  if (!idToken || typeof idToken !== 'string') {
    throw Object.assign(new Error('id_token が必要です'), { status: 400 });
  }

  let ticket;
  try {
    // 署名・aud・iss・有効期限をまとめて検証する
    ticket = await client.verifyIdToken({ idToken, audience: AUDIENCES });
  } catch (e) {
    throw Object.assign(new Error('Google の認証情報を確認できませんでした'), {
      status: 401,
      detail: e.message,
    });
  }

  const payload = ticket.getPayload();

  // メール未確認のアカウントは本人性が担保されないため受け付けない
  if (!payload?.email_verified) {
    throw Object.assign(new Error('メールアドレスが確認済みではありません'), { status: 401 });
  }

  return {
    uid: payload.sub,
    email: payload.email,
    displayName: payload.name ?? payload.email?.split('@')[0] ?? '名称未設定',
  };
}
