import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarIcon, StudentsIcon } from '../../src/components/icons';
import { HAIRLINE, colors, font } from '../../src/theme';

type TabIconProps = { color: ColorValue; focused: boolean };

export default function AdminLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // 管理者は書き込む側ではなく捌く側。朱は使わず墨で組む
        tabBarActiveTintColor: colors.sumi,
        tabBarInactiveTintColor: colors.sumiFaint,
        tabBarStyle: {
          backgroundColor: colors.sheet,
          borderTopWidth: HAIRLINE,
          borderTopColor: colors.rule,
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
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
          title: '利用者',
          headerShown: false,
          tabBarIcon: ({ color }: TabIconProps) => <StudentsIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: '予約',
          tabBarIcon: ({ color }: TabIconProps) => <CalendarIcon color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
