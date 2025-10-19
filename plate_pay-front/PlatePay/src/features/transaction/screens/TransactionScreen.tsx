// src/features/transaction/screens/TransactionScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import TransactionItem from '../components/TransactionItem';
import TransactionDetailModal from '../components/TransactionDetailModal';
import {
  getLastWeekOrderHistories,
  type LastWeekOrderHistory,
} from '../api/transaction';
import AppHeader from '../../../shared/ui/AppHeader';
import { useAuthStore } from '../../../shared/state/authStore';
type SectionRow = {
  id: string;
  store: string;
  amount: number;
  type: string; // '주차'
  address?: string;
  datetime?: string;
  accountName?: string;
  carNumber?: string;
  breakdown?: { item: string; type: string; amount: number }[];
};

type Section = { title: string; data: SectionRow[] };

// 날짜 유틸
const toDate = (outTime: number[]) => {
  const [y, m, d, hh = 0, mm = 0, ss = 0] = outTime ?? [];
  return new Date(y, (m || 1) - 1, d, hh, mm, ss);
};
const formatKDateTitle = (date: Date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const yoil = date.toLocaleDateString('ko-KR', { weekday: 'long' });
  return `${month}월 ${day}일 ${yoil}`;
};
const formatDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
};
const maskAccount = (no?: string) => {
  if (!no) return '';
  const last4 = no.slice(-4);
  return `· ${last4}`;
};

export default function TransactionScreen() {
  const navigation = useNavigation();
  const { accessToken, isLoggedIn, memberInfo } = useAuthStore();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<SectionRow | null>(null);

  const buildSections = useCallback(
    (list: LastWeekOrderHistory[]): Section[] => {
      const map = new Map<string, SectionRow[]>();

      list.forEach(row => {
        const date = toDate(row.outTime);
        const key = formatKDateTitle(date);

        const detailBreakdown = (row.orders ?? []).map(o => ({
          item: o.storeName,
          type: '쇼핑',
          amount: o.cost ?? 0,
        }));

        const dataRow: SectionRow = {
          id: String(row.inOutHistoryId),
          store: row.parkingLotName ?? '주차장',
          amount: row.totalCost ?? 0,
          type: '주차',
          address: row.address,
          datetime: formatDateTime(date),
          accountName: `${row.bankName ?? ''} ${maskAccount(
            row.accountNo,
          )}`.trim(),
          carNumber: row.plateNum,
          breakdown: detailBreakdown,
        };

        const arr = map.get(key) ?? [];
        arr.push(dataRow);
        map.set(key, arr);
      });

      // 날짜 최신순
      const titles = Array.from(map.keys());
      titles.sort((a, b) => {
        const firstA = map.get(a)?.[0]?.datetime ?? '';
        const firstB = map.get(b)?.[0]?.datetime ?? '';
        return firstB.localeCompare(firstA);
      });

      return titles.map(title => ({ title, data: map.get(title) ?? [] }));
    },
    [],
  );

  const load = useCallback(async () => {
    console.log('🚀 [Transaction] 거래 내역 로딩 시작');
    console.log('  - 로그인 상태:', isLoggedIn);
    console.log('  - 액세스 토큰 존재:', !!accessToken);
    console.log('  - 회원 정보:', memberInfo?.memberUid);

    setLoading(true);
    setError(null);

    // 인증 상태 체크
    if (!isLoggedIn || !accessToken) {
      console.error('❌ [Transaction] 인증 정보 없음');
      setError('로그인이 필요합니다.');
      setLoading(false);
      return;
    }

    try {
      const res = await getLastWeekOrderHistories();
      console.log('📊 [Transaction] 데이터 변환 시작, 원본 데이터 개수:', res.length);
      const secs = buildSections(res);
      console.log('📋 [Transaction] 섹션 생성 완료:', secs.length, '개 섹션');
      setSections(secs);
    } catch (e: any) {
      console.error('❌ [Transaction] 거래 조회 실패:');
      console.error('  - Error:', e);
      console.error('  - Response status:', e?.response?.status);
      console.error('  - Response data:', e?.response?.data);
      console.error('  - Message:', e?.message);

      setError('거래 내역을 불러오지 못했습니다.');
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [buildSections, isLoggedIn, accessToken, memberInfo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await getLastWeekOrderHistories();
      const secs = buildSections(res);
      setSections(secs);
    } catch {
      setError('새로고침에 실패했습니다.');
    } finally {
      setRefreshing(false);
    }
  }, [buildSections]);

  useEffect(() => {
    load();
  }, [load]);

  const handleItemPress = (item: SectionRow) => {
    setSelectedTransaction(item);
    setModalVisible(true);
  };

  const listHeader = useMemo(() => {
    if (loading) {
      return (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator />
        </View>
      );
    }
    if (error) {
      return (
        <Text
          style={{
            color: '#EF4444',
            paddingHorizontal: 20,
            paddingVertical: 8,
          }}
        >
          {error}
        </Text>
      );
    }
    return null;
  }, [loading, error]);

  // ✅ 비어있는 경우(데이터 0건) 안내 뷰
  const isTrulyEmpty = useMemo(
    () =>
      sections.length === 0 || sections.every(s => (s.data?.length ?? 0) === 0),
    [sections],
  );

  const emptyComponent = useMemo(() => {
    if (loading || error) return null; // 로딩/에러일 땐 빈 컴포넌트 숨김
    return (
      <View style={styles.emptyWrap}>
        <Icon name="receipt-outline" size={48} color="#C5C5C5" />
        <Text style={styles.emptyTitle}>거래 정보가 없어요</Text>
        <Text style={styles.emptyDesc}>
          최근 일주일 간 거래 내역이 없습니다.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={onRefresh}>
          <Text style={styles.emptyBtnText}>새로고침</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, error, onRefresh]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="최근 거래 내역"
        rightType="profile"
        rightNavigateTo="ProfileStack"
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('MonthlyTransaction' as never)}
        >
          <Text style={styles.buttonText}>월별 내역</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            store={item.store}
            amount={item.amount}
            type={item.type}
            onPress={() => handleItemPress(item)}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyComponent} // ✅ 여기!
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 12,
          // ✅ 비었을 때 중앙 정렬되도록
          flexGrow: isTrulyEmpty ? 1 : 0,
        }}
      />

      {selectedTransaction && (
        <TransactionDetailModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          transaction={{
            store: selectedTransaction.store,
            amount: selectedTransaction.amount,
            type: selectedTransaction.type,
            address: selectedTransaction.address,
            datetime: selectedTransaction.datetime,
            accountName: selectedTransaction.accountName,
            carNumber: selectedTransaction.carNumber,
            breakdown: selectedTransaction.breakdown,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000000' },
  buttonContainer: { paddingVertical: 12, alignItems: 'center' },
  button: {
    backgroundColor: '#0064FF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  sectionHeader: {
    paddingHorizontal: 21,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#C5C5C5',
    backgroundColor: '#FFFFFF',
  },

  // ✅ 빈 상태 스타일
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    gap: 10,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 13,
  },
});
