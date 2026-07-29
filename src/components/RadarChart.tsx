// 学習カルテの単元別レーダーチャート（F-06）
//
// 鉛筆の層で描く。面は藍、目盛りは罫。
// 2以下の単元だけ朱の点と朱のラベルにして、どこに手を入れるべきかを一目にする。

import { View, Text } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { colors, font, needsAttention, space } from '../theme';

type Props = {
  data: { unit: string; level: number }[];
  size?: number;
  max?: number;
};

export function RadarChart({ data, size = 260, max = 5 }: Props) {
  // 3点未満だと面にならないのでチャートにしない
  if (data.length < 3) {
    return (
      <Text style={{ ...font.small, color: colors.sumiFaint, textAlign: 'center', paddingVertical: space.xl }}>
        単元が3つ以上記録されるとチャートを表示します（現在 {data.length} 件）
      </Text>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 38; // ラベル分の余白
  const step = (Math.PI * 2) / data.length;

  const point = (i: number, ratio: number) => {
    const angle = -Math.PI / 2 + step * i; // 頂点を真上から始める
    return [cx + Math.cos(angle) * r * ratio, cy + Math.sin(angle) * r * ratio] as const;
  };

  const polygon = data.map((d, i) => point(i, d.level / max).join(',')).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* 目盛りの同心円。ノートの罫と同じ濃さに揃える */}
        {Array.from({ length: max }, (_, n) => n + 1).map((n) => (
          <Circle
            key={n}
            cx={cx}
            cy={cy}
            r={(r * n) / max}
            stroke={colors.rule}
            strokeWidth={1}
            fill="none"
          />
        ))}
        {/* 各単元への軸 */}
        {data.map((_, i) => {
          const [x, y] = point(i, 1);
          return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={colors.rule} strokeWidth={1} />;
        })}
        {/* 理解度の面 */}
        <Polygon
          points={polygon}
          fill={colors.ao}
          fillOpacity={0.14}
          stroke={colors.ao}
          strokeWidth={1.6}
        />
        {/* 頂点。2以下は朱で立てる */}
        {data.map((d, i) => {
          const [x, y] = point(i, d.level / max);
          const weak = needsAttention(d.level);
          return (
            <Circle
              key={i}
              cx={x}
              cy={y}
              r={weak ? 4.5 : 3}
              fill={weak ? colors.shu : colors.ao}
            />
          );
        })}
        {/* 単元名 */}
        {data.map((d, i) => {
          const [x, y] = point(i, 1.18);
          const weak = needsAttention(d.level);
          return (
            <SvgText
              key={i}
              x={x}
              y={y}
              fontSize={11}
              fontWeight={weak ? '700' : '400'}
              fill={weak ? colors.shu : colors.sumiMid}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {d.unit}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
