import React, { useMemo } from 'react';
import { View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

type Slice = { label: string; value: number; color: string };

type Props = {
  data: Slice[];
  size?: number;        // 지름
  donutRadius?: number; // 도넛 굵기 제어
};

export function AccountDonutChart({
  data,
  size = 160,
  donutRadius = 40,
}: Props) {
  // gifted-charts 포맷으로 변환
  const chartData = useMemo(
    () => data.map(d => ({ value: d.value, color: d.color, text: '' })),
    [data]
  );

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <PieChart
        donut
        innerRadius={Math.max(4, (size / 2) - donutRadius)}
        radius={size / 2}
        data={chartData}
        showText={false}
        strokeWidth={0}
        sectionAutoFocus={false}
        focusOnPress={false}
        // 애니메이션 옵션 (원하면 비활성화)
        animationDuration={600}
      />
    </View>
  );
}
