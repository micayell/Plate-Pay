// components/TabbedBottomSheet.tsx
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
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
  Image,
  LayoutChangeEvent,
  Modal,
  Linking,
  Platform,
  ActivityIndicator,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { fmtDist } from '../utils/geo';
import type { Partner } from '../data/partners';

const { height: H } = Dimensions.get('window');
const THRESH = 6;
const PADDING = 16;
const DIST_W = 80;

export type TabbedBottomSheetHandle = {
  collapse: () => void;
  expand: () => void;
  toMid: () => void;
};

type Tab = 'shop' | 'parking';

type ShopItem = Partner & {
  hours?: string;
  tag?: string;
  thumb?: string;
  parking?: string;
  phone?: string;
  dis?: number;
  openTime?: string;
  closeTime?: string;
};
type ParkingItem = Partner & { price?: number; dis?: number };

type Props = {
  activeTab: Tab;
  onChangeTab: (t: Tab) => void;

  shopItems?: ShopItem[];
  parkingItems?: ParkingItem[];

  distances?: Record<string, number>;

  onPressShop?: (p: ShopItem) => void;
  onPressParking?: (p: ParkingItem) => void;

  loading?: boolean;
  bottomInset?: number;
};

const TabbedBottomSheet = forwardRef<TabbedBottomSheetHandle, Props>(
function TabbedBottomSheet(
  {
    activeTab,
    onChangeTab,
    shopItems = [],
    parkingItems = [],
    distances,
    onPressShop,
    onPressParking,
    loading = false,
    bottomInset = 0,
  },
  ref
) {
  // ✅ bottomInset이 바뀌면 스냅 재계산
  const snaps = useMemo(() => {
    const OPEN = 84;
    const closedVisible = 140;
    const CLOSED = H - (closedVisible + bottomInset);
    const MID = Math.min(H * 0.55, CLOSED - 40);
    return { open: OPEN, mid: MID, closed: CLOSED };
  }, [bottomInset]);

  const sheetY = useRef(new Animated.Value(snaps.mid)).current;
  const startY = useRef(snaps.mid);
  const [listScrollEnabled, setListScrollEnabled] = useState(true);

  // 스르륵 타이밍 애니메이션
  const timingTo = (to: number, duration = 260) =>
    Animated.timing(sheetY, {
      toValue: to,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

  const springTo = (to: number) =>
    Animated.spring(sheetY, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 0,
    }).start();

  // 외부 제어 핸들
  useImperativeHandle(ref, () => ({
    collapse: () => timingTo(snaps.closed),
    expand: () => timingTo(snaps.open),
    toMid: () => timingTo(snaps.mid),
  }), [snaps.open, snaps.mid, snaps.closed]);

  // bottomInset 등 변화 시 현재 위치 클램프
  useEffect(() => {
    sheetY.stopAnimation((val: number) => {
      const clamped = Math.min(snaps.closed, Math.max(snaps.open, val));
      sheetY.setValue(clamped);
      startY.current = clamped;
    });
  }, [snaps.open, snaps.mid, snaps.closed, sheetY]);

  const tabAnim = useRef(new Animated.Value(activeTab === 'shop' ? 0 : 1)).current;
  const contentAnim = useRef(new Animated.Value(1)).current;
  const [tabsWidth, setTabsWidth] = useState(0);
  const onTabsLayout = (e: LayoutChangeEvent) => setTabsWidth(e.nativeEvent.layout.width);

  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: activeTab === 'shop' ? 0 : 1,
      useNativeDriver: true,
      friction: 10,
      tension: 120,
    }).start();

    contentAnim.setValue(0);
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabAnim, contentAnim]);

  const clamp = (v: number) => Math.min(snaps.closed, Math.max(snaps.open, v));
  const snapToNearest = (y: number) =>
    [snaps.open, snaps.mid, snaps.closed].reduce((p, c) => (Math.abs(c - y) < Math.abs(p - y) ? c : p));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > THRESH,
      onStartShouldSetPanResponderCapture: () => false,
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

  const data = activeTab === 'shop' ? (shopItems as ShopItem[]) : (parkingItems as ParkingItem[]);

  const innerW = Math.max(0, tabsWidth - PADDING * 2);
  const indicatorTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, innerW / 2 || 0],
  });

  const [dial, setDial] = useState<{ visible: boolean; display?: string; number?: string }>({ visible: false });
  const openDialModal = (raw?: string) => {
    const display = raw && raw.trim().length > 0 ? raw : '010-1234-5678';
    const number = display.replace(/[^0-9+]/g, '');
    setDial({ visible: true, display, number });
  };
  const callNow = async () => {
    if (!dial.number) return;
    const url = Platform.select({ ios: `telprompt:${dial.number}`, android: `tel:${dial.number}` })!;
    try { await Linking.openURL(url); } finally { setDial({ visible: false }); }
  };

  // ✅ 아이템 탭 시: 부모 콜백 실행 후 자동으로 “스르륵” 접기
  const handlePressShop = (item: ShopItem) => {
    try { onPressShop?.(item); } finally {
      requestAnimationFrame(() => timingTo(snaps.closed));
    }
  };
  const handlePressParking = (item: ParkingItem) => {
    try { onPressParking?.(item); } finally {
      requestAnimationFrame(() => timingTo(snaps.closed));
    }
  };

  return (
    <>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]} {...pan.panHandlers}>
        <View style={styles.grabber} pointerEvents="box-none">
          <View style={styles.grabberBar} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap} onLayout={onTabsLayout}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabsIndicator,
              { left: PADDING, width: innerW / 2, transform: [{ translateX: indicatorTranslateX }] },
            ]}
          />
          <Pressable style={styles.tabBtn} onPress={() => onChangeTab('shop')}>
            <Text style={[styles.tabText, activeTab === 'shop' && styles.tabTextActive]}>매장</Text>
          </Pressable>
          <Pressable style={styles.tabBtn} onPress={() => onChangeTab('parking')}>
            <Text style={[styles.tabText, activeTab === 'parking' && styles.tabTextActive]}>주차장</Text>
          </Pressable>
        </View>

        {/* List / Loading / Empty */}
        <Animated.View
          style={{
            flex: 1,
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          }}
        >
          {loading ? (
            <View style={styles.centerBox}><ActivityIndicator /><Text style={styles.loadingText}>불러오는 중…</Text></View>
          ) : data.length === 0 ? (
            <View style={styles.centerBox}><Text style={styles.emptyText}>검색 결과가 없습니다</Text></View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              scrollEnabled={listScrollEnabled}
              contentContainerStyle={{ paddingBottom: 24 + bottomInset }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) =>
                activeTab === 'shop' ? (
                  <ShopRow
                    item={item as ShopItem}
                    onPress={() => handlePressShop(item as ShopItem)}
                    dist={fmtDist((item as ShopItem).dis ?? distances?.[item.id])}
                    onPressCall={openDialModal}
                  />
                ) : (
                  <ParkingRow
                    item={item as ParkingItem}
                    onPress={() => handlePressParking(item as ParkingItem)}
                    dist={fmtDist((item as ParkingItem).dis ?? distances?.[item.id])}
                  />
                )
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
      </Animated.View>

      {/* 전화번호 모달 */}
      <Modal visible={dial.visible} transparent animationType="fade" onRequestClose={() => setDial({ visible: false })}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDial({ visible: false })}>
          <Pressable style={styles.modalCard} onPress={callNow}>
            <Text style={styles.modalNumber}>{dial.display ?? ''}</Text>
            <Text style={styles.modalAction}>전화 걸기</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

export default TabbedBottomSheet;

/** -------------------- Rows -------------------- **/
function ShopRow({
  item, dist, onPress, onPressCall,
}: { item: ShopItem; dist?: string; onPress?: () => void; onPressCall?: (phone?: string) => void; }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {item.thumb ? (
        <Image source={{ uri: item.thumb }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: '#F3F4F6' }]} />
      )}

      <View style={styles.shopInfo}>
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.title}>{item.name}</Text>
          {!!item.tag && (<View style={styles.pillWrap}><Text style={styles.pillText}>{item.tag}</Text></View>)}
          {!!dist && <Text style={styles.distTop}>{dist}</Text>}
        </View>

        <Text numberOfLines={1} style={styles.addr}>{item.addr}</Text>
        {item.openTime ? <Text style={styles.hours}>{item.openTime} - {item.closeTime}</Text> : null}

        <View style={styles.shopBottomRow}>
          <Pressable style={styles.phoneBtn} onPress={() => onPressCall?.(item.phone)}>
            <Icon name="phone" size={14} color="#3B82F6" />
            <Text style={styles.phoneBtnText}>전화</Text>
          </Pressable>

          <View style={styles.parkingWrap}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.parkingText}>
              <Text style={styles.parkingLabel}>주차 </Text>
              {item.parking}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ParkingRow({ item, dist, onPress }: { item: ParkingItem; dist?: string; onPress?: () => void; }) {
  const priceText = `${item.price?.toLocaleString() ?? '-'}원`;
  return (
    <Pressable style={styles.rowCol} onPress={onPress}>
      <View style={styles.topGroup}>
        <View style={styles.headerRow}>
          <Text style={styles.pTitle}>{item.name}</Text>
          <Text style={styles.pDistTop}>{dist}</Text>
        </View>
        <Text style={styles.pAddr} numberOfLines={1}>{item.addr}</Text>
      </View>
      <View style={{ flex: 1 }} />
      <View style={styles.bottomGroup}>
        <View style={styles.priceTableRight}>
          <View style={styles.priceRowRight}><Text style={styles.priceLabelRight}>기본(30분)</Text><Text style={styles.priceValue}>{priceText}</Text></View>
          <View style={styles.priceRowRight}><Text style={[styles.priceLabelRight, { fontWeight: '600' }]}>30분당</Text><Text style={styles.priceValue}>{priceText}</Text></View>
        </View>
      </View>
    </Pressable>
  );
}

/** -------------------- Styles -------------------- **/
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
  },
  grabber: { alignItems: 'center', paddingBottom: 6 },
  grabberBar: { width: 64, height: 6, borderRadius: 99, backgroundColor: '#DDE1E6' },

  /* Tabs */
  tabsWrap: { flexDirection: 'row', alignItems: 'flex-end', position: 'relative', paddingHorizontal: PADDING, marginBottom: 6 },
  tabsIndicator: { position: 'absolute', bottom: 0, height: 2, backgroundColor: '#3B82F6', borderRadius: 2 },
  tabBtn: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 8 },
  tabText: { fontSize: 15, color: '#6B7280' },
  tabTextActive: { color: '#111', fontWeight: '700' },

  /* Shop row (좌우) */
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  thumb: { width: 96, height: 96, borderRadius: 14, backgroundColor: '#EEE' },
  shopInfo: { flex: 1, minWidth: 0, position: 'relative' },
  titleWrap: { position: 'relative', paddingRight: 64, flexDirection: 'row', alignItems: 'center' },
  title: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: '#111', marginRight: 8 },
  pillWrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E9D5FF' },
  pillText: { color: '#5B21B6', fontSize: 9, fontWeight: '700' },
  distTop: { position: 'absolute', right: 0, top: 2, fontSize: 14, fontWeight: '700', color: '#111' },
  addr: { marginTop: 8, fontSize: 13, color: '#111' },
  hours: { marginTop: 10, fontSize: 12, color: '#111' },

  // 전화 버튼 + 주차 텍스트 영역
  shopBottomRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phoneBtn: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneBtnText: { fontSize: 14, color: '#3B82F6', fontWeight: '700' },

  parkingWrap: { flex: 1, minWidth: 0, marginLeft: 12 },
  parkingText: { fontSize: 12, color: '#111', textAlign: 'right' },
  parkingLabel: { color: '#000', fontWeight: '700', fontSize: 12 },

  /* Parking row (상/하) */
  rowCol: { flexDirection: 'column', paddingHorizontal: 16, paddingVertical: 14, minHeight: 140, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  topGroup: { gap: 6 },
  headerRow: { position: 'relative', paddingRight: DIST_W },
  pTitle: { fontSize: 16, fontWeight: '700', color: '#111', lineHeight: 22, width: '100%', flexWrap: 'wrap' },
  pDistTop: { position: 'absolute', right: 0, top: 0, minWidth: DIST_W - 8, textAlign: 'right', fontSize: 12, color: '#6B7280' },
  pAddr: { fontSize: 13, color: '#111', lineHeight: 19, width: '100%' },

  bottomGroup: { alignSelf: 'flex-end', alignItems: 'flex-end', justifyContent: 'flex-end', width: '100%' },
  priceTableRight: { alignItems: 'flex-end', gap: 4 },
  priceRowRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: '100%' },
  priceLabelRight: { textAlign: 'right', fontSize: 11, color: '#111', marginRight: 14 },
  priceValue: { fontSize: 12, fontWeight: '700', color: '#111', textAlign: 'right' },

  /* 공통 상태 */
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 24 },
  loadingText: { marginTop: 8, color: '#6B7280' },
  emptyText: { color: '#6B7280' },

  /* 전화 모달 */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { minWidth: 240, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' },
  modalNumber: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  modalAction: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },
});
