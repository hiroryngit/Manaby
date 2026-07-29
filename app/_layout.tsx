import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, homeRoute, useSession } from '../src/session';
import { Loading } from '../src/components/ui';
import { colors, font } from '../src/theme';

// Google 認証は済んだが役割が未登録の状態で通る画面。
// この間はまだ user が無いので、未ログイン扱いで弾いてはいけない。
const PUBLIC_GROUPS = ['login', 'onboarding'];

/** ロールに応じた画面群へ振り分ける（F-01） */
function Guard() {
  const { user, ready } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];

    if (!user) {
      // 初回登録の途中で login に戻すと、役割を選べないまま堂々巡りになる
      if (!PUBLIC_GROUPS.includes(group)) router.replace('/login');
      return;
    }

    // 入口はロールで違う。管理者は「役割」ではなく属性なので、
    // 管理画面に着地させるのは合言葉だけで作られたアカウント（role が admin）のみ。
    // 保護者や講師が兼任している場合は普段の画面のままにする。
    const home = homeRoute(user);
    if (group === 'login' || group === 'onboarding' || group === undefined) {
      router.replace(home);
      return;
    }
    // 権限を失った状態で管理画面に残らせない
    if (group === '(admin)' && !user.is_admin) router.replace(home);
  }, [user, ready, segments, router]);

  if (!ready) return <Loading label="起動中…" />;

  return (
    <Stack
      screenOptions={{
        // ヘッダーは紙と同じ地色にして段差を作らない。区切りは罫に任せる
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTintColor: colors.sumi,
        headerTitleStyle: { ...font.h2, color: colors.sumi },
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="admin-unlock" options={{ title: '管理者認証' }} />
      <Stack.Screen name="(parent)" options={{ headerShown: false }} />
      <Stack.Screen name="(tutor)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Guard />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
