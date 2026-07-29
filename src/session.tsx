// ログイン状態と、閲覧対象の生徒の解決。
//
// 役割は初回登録時にのみ決まり、以後変更できない（サーバー側で保存され、
// 変更する API を用意していない）。クライアントに役割変更の導線も置かない。

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  api,
  setAdminToken,
  type RegistrationProfile,
  type Role,
  type User,
} from './api';

/** 未登録の Google アカウントについて、サーバーが ID トークンから取り出した素性 */
export type GoogleProfile = { email: string; name: string };

const STORAGE_KEY = 'manaby.session';
const ADMIN_TOKEN_KEY = 'manaby.adminToken';

type SessionValue = {
  user: User | null;
  ready: boolean;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  /** ID トークンで既存アカウントを引く。未登録なら user が null で、Google 側の素性が付く */
  resolveAccount: (idToken: string) => Promise<{ user: User | null; profile?: GoogleProfile }>;
  /** 初回登録。ここで決めた役割は以後変更できない */
  register: (input: {
    idToken: string;
    role: Exclude<Role, 'admin'>;
    profile: RegistrationProfile;
  }) => Promise<User>;
  /** 合言葉で管理者属性を立てる。役割は変わらない */
  activateAdmin: (input: { idToken: string; password: string }) => Promise<User>;
  /** 管理者属性を自分で降ろす */
  deactivateAdmin: () => Promise<void>;
};

const SessionContext = createContext<SessionValue>(null as unknown as SessionValue);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // アプリ再起動後もログイン状態を保つ（F-01 の受け入れ基準）
  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(ADMIN_TOKEN_KEY)])
      .then(([raw, token]) => {
        if (raw) setUser(JSON.parse(raw));
        // 管理トークンは api 側が握る。画面はトークンの存在を意識しない
        setAdminToken(token);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const signIn = async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const signOut = async () => {
    setUser(null);
    setAdminToken(null);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY),
      AsyncStorage.removeItem(ADMIN_TOKEN_KEY),
    ]);
  };

  const resolveAccount: SessionValue['resolveAccount'] = async (idToken) => {
    const res = await api.post<{
      user?: User;
      needs_onboarding?: boolean;
      profile?: GoogleProfile;
    }>('/auth/session', { id_token: idToken });
    return { user: res.user ?? null, profile: res.profile };
  };

  const register: SessionValue['register'] = async ({ idToken, role, profile }) => {
    // メールと本人性はサーバーが ID トークンから取り出す。ここでは送らない
    const res = await api.post<{ user: User }>('/auth/register', {
      id_token: idToken,
      role,
      profile,
    });
    await signIn(res.user);
    return res.user;
  };

  const activateAdmin: SessionValue['activateAdmin'] = async ({ idToken, password }) => {
    const res = await api.post<{ user: User; admin_token: string }>('/auth/admin/activate', {
      id_token: idToken,
      password,
    });
    setAdminToken(res.admin_token);
    await AsyncStorage.setItem(ADMIN_TOKEN_KEY, res.admin_token);
    await signIn(res.user);
    return res.user;
  };

  const deactivateAdmin: SessionValue['deactivateAdmin'] = async () => {
    const res = await api.post<{ user: User }>('/auth/admin/deactivate');
    setAdminToken(null);
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    await signIn(res.user);
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        ready,
        signIn,
        signOut,
        resolveAccount,
        register,
        activateAdmin,
        deactivateAdmin,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

/**
 * その利用者の入口。振り分けを1箇所に集める。
 *
 * 管理者だけで作られたアカウント（role が admin）は、権限を降ろすと行き先が無くなる。
 * 保護者の画面に落とすと「お子さまが…」と噛み合わないので、合言葉の画面に戻す。
 */
export function homeRoute(user: User | null) {
  if (!user) return '/login' as const;
  if (user.role === 'admin') return user.is_admin ? ('/(admin)' as const) : ('/admin-unlock' as const);
  if (user.role === 'tutor') return '/(tutor)' as const;
  return '/(parent)' as const;
}

/**
 * 閲覧対象の生徒 ID。
 * 生徒本人はそのまま自分、保護者は紐づく子の先頭を見る。
 * 子がまだ登録されていない保護者は null になり、画面側で案内を出す。
 */
export function useViewingStudentId(): { studentId: string | null; loading: boolean } {
  const { user } = useSession();
  // 初期値は「解決中」。false から始めると、効果が走る前の1フレームだけ
  // 「お子さまが紐づいていません」が閃く（生徒本人でも出てしまう）
  const [state, setState] = useState<{ studentId: string | null; loading: boolean }>({
    studentId: null,
    loading: true,
  });

  useEffect(() => {
    const done = (studentId: string | null) => setState({ studentId, loading: false });

    if (!user) return done(null);
    if (user.role === 'student') return done(user.id);
    if (user.role !== 'parent') return done(null);

    setState({ studentId: null, loading: true });
    api
      .get<{ id: string }[]>(`/users/${user.id}/children`)
      .then((kids) => done(kids[0]?.id ?? null))
      .catch(() => done(null));
  }, [user]);

  return state;
}
