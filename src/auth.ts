// Google ログイン。
//
// ⚠️ 実装は未完了。EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / _IOS_CLIENT_ID が
//    プレースホルダのままのため、実際の OAuth は動かせない。
//    クライアント ID が用意できたら signInWithGoogle() の中身だけを
//    expo-auth-session の実装に差し替える。呼び出し側の変更は不要。

export type GoogleIdentity = {
  /** Firebase Auth の uid。users.auth_uid と突き合わせる */
  uid: string;
  email: string;
  displayName: string;
};

export const GOOGLE_READY =
  !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
  !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.startsWith('xxxxx');

export async function signInWithGoogle(): Promise<GoogleIdentity> {
  if (!GOOGLE_READY) {
    throw new Error(
      'Google ログインは未設定です。EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID を設定してください。',
    );
  }
  // TODO: expo-auth-session で認可コードを取得し、Firebase Auth で
  //       サインインして uid / email / displayName を返す
  throw new Error('未実装');
}
