// ログイン状態。
//
// 本来は Firebase Auth の Google ログインで得た uid を users.auth_uid と
// 突き合わせる想定（README 第9章）。まだ Google の OAuth クライアント ID が
// 未取得のため、当面は利用者を一覧から選ぶ方式にしている。
// signIn() の中身を Firebase の呼び出しに差し替えれば他の画面は変更不要。

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from './api';

const STORAGE_KEY = 'manaby.session';

type SessionValue = {
  user: User | null;
  ready: boolean;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue>({
  user: null,
  ready: false,
  signIn: async () => {},
  signOut: async () => {},
});

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

  return (
    <SessionContext.Provider value={{ user, ready, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

/**
 * 保護者は自分の子（生徒）のデータを見る。生徒は自分自身。
 * MVP では保護者1人に生徒1人を紐づけたデモデータのため固定で解決している。
 */
export function useViewingStudentId(): string | null {
  const { user } = useSession();
  if (!user) return null;
  if (user.role === 'student') return user.id;
  if (user.role === 'parent') return 'u-student-1';
  return null;
}
