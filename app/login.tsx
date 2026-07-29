import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, type User } from '../src/api';
import { GOOGLE_READY, signInWithGoogle } from '../src/auth';
import { useSession } from '../src/session';
import { Badge, Button, Card, Row, type Tone } from '../src/components/ui';
import { colors, font, radius, space } from '../src/theme';

// 講師は書き込む側なので朱。読む側は藍
const ROLE_LABEL: Record<string, { label: string; tone: Tone }> = {
  parent: { label: '保護者', tone: 'ao' },
  student: { label: '生徒', tone: 'ao' },
  tutor: { label: '講師', tone: 'shu' },
  admin: { label: '管理者', tone: 'neutral' },
};

export default function Login() {
  const router = useRouter();
  const { signIn, resolveAccount } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devUsers, setDevUsers] = useState<User[] | null>(null);

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      const idToken = await signInWithGoogle();
      const existing = await resolveAccount(idToken);
      if (existing) {
        // 2回目以降。役割は登録時のものが使われ、選び直しは発生しない
        await signIn(existing);
        router.replace(existing.role === 'tutor' ? '/(tutor)' : '/(parent)');
      } else {
        router.replace({ pathname: '/onboarding', params: { idToken } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const loadDevUsers = async () => {
    setError(null);
    try {
      setDevUsers(await api.get<User[]>('/users'));
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得に失敗しました');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <View style={s.hero}>
          <Image source={require('../assets/icon.png')} style={s.logo} />
          <Text style={s.title}>manaby</Text>
          <Text style={s.lead}>授業で起きたことを、残す。</Text>
        </View>

        <Button title="Google でログイン" onPress={google} loading={busy} disabled={!GOOGLE_READY} />

        {!GOOGLE_READY && (
          <Text style={s.notice}>
            Google ログインは設定待ちです（OAuth クライアント ID が未登録）。
            動作確認用に、登録済みの利用者でログインできます。
          </Text>
        )}

        {error && <Text style={s.error}>{error}</Text>}

        {/* 開発用の入口。役割はサーバーに保存済みのものが使われ、ここでも選び直しはできない */}
        {!GOOGLE_READY &&
          (devUsers ? (
            devUsers.map((u) => {
              const meta = ROLE_LABEL[u.role] ?? ROLE_LABEL.admin;
              return (
                <Card
                  key={u.id}
                  onPress={async () => {
                    await signIn(u);
                    router.replace(u.role === 'tutor' ? '/(tutor)' : '/(parent)');
                  }}
                >
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={s.name}>{u.display_name}</Text>
                    <Badge label={meta.label} tone={meta.tone} />
                  </Row>
                </Card>
              );
            })
          ) : (
            <Button title="登録済みの利用者を表示" variant="ghost" onPress={loadDevUsers} />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.huge },
  hero: { alignItems: 'center', paddingTop: space.huge, paddingBottom: space.xxl, gap: space.xs },
  logo: { width: 64, height: 64, borderRadius: radius.lg },
  // ロゴタイプは明朝。書名のように置く
  title: { ...font.display, color: colors.sumi, marginTop: space.md },
  lead: { ...font.small, color: colors.sumiMid, textAlign: 'center' },
  notice: { ...font.small, color: colors.sumiMid, marginTop: space.md },
  name: { ...font.h3, color: colors.sumi },
  error: { ...font.small, color: colors.shu },
});
