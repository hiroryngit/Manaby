// ⑧ 授業記録入力画面（F-08）
//
// MVP の生命線。入力完了までの中央値 5 分以内が受け入れ基準なので、
// 自由入力は最小限にし、選択・タップで済む項目を優先する。

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/api';
import { Badge, Button, Card, Row, SectionTitle, Stars } from '../../../src/components/ui';
import { colors, font, radius, space } from '../../../src/theme';

const SUBJECTS = ['算数', '数学', '国語', '英語', '理科', '社会'];

// よく使う苦手単元の候補。自由入力の手間を減らすため
const WEAK_SUGGESTIONS = [
  '計算ミス',
  '文章題の立式',
  '図形の把握',
  '記述の説明',
  '語彙',
  '文法',
  '読解',
];

export default function LessonRecordInput() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();

  const [subject, setSubject] = useState('算数');
  const [unit, setUnit] = useState('');
  const [content, setContent] = useState('');
  const [understanding, setUnderstanding] = useState(3);
  const [concentration, setConcentration] = useState(3);
  const [weakUnits, setWeakUnits] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWeak = (w: string) =>
    setWeakUnits((cur) => (cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w]));

  const submit = async () => {
    if (!unit.trim() || !content.trim()) {
      setError('単元と学習内容を入力してください');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<{ report_id: string; ai_error?: string }>('/lesson-records', {
        lesson_id: lessonId,
        subject,
        unit: unit.trim(),
        content: content.trim(),
        understanding_level: understanding,
        concentration_level: concentration,
        weak_units: weakUnits,
        tutor_comment: comment.trim() || null,
      });
      router.replace(`/(tutor)/report/${res.report_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <SectionTitle>教科</SectionTitle>
        <Row style={{ gap: space.xs, flexWrap: 'wrap' }}>
          {SUBJECTS.map((sub) => (
            <Chip key={sub} label={sub} active={subject === sub} onPress={() => setSubject(sub)} />
          ))}
        </Row>

        <SectionTitle>単元</SectionTitle>
        <TextInput
          style={s.input}
          value={unit}
          onChangeText={setUnit}
          placeholder="例: 割合"
          placeholderTextColor={colors.faint}
        />

        <SectionTitle>今日の学習内容</SectionTitle>
        <TextInput
          style={[s.input, s.multiline]}
          value={content}
          onChangeText={setContent}
          placeholder="例: 百分率と歩合の変換、割合の3用法"
          placeholderTextColor={colors.faint}
          multiline
        />

        <SectionTitle>理解度</SectionTitle>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Stars value={understanding} size={32} onChange={setUnderstanding} />
            <Text style={s.levelText}>{understanding} / 5</Text>
          </Row>
        </Card>

        <SectionTitle>集中度</SectionTitle>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Stars value={concentration} size={32} onChange={setConcentration} />
            <Text style={s.levelText}>{concentration} / 5</Text>
          </Row>
        </Card>

        <SectionTitle>苦手単元（任意・複数選択可）</SectionTitle>
        <Row style={{ gap: space.xs, flexWrap: 'wrap' }}>
          {WEAK_SUGGESTIONS.map((w) => (
            <Chip key={w} label={w} active={weakUnits.includes(w)} onPress={() => toggleWeak(w)} tone="danger" />
          ))}
        </Row>

        <SectionTitle>コメント（任意）</SectionTitle>
        <TextInput
          style={[s.input, s.multiline]}
          value={comment}
          onChangeText={setComment}
          placeholder="例: 公式は覚えているが文章題で立式に迷う"
          placeholderTextColor={colors.faint}
          multiline
        />

        {error && <Text style={s.error}>{error}</Text>}

        <View style={{ marginTop: space.lg }}>
          <Button
            title={saving ? 'AIが生成中…' : '送信してAIレポートを作成'}
            onPress={submit}
            loading={saving}
          />
          <Text style={s.hint}>
            送信すると保護者向けレポート・生徒向けコメント・指導方針が自動生成されます。
            内容は次の画面で確認・修正できます。
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({
  label,
  active,
  onPress,
  tone = 'brand',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: 'brand' | 'danger';
}) {
  const activeBg = tone === 'danger' ? '#FEE2E2' : colors.brandSoft;
  const activeFg = tone === 'danger' ? '#991B1B' : colors.brandInk;
  return (
    <Text
      onPress={onPress}
      style={[
        s.chip,
        active
          ? { backgroundColor: activeBg, color: activeFg, borderColor: activeBg }
          : { backgroundColor: colors.surface, color: colors.muted, borderColor: colors.border },
      ]}
    >
      {label}
    </Text>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.xxl },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 48,
    ...font.body,
    color: colors.text,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
    ...font.small,
  },
  levelText: { ...font.h2, color: colors.text },
  error: { ...font.small, color: colors.danger, marginTop: space.md },
  hint: { ...font.tiny, color: colors.muted, marginTop: space.sm, lineHeight: 16, textAlign: 'center' },
});
