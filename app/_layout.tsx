import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../src/session';
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
    // 講師と保護者/生徒で入口が違う
    const home = user.role === 'tutor' ? '/(tutor)' : '/(parent)';
    if (group === 'login' || group === 'onboarding' || group === undefined) {
      router.replace(home);
    }
  }, [user, ready, segments, router]);

  if (!ready) return <Loading label="起動中…" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.brand,
        headerTitleStyle: { ...font.h2, color: colors.ink },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(parent)" options={{ headerShown: false }} />
      <Stack.Screen name="(tutor)" options={{ headerShown: false }} />
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
