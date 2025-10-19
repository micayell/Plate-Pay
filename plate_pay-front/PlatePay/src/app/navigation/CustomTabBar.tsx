// navigation/CustomTabBar.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  Text,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Layout = { x: number; width: number };

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (layouts.length === state.routes.length) {
      const activeLayout = layouts[state.index];
      Animated.spring(translateX, {
        toValue: activeLayout?.x ?? 0,
        stiffness: 120,
        damping: 15,
        mass: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, layouts, translateX]);

  const handleLayout = (event: LayoutChangeEvent, index: number) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts(prev => {
      const next = [...prev];
      next[index] = { x, width };
      return next;
    });
  };

  const getIconName = (routeName: string): string => {
    const icons: Record<string, string> = {
      홈: 'home',
      제휴: 'handshake',
      거래내역: 'exchange-alt',
      차량: 'car',
      지갑: 'wallet',
    };
    return icons[routeName] || 'question-circle';
  };

  // ✅ 풀폭 + 안전영역 반영
  const baseHeight = 60;
  const bottomPad = Math.max(8, insets.bottom);  // 제스처바/3버튼바 여백
  const containerHeight = baseHeight + bottomPad;

  return (
    <View
      style={[
        styles.container,
        {
          height: containerHeight,
          paddingBottom: bottomPad,
          // iOS만 살짝 블러 느낌의 그림자, 안드로이드는 elevation
          shadowOpacity: Platform.OS === 'ios' ? 0.12 : 1,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.tabsContainer}>
        {/* 활성 탭 인디케이터 (상단 얇은 바 + 그라데이션 글로우) */}
        {layouts.length === state.routes.length && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              { width: layouts[state.index]?.width, transform: [{ translateX }] },
            ]}
          >
            <LinearGradient
              colors={['rgba(49,130,247,0.35)', 'rgba(49,130,247,0)']}
              style={styles.gradient}
            />
            <View style={styles.topBar} />
          </Animated.View>
        )}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const color = isFocused ? '#1D4ED8' : '#9CA3AF';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLayout={e => handleLayout(e, index)}
              style={styles.tab}
              android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            >
              <Icon name={getIconName(route.name)} size={22} color={color} />
              <Text style={[styles.label, { color }]}>{route.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ 풀폭 고정 + 둥근모서리 제거
  container: {
    backgroundColor: '#FFFFFF', // 풀화이트 배경
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: StyleSheet.hairlineWidth, // 상단 헤어라인
    borderTopColor: '#E5E7EB',
    elevation: 12, // Android 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 12,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  indicator: {
    position: 'absolute',
    height: '100%',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    height: 3,          // 더 또렷한 상단 바
    width: '100%',
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  gradient: {
    position: 'absolute',
    top: 3,
    height: 14,
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
