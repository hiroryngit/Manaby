// ログイン状態と、閲覧対象の生徒の解決。
//
// 役割は初回登録時にのみ決まり、以後変更できない（サーバー側で保存され、
// 変更する API を用意していない）。クライアントに役割変更の導線も置かない。

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type Role, type User } from './api';

const STORAGE_KEY = 'manaby.session';

type SessionValue = {
  user: User | null;
  ready: boolean;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  /** ID トークンで既存アカウントを引く。未登録なら null */
  resolveAccount: (idToken: string) => Promise<User | null>;
  /** 初回登録。ここで決めた役割は以後変更できない */
  register: (input: { idToken: string; role: Exclude<Role, 'admin'> }) => Promise<User>;
};

const SessionContext = createContext<SessionValue>(null as unknown as SessionValue);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // アプリ再起動後もログイン状態を保つ（F-01 の受け入れ基準）
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setUser(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const signIn = async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const resolveAccount = async (idToken: string) => {
    const res = await api.post<{ user?: User; needs_onboarding?: boolean }>('/auth/session', {
      id_token: idToken,
    });
    return res.user ?? null;
  };

  const register: SessionValue['register'] = async ({ idToken, role }) => {
    // 氏名とメールはサーバーが ID トークンから取り出す。ここでは送らない
    const res = await api.post<{ user: User }>('/auth/register', { id_token: idToken, role });
    await signIn(res.user);
    return res.user;
  };

  return (
    <SessionContext.Provider value={{ user, ready, signIn, signOut, resolveAccount, register }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

/**
 * 閲覧対象の生徒 ID。
 * 生徒本人はそのまま自分、保護者は紐づく子の先頭を見る。
 * 子がまだ登録されていない保護者は null になり、画面側で案内を出す。
 */
export function useViewingStudentId(): { studentId: string | null; loading: boolean } {
  const { user } = useSession();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return setStudentId(null);
    if (user.role === 'student') return setStudentId(user.id);
    if (user.role !== 'parent') return setStudentId(null);

    setLoading(true);
    api
      .get<{ id: string }[]>(`/users/${user.id}/children`)
      .then((kids) => setStudentId(kids[0]?.id ?? null))
      .catch(() => setStudentId(null))
      .finally(() => setLoading(false));
  }, [user]);

  return { studentId, loading };
}
