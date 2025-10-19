// src/features/wallet/screens/WalletScreen.tsx
import React, {useMemo, useState, useCallback, useEffect, useRef} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Platform,
  ScrollView,                 // ✅ 추가
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {CardCarousel} from '../components/CardCarousel';
import {AccountDonutChart} from '../components/AccountDonutChart';
import {useTabStore} from '../../../shared/state/tabStore';
import {YearMonthModal} from '../components/modals/YearMonthModal';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {
  getAccountsOnce,
  refreshAccounts,
  setPrimaryAccount,
  renameAccount,
  deleteAccount,
  getAccountStats,
  type AccountStat,
} from '../api/accountApi';
import AppHeader from '../../../shared/ui/AppHeader';

type UiAccount = {
  accountId: number;
  title: string;
  owner: string;
  last4: string;
  gradient: string[];
  stats: {label: string; value: number; color: string}[];
  isPrimary?: boolean;
};

const PRIMARY = '#0064FF';

const CATEGORY_COLORS: Record<string, string> = {
  CAFE: '#F59E0B',
  RESTAURANT: '#EF4444',
  MART: '#10B981',
  CONVENIENCE: '#3B82F6',
  TRANSPORT: '#8B5CF6',
  ETC: '#6B7280',
};
const PALETTE = [
  '#4F46E5',
  '#0F172A',
  '#2E7D6B',
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
];

function toChartStats(raw: AccountStat[]): UiAccount['stats'] {
  if (!raw?.length) return [{label: '데이터 없음', value: 100, color: '#9CA3AF'}];
  const total = raw.reduce((s, r) => s + (r.totalCost || 0), 0) || 1;
  let sum = 0;
  const out = raw.map((r, i) => {
    const pct = Math.round(((r.totalCost || 0) / total) * 100);
    sum += pct;
    const key = (r.storeType || '').toUpperCase();
    const color = CATEGORY_COLORS[key] || PALETTE[i % PALETTE.length];
    return {label: key || '기타', value: pct, color};
  });
  const diff = 100 - sum;
  out[out.length - 1].value += diff;
  out.forEach(s => { if (s.value < 0) s.value = 0; });
  return out;
}

/** ✅ 반응형 스타일/치수 생성 훅 */
function useResponsive() {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;

  const maxContentWidth = Math.min(720, width);
  const base = 390;
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const scale = clamp(width / base, 0.9, 1.15);
  const r = (n: number) => Math.round(n * scale);

  const padH = clamp(Math.round(width * 0.06), 16, 28);
  const ctaHeight = r(52);
  const ctaWidth = clamp(Math.round(width * 0.44), 140, 260);

  const chartSize = clamp(Math.round(width * (isLandscape ? 0.3 : 0.46)), 140, 220);
  const donutRadius = Math.round(chartSize * 0.26);
  const legendCols = width >= 520 ? 2 : 1;
  const hit = Platform.select({android: 6, ios: 8, default: 8});

  const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: '#FFF'},
    container: {flex: 1, alignItems: 'stretch'},
    header: { marginBottom: 5 },

    // 스크롤 콘텐츠 컨테이너
    scrollContent: {
      paddingBottom: Math.max(insets.bottom, 24),   // ✅ 바닥 여백
    },

    // 중앙 정렬 래퍼 (태블릿 대비)
    centerWrap: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: maxContentWidth,
      marginTop: 25,
    },

    // CTA
    cta: {
      marginHorizontal: clamp(padH, 14, 24),
      marginTop: r(0),
      height: ctaHeight,
      borderRadius: r(22),
      paddingHorizontal: r(16),
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      backgroundColor: PRIMARY,
      width: ctaWidth,
    },
    ctaMuted: {backgroundColor: '#9CA3AF'},
    ctaText: {color: 'white', fontSize: r(16), fontWeight: '700'},

    // 섹션
    section: {paddingHorizontal: padH, paddingTop: r(28)},
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: r(8),
    },
    sectionTitle: {fontSize: r(18), fontWeight: '700', color: '#111'},
    sectionSub: {color: '#6B7280', fontSize: r(14)},

    loadingText: {textAlign: 'center', color: '#6B7280', marginTop: r(8), fontSize: r(14)},

    legendContainer: {
      flexDirection: legendCols === 2 ? 'row' : 'column',
      flexWrap: legendCols === 2 ? 'wrap' : 'nowrap',
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: r(6),
      width: legendCols === 2 ? '50%' : '100%',
      paddingRight: legendCols === 2 ? r(12) : 0,
    },
    dot: {width: r(10), height: r(10), borderRadius: r(5), marginRight: r(8)},
    legendLabel: {fontSize: r(14), color: '#111827', fontWeight: '700'},
    legendVal: {fontWeight: '600', fontSize: r(13)},

    spacerMd: {height: r(12)},
  });

  return {styles, chartSize, donutRadius, hit};
}

export default function WalletScreen() {
  const hide = useTabStore(s => s.hide);
  const show = useTabStore(s => s.show);
  useEffect(() => { hide(); return () => show(); }, []);

  const nav = useNavigation<any>();
  const isFocused = useIsFocused();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [isAddSlideActive, setIsAddSlideActive] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [ymVisible, setYmVisible] = useState(false);

  const [settingPrimary, setSettingPrimary] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const statsCacheRef = useRef<Map<string, UiAccount['stats']>>(new Map());

  const initialAccounts: UiAccount[] = useMemo(() => [], []);
  const [accounts, setAccounts] = useState<UiAccount[]>(initialAccounts);
  const accountsLenRef = useRef(0);
  useEffect(() => { accountsLenRef.current = accounts.length; }, [accounts.length]);

  const current = accounts[currentIndex] ?? accounts[0];
  const isPrimary = accounts.length > 0 && currentIndex === primaryIndex;
  const ymLabel = `${selectedYear}.${String(selectedMonth).padStart(2, '0')}`;

  const {styles, chartSize, donutRadius, hit} = useResponsive();

  const loadAccounts = useCallback(async (force = false) => {
    setAccountsLoading(true);
    try {
      statsCacheRef.current.clear();
      const list = force ? await refreshAccounts() : await getAccountsOnce();

      const gradients = [
        ['#010813', '#050F1D', '#10213D', '#132A4E', '#1F4785'],
        ['#2E7D6B', '#1F5F52'],
        ['#4F46E5', '#3C34B1'],
        ['#0F172A', '#0A0F1C'],
      ];

      const mapped: UiAccount[] = (list ?? []).map((acc: any, idx: number) => ({
        accountId: acc.accountId,
        title: acc.accountName,
        owner: acc.bankName ?? '',
        last4: String(acc.accountNo ?? '').slice(-4),
        gradient: gradients[idx % gradients.length],
        stats: [
          {label: 'Expenses', value: 46, color: '#4F46E5'},
          {label: 'Income', value: 32, color: '#0F172A'},
          {label: 'Savings', value: 22, color: '#2E7D6B'},
        ],
        isPrimary: !!acc.isPrimary,
      }));

      setAccounts(() => mapped);
      const priIdx = mapped.findIndex(a => a.isPrimary);
      setPrimaryIndex(priIdx >= 0 ? priIdx : 0);
      const nextLen = mapped.length || 0;
      setCurrentIndex(ci => Math.min(ci, Math.max(0, nextLen - 1)));
    } catch (e) {
      console.error('📥 계좌 로드 실패:', e);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(false); }, [loadAccounts]);
  useEffect(() => { if (isFocused) loadAccounts(true); }, [isFocused, loadAccounts]);

  const onPickPrimary = useCallback(async () => {
    const selected = accounts[currentIndex];
    if (!selected || settingPrimary) return;
    try {
      setSettingPrimary(true);
      await setPrimaryAccount(selected.accountId);
      setPrimaryIndex(currentIndex);
    } catch (e) {
      console.error('주 계좌 변경 실패:', e);
    } finally {
      setSettingPrimary(false);
    }
  }, [accounts, currentIndex, settingPrimary]);

  const navToAdd = useNavigation<any>();
  const handlePressAdd = useCallback(() => {
    navToAdd.navigate('AddAccount', {
      ownerName: current?.owner ?? '',
      onSubmit: (acc: {title: string; owner: string; last4: string; gradient: string[]}) => {
        setAccounts(prev => {
          const nextId = Math.max(0, ...prev.map(p => p.accountId)) + 1;
          return prev.concat({
            ...acc,
            accountId: nextId,
            stats: [
              {label: 'Expenses', value: 40, color: '#4F46E5'},
              {label: 'Income', value: 40, color: '#0F172A'},
              {label: 'Savings', value: 20, color: '#2E7D6B'},
            ],
          } as UiAccount);
        });
      },
    });
  }, [navToAdd, current]);

  const handleRenameAt = useCallback(
    async (index: number, nextAlias: string) => {
      const target = accounts[index];
      if (!target) return;
      const trimmed = (nextAlias ?? '').trim();
      if (!trimmed || trimmed === target.title) return;
      const prevTitle = target.title;
      setAccounts(prev => prev.map((a, i) => (i === index ? {...a, title: trimmed} : a)));
      try {
        await renameAccount(target.accountId, trimmed);
      } catch (e) {
        console.error('별명 변경 실패:', e);
        setAccounts(prev => prev.map((a, i) => (i === index ? {...a, title: prevTitle} : a)));
      }
    },
    [accounts],
  );

  const handleDeleteAt = useCallback(
    async (index: number) => {
      const target = accounts[index];
      if (!target) return;

      const prevAccounts = accounts;
      const prevCur = currentIndex;
      const prevPri = primaryIndex;

      const nextAccounts = prevAccounts.filter((_, i) => i !== index);
      setAccounts(nextAccounts);

      let nextCur = prevCur;
      if (nextAccounts.length === 0) nextCur = 0;
      else if (prevCur > index) nextCur = prevCur - 1;
      else if (prevCur === index) nextCur = Math.min(index, nextAccounts.length - 1);
      setCurrentIndex(nextCur);

      let nextPri = prevPri;
      if (nextAccounts.length === 0) nextPri = 0;
      else if (prevPri > index) nextPri = prevPri - 1;
      else if (prevPri === index) nextPri = 0;
      setPrimaryIndex(nextPri);

      try {
        await deleteAccount(target.accountId);
      } catch (e) {
        console.error('계좌 삭제 실패, 롤백:', e);
        setAccounts(prevAccounts);
        setCurrentIndex(prevCur);
        setPrimaryIndex(prevPri);
      }
    },
    [accounts, currentIndex, primaryIndex],
  );

  useEffect(() => {
    if (isAddSlideActive) return;
    const acct = accounts[currentIndex];
    if (!acct) return;

    const key = `${acct.accountId}:${selectedYear}-${selectedMonth}`;
    const cached = statsCacheRef.current.get(key);
    if (cached) {
      setAccounts(prev => {
        const idx = prev.findIndex(a => a.accountId === acct.accountId);
        if (idx < 0 || prev[idx].stats === cached) return prev;
        const next = [...prev];
        next[idx] = {...next[idx], stats: cached};
        return next;
      });
      return;
    }

    let cancelled = false;
    setStatsLoading(true);
    (async () => {
      try {
        const raw = await getAccountStats(acct.accountId, {year: selectedYear, month: selectedMonth});
        const stats = toChartStats(raw);
        if (cancelled) return;
        statsCacheRef.current.set(key, stats);
        setAccounts(prev => {
          const idx = prev.findIndex(a => a.accountId === acct.accountId);
          if (idx < 0 || prev[idx].stats === stats) return prev;
          const next = [...prev];
          next[idx] = {...next[idx], stats};
          return next;
        });
      } catch (e) {
        console.error('계좌별 통계 조회 실패:', e);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [currentIndex, selectedYear, selectedMonth, isAddSlideActive, accounts]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* 상단 헤더 (고정) */}
        <AppHeader
          title="지갑"
          rightType="profile"
          rightNavigateTo="ProfileStack"
          style={styles.header}
        />

        {/* ✅ 스크롤 가능한 본문 */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 카드 캐러셀 */}
          <View style={styles.centerWrap}>
            {accountsLoading ? (
              <Text style={styles.loadingText}>계좌 불러오는 중…</Text>
            ) : (
              <CardCarousel
                onIndexChange={setCurrentIndex}
                onPressAdd={handlePressAdd}
                items={accounts}
                onActiveSlideChange={({type}) => setIsAddSlideActive(type === 'add')}
                onRenameAt={handleRenameAt}
                onDeleteAt={handleDeleteAt}
              />
            )}
          </View>

          {/* CTA: 주계좌 설정 / 사용중 */}
          <View style={styles.centerWrap}>
            {!isAddSlideActive && accounts.length > 0 && (isPrimary ? (
              <View style={[styles.cta, styles.ctaMuted]}>
                <Text style={styles.ctaText}>사용중</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.cta, settingPrimary && {opacity: 0.7}]}
                onPress={onPickPrimary}
                disabled={settingPrimary}
                android_ripple={{color: 'rgba(255,255,255,0.2)'}}
                hitSlop={hit}>
                <Text style={styles.ctaText}>
                  {settingPrimary ? '설정 중…' : '주계좌 선택'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* 통계 섹션 */}
          <View style={[styles.section, styles.centerWrap]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>통계</Text>
              {!isAddSlideActive && accounts.length > 0 && (
                <Pressable onPress={() => setYmVisible(true)} hitSlop={8}>
                  <Text style={styles.sectionSub}>{ymLabel}</Text>
                </Pressable>
              )}
            </View>

            {!isAddSlideActive && accounts.length > 0 && current && (
              <>
                {statsLoading ? (
                  <Text style={styles.loadingText}>통계 불러오는 중…</Text>
                ) : (
                  <>
                    <AccountDonutChart
                      data={current.stats}
                      size={chartSize}
                      donutRadius={donutRadius}
                    />
                    <View style={styles.spacerMd} />
                    <View style={styles.legendContainer}>
                      {current.stats.map(s => (
                        <View key={s.label} style={styles.legendRow}>
                          <View style={[styles.dot, {backgroundColor: s.color}]} />
                          <Text style={styles.legendLabel}>{s.label}</Text>
                          <View style={{flex: 1}} />
                          <Text style={styles.legendVal}>{s.value}%</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* 모달은 스크롤 외부에 두어 오버레이로 표시 */}
        <YearMonthModal
          visible={ymVisible}
          year={selectedYear}
          month={selectedMonth}
          onClose={() => setYmVisible(false)}
          onConfirm={(y, m) => {
            setSelectedYear(y);
            setSelectedMonth(m);
            setYmVisible(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
