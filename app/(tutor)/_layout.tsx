import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { colors } from '../../src/theme';

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => (
  <Text style={{ fontSize: 20, color }}>{glyph}</Text>
);

export default function TutorLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tutor,
        tabBarInactiveTintColor: colors.faint,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '担当生徒', tabBarIcon: icon('👥') }} />
      <Tabs.Screen name="lessons" options={{ title: '授業記録', tabBarIcon: icon('✏️') }} />
      <Tabs.Screen name="record/[lessonId]" options={{ href: null, title: '授業記録入力' }} />
      <Tabs.Screen name="homework/[studentId]" options={{ href: null, title: '宿題設定' }} />
      <Tabs.Screen name="report/[id]" options={{ href: null, title: 'AI生成プレビュー' }} />
    </Tabs>
  );
}
