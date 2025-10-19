// components/BottomSheet.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  PanResponder,
  ActivityIndicator,
  LayoutChangeEvent,
  Easing,
} from 'react-native';
import type { Partner } from '../data/partners';
import { fmtDist } from '../utils/geo';

const { height: H } = Dimensions.get('window');
const THRESH = 6;
const DIST_W = 80;

export type BottomSheetHandle = {
  /** 아래로 접기(덮개만 보이게) */
  collapse: () => void;
  /** 맨 위쪽까지 펼치기 */
  expand: () => void;
  /** 중간 스냅 포인트로 이동 */
  toMid: () => void;
};

type SheetItem = Partner & { dis?: number; additionalPrice?: number; price?: number };

type Props = {
  items: SheetItem[];
  distances?: Record<string, number>;
  onItemPress: (p: SheetItem) => void;

  /** 무한스크롤 */
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;

  /** 하단 탭바/제스처바 높이 (탭바가 가리지 않게 위로 띄워줌) */
  bottomInset?: number;
  autoFill?: boolean;
};

const BottomSheet = forwardRef<BottomSheetHandle, Props>(function BottomSheet(
  {
    items,
    distances,
    onItemPress,
    onLoadMore,
    loadingMore = false,
    hasMore = false,
    bottomInset = 0,
    autoFill = true,
  },
  ref
) {
  /** 스냅 위치를 bottomInset 반영해서 동적으로 계산 */
  const snaps = useMemo(() => {
    const OPEN = 80;
    const closedVisible = 140;
    const CLOSED = H - (closedVisible + bottomInset);
    const MID = Math.min(H * 0.45, CLOSED - 40);
    return { open: OPEN, mid: MID, closed: CLOSED };
  }, [bottomInset]);

  const sheetY = useRef(new Animated.Value(snaps.mid)).current;
  const startY = useRef(snaps.mid);
  const [listScrollEnabled, setListScrollEnabled] = useState(true);

  const clamp = (v: number) => Math.min(snaps.closed, Math.max(snaps.open, v));
  const snapToNearest = (y: number) =>
    [snaps.open, snaps.mid, snaps.closed].reduce((p, c) =>
      Math.abs(c - y) < Math.abs(p - y) ? c : p
    );

  const springTo = (to: number) =>
    Animated.spring(sheetY, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 0,
    }).start();

  // ✨ 더 부드러운 “스르륵” 타이밍 애니메이션
  const timingTo = (to: number, duration = 260) =>
    Animated.timing(sheetY, {
      toValue: to,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

  // ✅ 외부에서 제어할 수 있게 핸들 노출
  useImperativeHandle(
    ref,
    () => ({
      collapse: () => timingTo(snaps.closed),
      expand: () => timingTo(snaps.open),
      toMid: () => timingTo(snaps.mid),
    }),
    [snaps.open, snaps.mid, snaps.closed]
  );

  // snaps가 바뀌면 현재 위치를 새 범위로 클램프
  useEffect(() => {
    sheetY.stopAnimation((val: number) => {
      const clamped = Math.min(snaps.closed, Math.max(snaps.open, val));
      sheetY.setValue(clamped);
      startY.current = clamped;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snaps.open, snaps.mid, snaps.closed]);

  /** 그랩버에만 PanResponder 걸기 */
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > THRESH,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dy) > THRESH,

      onPanResponderGrant: () => {
        sheetY.stopAnimation((val: number) => (startY.current = val));
        setListScrollEnabled(false);
      },
      onPanResponderMove: (_e, g) => sheetY.setValue(clamp(startY.current + g.dy)),
      onPanResponderRelease: (_e, g) => {
        const target = snapToNearest(clamp(startY.current + g.dy));
        springTo(target);
        setListScrollEnabled(true);
      },
      onPanResponderTerminate: () => setListScrollEnabled(true),
    })
  ).current;

  /** ── 무한스크롤 보강(중복 호출 방지 + 화면 채우기) ── */
  const canTriggerRef = useRef(true);
  const listHRef = useRef(0);
  const contentHRef = useRef(0);

  const tryLoadMore = () => {
    if (!hasMore || loadingMore || !onLoadMore) return;
    if (!canTriggerRef.current) return;
    canTriggerRef.current = false;
    onLoadMore();
  };

  useEffect(() => {
    if (!loadingMore) {
      const t = setTimeout(() => (canTriggerRef.current = true), 50);
      return () => clearTimeout(t);
    }
  }, [loadingMore]);

  useEffect(() => {
    if (!autoFill || !hasMore || loadingMore) return;
    if (contentHRef.current && listHRef.current && contentHRef.current < listHRef.current - 8) {
      tryLoadMore();
    }
  }, [items, hasMore, loadingMore, autoFill]);

  const onListLayout = (e: LayoutChangeEvent) => (listHRef.current = e.nativeEvent.layout.height);
  const onContentSizeChange = (_w: number, h: number) => (contentHRef.current = h);

  const Footer = () => {
    if (!hasMore && !loadingMore) return <View style={{ height: 8 + bottomInset }} />;
    return (
      <View style={{ paddingVertical: 14, alignItems: 'center', paddingBottom: bottomInset }}>
        {loadingMore ? <ActivityIndicator /> : <Text style={{ color: '#6B7280' }}>더 이상 없음</Text>}
      </View>
    );
  };

  // ✅ 아이템 탭 시: 부모 콜백 실행 후 “스르륵” 아래로 접기
  const handleItemPress = (item: SheetItem) => {
    try {
      onItemPress(item);
    } finally {
      // 프레임 한 번 넘긴 뒤 더 자연스럽게 접기
      requestAnimationFrame(() => timingTo(snaps.closed));
    }
  };

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
      {/* ✅ 그랩버에만 panHandlers 부착 + 터치영역 키우기 */}
      <View style={styles.grabber} {...pan.panHandlers}>
        <View style={styles.grabberBar} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: 18 + bottomInset,
          paddingTop: 2,
          paddingHorizontal: 12,
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        scrollEnabled={listScrollEnabled}
        onLayout={onListLayout}
        onContentSizeChange={onContentSizeChange}
        renderItem={({ item }) => {
          const d = item.dis ?? distances?.[item.id];
          const priceText = `${item.price?.toLocaleString() ?? '-'}원`;
          const additionalPriceText = item.additionalPrice ? `${item.additionalPrice.toLocaleString()}원` : '-';
          return (
            <View style={styles.itemPadding}>
              <Pressable onPress={() => handleItemPress(item)} style={styles.row}>
                <View style={styles.topGroup}>
                  <View style={styles.headerRow}>
                    <Text style={styles.title}>{item.name}</Text>
                    <Text style={styles.distTop}>{fmtDist(d)}</Text>
                  </View>
                  <Text style={styles.addr}>{item.addr}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={styles.bottomGroup}>
                  <View style={styles.priceTable}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>기본(30분)</Text>
                      <Text style={styles.priceValue}>{priceText}</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceLabel, styles.priceLabelBold]}>30분당</Text>
                      <Text style={styles.priceValue}>{additionalPriceText}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.25}
        onEndReached={tryLoadMore}
        ListFooterComponent={Footer}
        onMomentumScrollBegin={() => (canTriggerRef.current = true)}
      />
    </Animated.View>
  );
});

export default BottomSheet;

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, top: 0, height: H,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
    zIndex: 12,
  },
  // 터치 영역 넓게
  grabber: { alignItems: 'center', paddingBottom: 6, paddingTop: 12 },
  grabberBar: { width: 64, height: 6, borderRadius: 99, backgroundColor: '#DDE1E6' },

  itemPadding: { paddingHorizontal: 8, paddingVertical: 4 },

  row: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 140,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  topGroup: { gap: 6 },
  headerRow: { position: 'relative', paddingRight: DIST_W },
  title: { fontSize: 16, fontWeight: '700', color: '#111', lineHeight: 22, width: '100%', flexWrap: 'wrap' },
  distTop: { position: 'absolute', right: 0, top: 0, minWidth: DIST_W - 8, textAlign: 'right', fontSize: 12, color: '#6B7280' },
  addr: { fontSize: 13, color: '#111', lineHeight: 19, width: '100%', flexWrap: 'wrap' },

  bottomGroup: { alignSelf: 'flex-end', alignItems: 'flex-end', justifyContent: 'flex-end', width: '100%' },
  priceTable: { alignItems: 'flex-end', gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: '100%' },
  priceLabel: { textAlign: 'right', fontSize: 11, color: '#111', marginRight: 14 },
  priceLabelBold: { fontWeight: '600' },
  priceValue: { fontSize: 12, fontWeight: '700', color: '#111', textAlign: 'right' },

  sep: { height: 0 },
});
