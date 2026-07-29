import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { ChartIcon, HomeIcon, HomeworkIcon, SearchIcon } from '../../src/components/icons';
import { HAIRLINE, colors, font } from '../../src/theme';

type TabIconProps = { color: ColorValue; focused: boolean };

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        // 保護者・生徒は読む側。選択色は墨にする
        tabBarActiveTintColor: colors.sumi,
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
        headerTintColor: colors.sumi,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          headerShown: false,
          tabBarIcon: ({ color }: TabIconProps) => <HomeIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="tutors"
        options={{
          title: '講師を探す',
          tabBarIcon: ({ color }: TabIconProps) => <SearchIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: '宿題',
          tabBarIcon: ({ color }: TabIconProps) => <HomeworkIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: '学習カルテ',
          tabBarIcon: ({ color }: TabIconProps) => <ChartIcon color={color} size={22} />,
        }}
      />
      {/* 詳細画面はタブに出さない */}
      <Tabs.Screen name="tutor/[id]" options={{ href: null, title: '講師プロフィール' }} />
      <Tabs.Screen name="report/[id]" options={{ href: null, title: 'AI分析ノート' }} />
    </Tabs>
  );
}
