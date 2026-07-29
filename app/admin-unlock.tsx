// 管理者の合言葉入力（F-12）
//
// 役割（保護者 / 生徒 / 講師）は初回登録で固定され変更できない。
// 管理者はそこに割り込まず、合言葉で立てる別の属性として付ける。
//
// 見た目は他の記入用紙と同じ。管理者は「書き込む側」ではないので朱は使わず、
// 墨で組む（朱は講師と AI の書き込みだけの印）。

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GOOGLE_READY, signInWithGoogle } from '../src/auth';
import { useSession } from '../src/session';
import { Button, Card, ScreenHeader, SectionTitle } from '../src/components/ui';
import { colors, font, space } from '../src/theme';

export default function AdminUnlock() {
  const router = useRouter();
  const { user, activateAdmin, deactivateAdmin } = useSession();

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'activate' | 'deactivate' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlock = async () => {
    if (!password.trim()) return setError('合言葉を入力してください');
    setBusy('activate');
    setError(null);
    try {
      // 権限を付けるのは本人確認が取れたときだけ。もう一度 Google に問い合わせて
      // 新しい ID トークンを取り、サーバー側で署名を検証させる
      const idToken = await signInWithGoogle();
      await activateAdmin({ idToken, password: password.trim() });
      setPassword('');
      router.replace('/(admin)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '認証に失敗しました');
    } finally {
      setBusy(null);
    }
  };

  const revoke = async () => {
    setBusy('deactivate');
    setError(null);
    try {
      await deactivateAdmin();
      router.replace(user?.role === 'tutor' ? '/(tutor)' : '/(parent)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '解除に失敗しました');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="管理者として認証する"
          subtitle="合言葉を知っている人だけが管理画面に入れます。"
        />

        {user?.is_admin ? (
          <Card style={{ marginTop: space.lg }}>
            <Text style={s.state}>
              {user.display_name} さんは現在、管理者として認証されています。
            </Text>
            <View style={{ gap: space.sm, marginTop: space.lg }}>
              <Button title="管理画面をひらく" onPress={() => router.replace('/(admin)')} />
              <Button
                title="管理者権限を解除する"
                variant="ghost"
                loading={busy === 'deactivate'}
                onPress={revoke}
              />
            </View>
            {error && <Text style={s.error}>{error}</Text>}
          </Card>
        ) : (
          <>
            <SectionTitle>合言葉</SectionTitle>
            {/* パスワード欄は共通の Input を使わない。secureTextEntry と
                自動補完の抑止が要るため、ここだけ直に組む */}
            <TextInput
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              placeholder="サーバーに設定された合言葉"
              placeholderTextColor={colors.sumiFaint}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              style={s.field}
              onSubmitEditing={unlock}
            />

            <Text style={s.note}>
              認証すると、この Google アカウントに管理者属性が付きます。
              役割（{roleLabel(user)}）は変わりません。
            </Text>

            {error && <Text style={s.error}>{error}</Text>}

            <View style={{ marginTop: space.xl }}>
              <Button
                title="認証する"
                onPress={unlock}
                loading={busy === 'activate'}
                disabled={!GOOGLE_READY}
              />
              {!GOOGLE_READY && (
                <Text style={s.note}>Google ログインが未設定のため認証できません。</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function roleLabel(user: { role: string } | null) {
  return { parent: '保護者', student: '生徒', tutor: '講師', admin: '管理者' }[user?.role ?? ''] ?? '未登録';
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },
  // 1行の入力は箱ではなく下の罫（記入用紙の書き方に合わせる）
  field: {
    ...font.body,
    color: colors.sumi,
    minHeight: 48,
    paddingVertical: space.sm,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleDeep,
  },
  state: { ...font.body, color: colors.sumi },
  note: { ...font.small, color: colors.sumiMid, marginTop: space.md },
  error: { ...font.small, color: colors.shu, marginTop: space.md },
});
