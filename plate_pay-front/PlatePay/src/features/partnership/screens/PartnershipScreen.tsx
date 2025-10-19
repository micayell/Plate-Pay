// screens/PartnershipScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import MapViewKakao, { MapViewKakaoHandle } from '../components/MapViewKakao';

import SearchBarButton from '../components/SearchBarButton';
import SearchOverlay from '../components/SearchOverlay';

import MyLocationFAB from '../components/MyLocationFAB';
import BottomSheet, { BottomSheetHandle } from '../components/BottomSheet';
import TabbedBottomSheet, { TabbedBottomSheetHandle } from '../components/TabbedBottomSheet';

import { haversine } from '../utils/geo';
import { useAndroidLocationPermission } from '../hooks/useAndroidLocationPermission';
import { searchParkings, searchShops } from '../api/search';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ──────────────────────────────────────────────────────────────────────────────
type ShopRow = {
  id: string;
  name: string;
  addr: string;
  lat: number;
  lng: number;
  dis?: number;
  hours?: string;
  tag?: string;
  thumb?: string;
  phone?: string;
  parking?: string;
  openTime?: string;
  closeTime?: string;
};
type ParkingRow = {
  id: string;
  name: string;
  addr: string;
  lat: number;
  lng: number;
  dis?: number;
  price?: number;
  additionalPrice?: number;
  capacity?: number;
};
type Tab = 'shop' | 'parking';

const DEFAULT_COORD = { lat: 37.5665, lon: 126.978 };
const SIZE = 20;
const START_PAGE = 0;

// 커스텀 탭바 높이
const TABBAR_BASE_HEIGHT = 60;

// ──────────────────────────────────────────────────────────────────────────────
export default function PartnershipScreen() {
  useAndroidLocationPermission();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapViewKakaoHandle>(null);

  // BottomSheet 제어용 ref (필요 시 수동 제어)
  const parkingSheetRef = useRef<BottomSheetHandle>(null);
  const tabbedSheetRef = useRef<TabbedBottomSheetHandle>(null);

  // 위치
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const curLat = myLoc?.lat ?? DEFAULT_COORD.lat;
  const curLon = myLoc?.lng ?? DEFAULT_COORD.lon;

  // 검색/탭 상태
  const [keyword, setKeyword] = useState('');
  const [shopType, setShopType] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [overlayKey, setOverlayKey] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('parking');
  const searched = keyword.trim().length > 0;

  // 리스트 데이터
  const [parkingItems, setParkingItems] = useState<ParkingRow[]>([]);
  const [shopItems, setShopItems] = useState<ShopRow[]>([]);

  // 초기(비검색) 주차장 페이지 상태
  const [parkingPage, setParkingPage] = useState(START_PAGE);
  const [parkingHasMore, setParkingHasMore] = useState(true);
  const [parkingLoading, setParkingLoading] = useState(false);
  const [parkingLoadingMore, setParkingLoadingMore] = useState(false);

  // 검색 탭 로딩/에러
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (lat,lon,keyword,tab,type) → 결과 캐시
  const cacheRef = useRef<Map<string, any[]>>(new Map());
  const makeCacheKey = (
    tab: Tab,
    lat: number,
    lon: number,
    kw: string,
    type?: string,
  ) =>
    `${tab}|${lat.toFixed(5)},${lon.toFixed(5)}|${(kw || '').trim()}|${
      tab === 'shop' ? type || 'ALL' : ''
    }`;

  // 거리 계산
  const distances = useMemo(() => {
    if (!myLoc) return {};
    const obj: Record<string, number> = {};
    shopItems.forEach(i => {
      obj[i.id] =
        typeof i.dis === 'number'
          ? i.dis!
          : haversine(
              { lat: myLoc.lat, lng: myLoc.lng },
              { lat: i.lat, lng: i.lng },
            );
    });
    parkingItems.forEach(i => {
      obj[i.id] =
        typeof i.dis === 'number'
          ? i.dis!
          : haversine(
              { lat: myLoc.lat, lng: myLoc.lng },
              { lat: i.lat, lng: i.lng },
            );
    });
    return obj;
  }, [myLoc, shopItems, parkingItems]);

  // ───────────────── 초기 진입: 주차장 페이지 기반 로드 ─────────────────
  useEffect(() => {
    if (searched) return; // 검색 모드엔 스킵
    setParkingItems([]);
    setParkingPage(START_PAGE);
    setParkingHasMore(true);
    let cancelled = false;

    (async () => {
      setError(null);
      setParkingLoading(true);
      try {
        const res = await searchParkings(
          curLat,
          curLon,
          null,
          SIZE,
          START_PAGE,
        );
        if (cancelled) return;
        const rows = mapParkingResults(res);
        setParkingItems(rows);

        const hasMore = inferHasMore(res, rows, SIZE);
        setParkingHasMore(hasMore);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? '주차장 조회 실패');
      } finally {
        if (!cancelled) setParkingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [curLat, curLon, searched]);

  // ─────────────── 추가 페이지 로드(초기 BottomSheet 전용) ───────────────
  const loadMoreParkings = async () => {
    if (!parkingHasMore || parkingLoadingMore || searched) return;
    setParkingLoadingMore(true);
    setError(null);
    try {
      const nextPage = parkingPage + 1;
      const res = await searchParkings(curLat, curLon, null, SIZE, nextPage);
      const rows = mapParkingResults(res);
      setParkingItems(prev => dedupById([...prev, ...rows]));
      setParkingPage(nextPage);
      const hasMore = inferHasMore(res, rows, SIZE);
      setParkingHasMore(hasMore);
    } catch (e: any) {
      setError(e?.message ?? '주차장 추가 조회 실패');
    } finally {
      setParkingLoadingMore(false);
    }
  };

  // ─────────────── 검색 실행(탭형으로 전환 + 매장 우선) ───────────────
  const performSearch = async (text: string, type?: string) => {
    const kw = text.trim();
    setKeyword(kw);
    setShopType(type);
    setSearchOpen(false);
    setOverlayKey(k => k + 1);
    setActiveTab('shop');

    if (!kw) {
      setShopItems([]);
      return;
    }
    await ensureTabData('shop', kw, type);
  };

  // ─────────────── 탭 전환 시 lazy 로드 ───────────────
  const handleChangeTab = async (t: Tab) => {
    setActiveTab(t);
    if (searched) {
      await ensureTabData(t, keyword, shopType);
    }
  };

  // ─────────────── (탭, 좌표, 키워드, type) 캐시 → API ───────────────
  const ensureTabData = async (tab: Tab, kw: string, type?: string) => {
    const key = makeCacheKey(tab, curLat, curLon, kw, type);
    const cached = cacheRef.current.get(key);
    if (cached) {
      if (tab === 'shop') setShopItems(cached as ShopRow[]);
      else setParkingItems(cached as ParkingRow[]);
      return;
    }

    setTabLoading(true);
    setError(null);
    try {
      if (tab === 'shop') {
        const res = await searchShops(curLat, curLon, type, kw, SIZE, 0);
        const rows = mapShopResults(res);
        console.log('shop rows', rows);
        setShopItems(rows);
        cacheRef.current.set(key, rows);
      } else {
        const res = await searchParkings(curLat, curLon, kw, SIZE, 1);
        const rows = mapParkingResults(res);
        setParkingItems(rows);
        cacheRef.current.set(key, rows);
      }
    } catch (e: any) {
      setError(
        e?.message ?? (tab === 'shop' ? '매장 검색 실패' : '주차장 검색 실패'),
      );
    } finally {
      setTabLoading(false);
    }
  };

  // 리스트 → 지도 마커
  const toMarkers = <
    T extends { id: string; name: string; lat: any; lng: any },
  >(
    arr: T[],
  ) =>
    (arr ?? [])
      .map(it => ({
        id: String(it.id),
        name: it.name,
        lat: Number(it.lat),
        lng: Number(it.lng),
      }))
      .filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lng));

  const mapMarkers = useMemo(() => {
    const markers = !searched
      ? toMarkers(parkingItems)
      : activeTab === 'shop'
      ? toMarkers(shopItems)
      : toMarkers(parkingItems);

    if (__DEV__)
      console.log(
        '[PartnershipScreen] mapMarkers:',
        markers.length,
        markers[0],
      );
    return markers;
  }, [searched, activeTab, shopItems, parkingItems]);

  // 바텀시트 inset
  const bottomInset = Math.max(insets.bottom, 8) + TABBAR_BASE_HEIGHT;

  const JS_KEY = '05c2c22a5febba0b6528a07f5928e1cf';

  return (
    <View style={s.container}>
      {/* 지도 */}
      <MapViewKakao
        ref={mapRef}
        jsKey={JS_KEY}
        markers={mapMarkers}
        style={RNStyleSheet.absoluteFillObject}
        onReady={() => {}}
        onLocateOk={({ latitude, longitude }) =>
          setMyLoc({ lat: latitude, lng: longitude })
        }
        onMarkerClick={() => {}}
        clustering={{ minLevel: 4, averageCenter: true }}
      />

      {/* 초기 리스트 vs 검색 탭 */}
      {!searched ? (
        <BottomSheet
          ref={parkingSheetRef}
          items={parkingItems as any}
          distances={distances}
          onItemPress={(p: any) => {
            mapRef.current?.setCenter(p.lat, p.lng, 3);
            mapRef.current?.highlightMarker?.(p.id);
            // 내부 auto-collapse
          }}
          onLoadMore={loadMoreParkings}
          loadingMore={parkingLoadingMore}
          hasMore={parkingHasMore}
          bottomInset={bottomInset}
        />
      ) : (
        <TabbedBottomSheet
          ref={tabbedSheetRef}
          activeTab={activeTab}
          onChangeTab={handleChangeTab}
          shopItems={shopItems as any}
          parkingItems={parkingItems as any}
          distances={distances}
          loading={tabLoading}
          bottomInset={bottomInset}
          onPressShop={(p: any) => {
            mapRef.current?.setCenter(p.lat, p.lng, 3);
            mapRef.current?.highlightMarker?.(p.id);
            // 내부 auto-collapse
          }}
          onPressParking={(p: any) => {
            mapRef.current?.setCenter(p.lat, p.lng, 3);
            mapRef.current?.highlightMarker?.(p.id);
            // 내부 auto-collapse
          }}
        />
      )}

      {/* 오버레이: 검색바/FAB */}
      <View style={s.overlayLayer} pointerEvents="box-none">
        <SearchBarButton
          placeholder="검색"
          onPress={() => requestAnimationFrame(() => setSearchOpen(true))}
          style={s.search}
        />
        <MyLocationFAB onPress={() => mapRef.current?.locateMe()} />
      </View>

      {/* 상태/에러 표시 */}
      {(parkingLoading || tabLoading) && (
        <View style={s.stateRow}>
          <ActivityIndicator />
          <Text style={s.stateText}>
            {parkingLoading ? '주차장 불러오는 중…' : '검색 중…'}
          </Text>
        </View>
      )}
      {error && (
        <Text style={[s.stateText, { color: '#DC2626', marginLeft: 16 }]}>
          {error}
        </Text>
      )}

      {/* 검색 오버레이 */}
      <SearchOverlay
        key={overlayKey}
        visible={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setOverlayKey(k => k + 1);
        }}
        onSearch={performSearch}
      />
    </View>
  );
}

// ────────────────────────────── 유틸/매퍼 ──────────────────────────────
function mapShopResults(res: any): ShopRow[] {
  const list = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.content)
    ? res.content
    : Array.isArray(res)
    ? res
    : [];
  return list.map((it: any, i: number) => ({
    id: String(it.id ?? it.storeId ?? i),
    name: it.name ?? it.storeName ?? '매장',
    addr: it.addr ?? it.address ?? it.roadAddress ?? '',
    lat: num(it.latitude ?? it.lat),
    lng: num(it.longitude ?? it.lng ?? it.lon),
    dis: num(it.distanceKm ?? it.dis),
    parking: it.parking_lot_name ?? it.parkingLotName ?? undefined,
    openTime: it.openTime ?? it.openingTime ?? undefined,
    closeTime: it.closeTime ?? it.closingTime ?? undefined,
    hours: it.hours ?? it.openingHours ?? undefined,
    tag: it.storeType ?? it.category ?? undefined,
    thumb: it.storeUrl ?? it.imageUrl ?? it.thumbnailUrl ?? undefined,
    phone: it.storePhoneNum ?? it.tel ?? undefined,
  }));
}

function mapParkingResults(res: any): ParkingRow[] {
  const list = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.content)
    ? res.content
    : Array.isArray(res)
    ? res
    : [];
  return list.map((it: any, i: number) => ({
    id: stableKeyFrom(it, i),
    name: it.name ?? it.parkingLotName ?? '주차장',
    addr: it.addr ?? it.address ?? it.roadAddress ?? '',
    lat: num(it.latitude ?? it.lat),
    lng: num(it.longitude ?? it.lng ?? it.lon),
    dis: num(it.distanceKm ?? it.distance ?? it.dis),
    price: num(it.primaryFee ?? it.pricePerHour),
    additionalPrice: num(it.additionalFee ?? it.addFee ?? it.additionFee),
    capacity: num(it.capacity ?? it.totalLots ?? it.capacityCnt),
  }));
}

function stableKeyFrom(it: any, i: number) {
  const raw =
    it.id ??
    it.parkingLotId ??
    it.parkingLotUid ??
    it.storeId ??
    it.code ??
    it.uuid ??
    null;
  if (raw != null) return String(raw);

  const lat = Number(it.latitude ?? it.lat);
  const lng = Number(it.longitude ?? it.lng ?? it.lon);
  const name = (it.name ?? it.parkingLotName ?? it.storeName ?? '').trim();
  const addr = (it.addr ?? it.address ?? it.roadAddress ?? '').trim();

  const ll =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat.toFixed(6)},${lng.toFixed(6)}`
      : `row-${i}`;

  return `${ll}|${name}|${addr}`;
}

const num = (v: any) =>
  v === null || v === undefined || v === '' ? undefined : Number(v);

function inferHasMore(res: any, pageItems: any[], size: number): boolean {
  const page = res?.page ?? res?.number;
  const totalPages = res?.totalPages ?? res?.pageTotal ?? res?.totalPage;
  if (typeof page === 'number' && typeof totalPages === 'number') {
    return page < totalPages - 1;
  }
  return pageItems.length === size;
}
function dedupById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

// ────────────────────────────── styles ──────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  overlayLayer: {
    ...RNStyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
    zIndex: 9999,
    elevation: 9999,
  },
  search: { position: 'absolute', left: 16, right: 16, top: 16 },
  stateRow: {
    position: 'absolute',
    top: 66,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 9999,
    elevation: 9999,
  },
  stateText: { color: '#6B7280' },
});
