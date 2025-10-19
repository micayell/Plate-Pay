import { useWindowDimensions, PixelRatio } from "react-native";

export type Breakpoint = "phone" | "largePhone" | "tablet";

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const shortest = Math.min(width, height);

  let bp: Breakpoint = "phone";
  if (shortest >= 600 && shortest < 840) bp = "largePhone";
  else if (shortest >= 840) bp = "tablet";

  // 기준 너비(375pt) 대비 스케일!!! 너무 커지지 않게 상/하한!!!
  const base = 375;
  const scaleRaw = width / base;
  const scale = Math.min(1.25, Math.max(0.85, scaleRaw));

  // 폰트는 사용자의 글자 크기 설정(fontScale)을 존중!!!
  const fs = (size: number) => PixelRatio.roundToNearestPixel(size * scale * (1 / fontScale));
  const s = (n: number) => PixelRatio.roundToNearestPixel(n * scale);

  return {
    width, height, bp, scale, fs, s,
    isTablet: bp === "tablet",
    isLargePhone: bp === "largePhone",
  };
}