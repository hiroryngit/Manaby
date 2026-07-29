import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { colors } from '../../src/theme';

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => (
  <Text style={{ fontSize: 20, color }}>{glyph}</Text>
);

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.faint,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'ホーム', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="tutors" options={{ title: '講師を探す', tabBarIcon: icon('🔍') }} />
      <Tabs.Screen name="homework" options={{ title: '宿題', tabBarIcon: icon('📝') }} />
      <Tabs.Screen name="record" options={{ title: '学習カルテ', tabBarIcon: icon('📊') }} />
      {/* 詳細画面はタブに出さない */}
      <Tabs.Screen name="tutor/[id]" options={{ href: null, title: '講師プロフィール' }} />
      <Tabs.Screen name="report/[id]" options={{ href: null, title: 'AI分析ノート' }} />
    </Tabs>
  );
}
