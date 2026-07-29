import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { ChartIcon, HomeIcon, HomeworkIcon, SearchIcon } from '../../src/components/icons';
import { colors, font, shadow } from '../../src/theme';

type TabIconProps = { color: ColorValue; focused: boolean };

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
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
        headerTintColor: colors.brand,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          headerShown: false,
          tabBarIcon: ({ color }: TabIconProps) => <HomeIcon color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="tutors"
        options={{
          title: '講師を探す',
          tabBarIcon: ({ color }: TabIconProps) => <SearchIcon color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: '宿題',
          tabBarIcon: ({ color }: TabIconProps) => <HomeworkIcon color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: '学習カルテ',
          tabBarIcon: ({ color }: TabIconProps) => <ChartIcon color={color} size={23} />,
        }}
      />
      {/* 詳細画面はタブに出さない */}
      <Tabs.Screen name="tutor/[id]" options={{ href: null, title: '講師プロフィール' }} />
      <Tabs.Screen name="report/[id]" options={{ href: null, title: 'AI分析ノート' }} />
    </Tabs>
  );
}
