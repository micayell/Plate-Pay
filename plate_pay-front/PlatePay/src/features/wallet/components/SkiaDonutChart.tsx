import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import {
  Canvas, Path, Skia, useCanvasRef,
} from '@shopify/react-native-skia';

type Item = { label: string; value: number; color: string };
type Props = {
  data: Item[];
  radius: number;
  strokeWidth: number;
  gap?: number;          // 섹션간 간격(각도)
  paused?: boolean;      // 스크롤 중 true → 그리지 않음
};

export const SkiaDonutChart: React.FC<Props> = ({
  data, radius, strokeWidth, gap = 6, paused = false,
}) => {
  const canvasRef = useCanvasRef();

  // 합계와 각도 계산
  const total = Math.max(1, data.reduce((a, b) => a + (b.value || 0), 0));
  const gapRad = (Math.PI * 2) * (gap / 360); // degree → rad
  const arcs = useMemo(() => {
    let start = -Math.PI / 2; // 12시 방향 시작
    return data.map((d) => {
      const sweep = (Math.PI * 2) * (d.value / total) - gapRad;
      const s = start;
      const e = start + Math.max(0, sweep);
      start = e + gapRad; // 다음 섹션 시작지점
      return { color: d.color, start: s, end: e };
    });
  }, [data, total, gapRad]);

  // 수동 렌더: 스크롤이 끝난 뒤/데이터 바뀔 때만
  useEffect(() => {
    if (paused) return;                // 멈춤 중엔 그리지 않음
    canvasRef.current?.redraw();       // 필요할 때만 그리기
  }, [paused, arcs, canvasRef]);

  const size = (radius + strokeWidth) * 2;

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Canvas ref={canvasRef} style={{ width: size, height: size }} mode="manual">
        {arcs.map((a, i) => {
          const r = radius;
          const rect = Skia.XYWHRect((size / 2) - r, (size / 2) - r, r * 2, r * 2);
          const path = Skia.Path.Make();
          // addArc(Rect, startAngle, sweepAngle) / 각도는 degrees
          const startDeg = (a.start * 180) / Math.PI;
          const sweepDeg = ((a.end - a.start) * 180) / Math.PI;

          path.addArc(rect, startDeg, sweepDeg);

          const paint = Skia.Paint();
          paint.setStyle(1);           // Stroke
          paint.setStrokeWidth(strokeWidth);
          paint.setAntiAlias(true);
          paint.setColor(Skia.Color(a.color));

          return <Path key={i} path={path} paint={paint} />;
        })}
      </Canvas>
    </View>
  );
};
