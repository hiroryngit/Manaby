import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { PencilIcon, StudentsIcon } from '../../src/components/icons';
import { HAIRLINE, colors, font } from '../../src/theme';

type TabIconProps = { color: ColorValue; focused: boolean };

export default function TutorLayout() {
  return (
    <Tabs
      screenOptions={{
        // 講師は書き込む側。選択色を朱にして、どちら側にいるかを色で示す
        tabBarActiveTintColor: colors.shu,
        tabBarInactiveTintColor: colors.sumiFaint,
        tabBarStyle: {
          backgroundColor: colors.sheet,
          borderTopWidth: HAIRLINE,
          borderTopColor: colors.rule,
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: font.tab,
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTitleStyle: { ...font.h2, color: colors.sumi },
        headerTintColor: colors.shu,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '担当生徒',
          headerShown: false,
          tabBarIcon: ({ color }: TabIconProps) => <StudentsIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: '授業記録',
          tabBarIcon: ({ color }: TabIconProps) => <PencilIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="record/[lessonId]" options={{ href: null, title: '授業記録を書く' }} />
      <Tabs.Screen name="homework/[studentId]" options={{ href: null, title: '宿題設定' }} />
      <Tabs.Screen name="report/[id]" options={{ href: null, title: 'AIの下書き' }} />
    </Tabs>
  );
}
