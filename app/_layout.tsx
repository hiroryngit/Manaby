import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../src/session';
import { Loading } from '../src/components/ui';
import { colors } from '../src/theme';

/** ロールに応じた画面群へ振り分ける（F-01） */
function Guard() {
  const { user, ready } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];

    if (!user) {
      if (group !== 'login') router.replace('/login');
      return;
    }
    // 講師と保護者/生徒で入口が違う
    const home = user.role === 'tutor' ? '/(tutor)' : '/(parent)';
    if (group === 'login' || group === undefined) router.replace(home);
  }, [user, ready, segments, router]);

  if (!ready) return <Loading label="起動中…" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
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
