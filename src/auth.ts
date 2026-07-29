// Google ログイン。
//
// 取得した ID トークンはサーバーへ渡し、そちらで署名検証する。
// クライアントで取り出した uid や email はサーバーでは信用されない。

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// ログイン用に開いたブラウザを、認証完了後に自動で閉じる
WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const GOOGLE_READY = !!WEB_CLIENT_ID && !WEB_CLIENT_ID.startsWith('xxxxx');

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/** Google Cloud Console に登録したリダイレクト URI と一致させる */
export function redirectUri() {
  return AuthSession.makeRedirectUri({ scheme: 'manaby' });
}

/**
 * ログインを開始し、Google の ID トークンを返す。
 * クライアントシークレットは配布物に含められないため、PKCE で保護する。
 */
export async function signInWithGoogle(): Promise<string> {
  if (!GOOGLE_READY) {
    throw new Error(
      'Google ログインは未設定です。EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID を設定してください。',
    );
  }

  const request = new AuthSession.AuthRequest({
    clientId: WEB_CLIENT_ID!,
    redirectUri: redirectUri(),
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: 'online' },
  });

  const result = await request.promptAsync(DISCOVERY);

  if (result.type === 'dismiss' || result.type === 'cancel') {
    throw new Error('ログインが中断されました');
  }
  if (result.type !== 'success') {
    const detail = 'params' in result ? result.params?.error_description : undefined;
    throw new Error(detail ?? 'ログインに失敗しました');
  }

  // 認可コードを ID トークンに交換する。公開クライアントなので secret は送らない
  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId: WEB_CLIENT_ID!,
      code: result.params.code,
      redirectUri: redirectUri(),
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    DISCOVERY,
  );

  const idToken = token.idToken;
  if (!idToken) throw new Error('Google から ID トークンを取得できませんでした');
  return idToken;
}
