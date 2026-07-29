// タブと画面で使う線画アイコン。
// 絵文字はプラットフォームごとに字形が変わり、色も揃えられないため使わない。

import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import type { ColorValue } from 'react-native';

type IconProps = { color?: ColorValue; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
});

const stroke = (color: ColorValue) => ({
  stroke: color as string,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function HomeIcon({ color = '#000', size = 24 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 10.5 12 3.5l9 7" {...stroke(color)} />
      <Path d="M5.5 9.5V20h13V9.5" {...stroke(color)} />
      <Path d="M9.75 20v-5.5h4.5V20" {...stroke(color)} />
    </Svg>
  );
}

export function SearchIcon({ color = '#000', size = 24 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={11} cy={11} r={6.5} {...stroke(color)} />
      <Path d="m16 16 4.5 4.5" {...stroke(color)} />
    </Svg>
  );
}

export function HomeworkIcon({ color = '#000', size = 24 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M5 4.5h9.5L19 9v10.5H5z" {...stroke(color)} />
      <Path d="M14 4.5V9h5" {...stroke(color)} />
      <Polyline points="8.5,13 10.2,14.7 13.8,11.1" {...stroke(color)} />
    </Svg>
  );
}

export function ChartIcon({ color = '#000', size = 24 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 20h16" {...stroke(color)} />
      <Path d="M7 20v-6" {...stroke(color)} />
      <Path d="M12 20V6" {...stroke(color)} />
      <Path d="M17 20v-9" {...stroke(color)} />
    </Svg>
  );
}

export function StudentsIcon({ color = '#000', size = 24 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={9} cy={8.5} r={3.2} {...stroke(color)} />
      <Path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...stroke(color)} />
      <Path d="M16 6.2a3.2 3.2 0 0 1 0 6" {...stroke(color)} />
      <Path d="M17.5 14.9c1.8.6 3 2.4 3 4.6" {...stroke(color)} />
    </Svg>
  );
}

export function PencilIcon({ color = '#000', size = 24 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 20h4l10-10-4-4L4 16z" {...stroke(color)} />
      <Path d="m13.5 6.5 4 4" {...stroke(color)} />
    </Svg>
  );
}

export function ChevronRightIcon({ color = '#000', size = 24 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="m9.5 6 6 6-6 6" {...stroke(color)} />
    </Svg>
  );
}

export function StarIcon({
  color = '#000',
  size = 24,
  filled = false,
}: IconProps & { filled?: boolean }) {
  const d = 'M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.62l-5.1 2.68.98-5.68L3.75 9.6l5.7-.83z';
  return (
    <Svg {...base(size)}>
      <Path
        d={d}
        fill={filled ? (color as string) : 'none'}
        stroke={color as string}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
