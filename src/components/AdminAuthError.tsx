// 管理 API が認証で弾いたときの出口。
//
// 「再読み込み」では絶対に直らない失敗なので、再読み込みボタンを出してはいけない。
// 合言葉の画面へ戻すのが唯一の回復手段になる。

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui';
import { colors, font, space } from '../theme';

/** 401 / 403 のときだけ true。それ以外は通常のエラー表示に任せる */
export const isAuthFailure = (status: number | null) => status === 401 || status === 403;

export function AdminAuthError({ message }: { message: string }) {
  const router = useRouter();
  return (
    <View style={s.wrap}>
      <Text style={s.message}>{message}</Text>
      <Text style={s.hint}>合言葉を入力し直すと、管理画面に戻れます。</Text>
      <View style={{ marginTop: space.lg, minWidth: 200 }}>
        <Button title="合言葉を入力する" onPress={() => router.replace('/admin-unlock')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingVertical: space.huge,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { ...font.body, color: colors.shu, textAlign: 'center' },
  hint: { ...font.small, color: colors.sumiMid, textAlign: 'center', marginTop: space.sm },
});
