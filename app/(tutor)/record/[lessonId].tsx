// ⑧ 授業記録入力画面（F-08）
//
// MVP の生命線。入力完了までの中央値 5 分以内が受け入れ基準なので、
// 自由入力は最小限にし、選択・タップで済む項目を優先する。
//
// 見た目は記入用紙に寄せる。1行の入力は箱ではなく罫、見出しは見出し罫。
// 講師は書き込む側なので、確定操作は朱にする。

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/api';
import { Button, Chip, Input, Row, SectionTitle, Stars } from '../../../src/components/ui';
import { colors, font, levelColor, space } from '../../../src/theme';

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

function LevelField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <>
      <SectionTitle>{label}</SectionTitle>
      <Row style={{ justifyContent: 'space-between' }}>
        <Stars value={value} size={30} onChange={onChange} />
        <Text style={[s.levelText, { color: levelColor(value) }]}>{value}／5</Text>
      </Row>
    </>
  );
}

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
        <Input value={unit} onChangeText={setUnit} placeholder="例: 割合" />

        <SectionTitle>今日の学習内容</SectionTitle>
        <Input
          value={content}
          onChangeText={setContent}
          placeholder="例: 百分率と歩合の変換、割合の3用法"
          multiline
        />

        <LevelField label="理解度" value={understanding} onChange={setUnderstanding} />
        <LevelField label="集中度" value={concentration} onChange={setConcentration} />

        <SectionTitle>つまずいた点（任意・複数選択可）</SectionTitle>
        <Row style={{ gap: space.xs, flexWrap: 'wrap' }}>
          {WEAK_SUGGESTIONS.map((w) => (
            <Chip
              key={w}
              label={w}
              active={weakUnits.includes(w)}
              onPress={() => toggleWeak(w)}
              tone="shu"
            />
          ))}
        </Row>

        <SectionTitle>コメント（任意）</SectionTitle>
        <Input
          value={comment}
          onChangeText={setComment}
          placeholder="例: 公式は覚えているが文章題で立式に迷う"
          multiline
        />

        {error && <Text style={s.error}>{error}</Text>}

        <View style={{ marginTop: space.xl }}>
          <Button
            title={saving ? 'AIが下書きしています…' : '送信してAIに下書きさせる'}
            onPress={submit}
            loading={saving}
            variant="mark"
            size="lg"
          />
          <Text style={s.hint}>
            送信すると保護者向けレポート・生徒へのコメント・指導方針が下書きされます。
            次の画面で確認・修正してから確定できます。
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },
  levelText: font.numLg,
  error: { ...font.small, color: colors.shu, marginTop: space.lg },
  hint: { ...font.small, color: colors.sumiFaint, marginTop: space.md },
});
