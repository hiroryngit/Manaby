import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, type User } from '../src/api';
import { useSession } from '../src/session';
import { Badge, Card, ErrorView, Loading, Row } from '../src/components/ui';
import { colors, font, space } from '../src/theme';

const ROLE_LABEL: Record<string, { label: string; tone: 'success' | 'brand' | 'warn' | 'neutral' }> = {
  parent: { label: '保護者', tone: 'success' },
  student: { label: '生徒', tone: 'brand' },
  tutor: { label: '講師', tone: 'warn' },
  admin: { label: '管理者', tone: 'neutral' },
};

export default function Login() {
  const { signIn } = useSession();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api
      .get<User[]>('/users')
      .then(setUsers)
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <View style={s.hero}>
          <Image source={require('../assets/icon.png')} style={s.logo} />
          <Text style={s.title}>manaby</Text>
          <Text style={s.lead}>授業の価値を最大化し、学習の習慣化を支援する</Text>
        </View>

        {/* Google ログインは OAuth クライアント ID 取得後に差し替える。
            それまでは利用者を選んで各ロールの画面を確認できるようにしておく。 */}
        <Card style={s.notice}>
          <Text style={s.noticeText}>
            Google ログインは準備中です。動作確認のため、利用者を選んでお進みください。
          </Text>
        </Card>

        {error && <ErrorView message={error} onRetry={load} />}
        {!users && !error && <Loading />}

        {users?.map((u) => {
          const meta = ROLE_LABEL[u.role] ?? ROLE_LABEL.admin;
          return (
            <Card key={u.id} style={s.userCard} onPress={() => signIn(u)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{u.display_name}</Text>
                  <Text style={s.id}>{u.id}</Text>
                </View>
                <Badge label={meta.label} tone={meta.tone} />
              </Row>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  hero: { alignItems: 'center', paddingVertical: space.xl, gap: space.xs },
  logo: { width: 72, height: 72, borderRadius: 18 },
  title: { ...font.h1, color: colors.text, marginTop: space.sm },
  lead: { ...font.small, color: colors.muted, textAlign: 'center' },
  notice: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  noticeText: { ...font.small, color: colors.brandInk, lineHeight: 20 },
  userCard: {},
  name: { ...font.h3, color: colors.text },
  id: { ...font.tiny, color: colors.faint, marginTop: 2 },
});
