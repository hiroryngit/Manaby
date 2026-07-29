import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { PencilIcon, StudentsIcon } from '../../src/components/icons';
import { colors, font, shadow } from '../../src/theme';

type TabIconProps = { color: ColorValue; focused: boolean };

export default function TutorLayout() {
  return (
    <Tabs
      screenOptions={{
        // 講師画面は保護者画面と色を変え、どちら側にいるか一目で分かるようにする
        tabBarActiveTintColor: colors.tutor,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
          ...shadow.bar,
        },
        tabBarLabelStyle: { ...font.caption, textTransform: 'none' },
        headerStyle: { backgroundColor: colors.surface, shadowColor: 'transparent' },
        headerTitleStyle: { ...font.h2, color: colors.ink },
        headerTintColor: colors.tutor,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '担当生徒',
          headerShown: false,
          tabBarIcon: ({ color }: TabIconProps) => <StudentsIcon color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: '授業記録',
          tabBarIcon: ({ color }: TabIconProps) => <PencilIcon color={color} size={23} />,
        }}
      />
      <Tabs.Screen name="record/[lessonId]" options={{ href: null, title: '授業記録入力' }} />
      <Tabs.Screen name="homework/[studentId]" options={{ href: null, title: '宿題設定' }} />
      <Tabs.Screen name="report/[id]" options={{ href: null, title: 'AI生成プレビュー' }} />
    </Tabs>
  );
}
