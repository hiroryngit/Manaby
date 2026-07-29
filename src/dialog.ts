// ダイアログ。React Native の Alert は web で表示されないため、両方に分岐させる。
// 画面ごとに notify を書き写していたのをここへ集約する。

import { Alert, Platform } from 'react-native';

export function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(message);
}

/**
 * 取り消せない操作の確認。
 *
 * 「書きかけを捨てる」「保護者に公開する」のように、実行すると元に戻せない操作の前に必ず挟む。
 * 逆に、失うものが無いときは呼ばない — 何も起きない確認は次から読まれなくなる。
 */
export function confirmDestructive({
  title,
  message,
  confirmLabel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'やめる', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      // Android は枠外タップで閉じられる。その場合も「やめる」と同じ扱いにする
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
