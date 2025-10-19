import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getPendingOrderHistory } from '../../../shared/api/orderApi';
import { Account, PendingOrderHistory } from '../../../types/type';
import AppHeader from '../../../shared/ui/AppHeader';
import { getAccountsOnce } from '../../wallet/api/accountApi';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [pendingOrder, setPendingOrder] = useState<PendingOrderHistory | null>(
    null,
  );
  const [mainAccount, setMainAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 두 API를 동시에 호출하여 홈 화면 로딩 속도 최적화
      const [pendingOrderResult, accountsResult] = await Promise.allSettled([
        getPendingOrderHistory(),
        getAccountsOnce({ force: true }), // 화면 진입 시 항상 최신 계좌 정보
      ]);

      // 1. 미결제 내역 결과 처리
      if (pendingOrderResult.status === 'fulfilled') {
        setPendingOrder(pendingOrderResult.value);
      } else {
        // 404 (내역 없음) 등은 에러가 아니므로 null 처리
        if (pendingOrderResult.reason?.response?.status !== 200) {
          setPendingOrder(null);
        } else {
          console.error(
            'Failed to fetch pending order history:',
            pendingOrderResult.reason,
          );
          // 부분 실패이므로 전체 에러 메시지는 띄우지 않음
        }
      }

      // 2. 계좌 목록 결과 처리
      if (accountsResult.status === 'fulfilled') {
        const main = accountsResult.value.find(acc => acc.main);
        setMainAccount(main || null);
      } else {
        console.error('Failed to fetch accounts:', accountsResult.reason);
        setMainAccount(null);
      }
    } catch (e) {
      // Promise.allSettled는 거의 실패하지 않지만, 만약을 대비한 에러 처리
      setError('데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, []),
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ko-KR').format(amount) + '원';

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      );
    }

    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    const hasPendingOrder =
      !!pendingOrder && !!pendingOrder.orders && pendingOrder.orders.length > 0;

    return (
      <>
        {/* ===== 주문 중 박스 ===== */}
        <View style={styles.section}>
          {hasPendingOrder ? (
            <View style={styles.ordersBox}>
              <View style={styles.ordersHeaderRow}>
                <Text style={styles.ordersTitle}>주문 중</Text>
                <Text style={styles.parkingName}>
                  {pendingOrder!.parkingLotName}
                </Text>
              </View>
              {pendingOrder!.orders.map(order => (
                <TouchableOpacity
                  key={order.orderHistoryId}
                  activeOpacity={0.85}
                  style={styles.orderItem}
                >
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                    <Text style={styles.orderStore} numberOfLines={2} ellipsizeMode="tail">
                      {order.storeName}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderPrice}>
                      {formatCurrency(order.cost)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>총액</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(pendingOrder!.totalCost)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.ordersBox}>
              <View style={styles.ordersHeaderRow}>
                <Text style={styles.ordersTitle}>주문 중</Text>
                <Text style={styles.parkingName}>—</Text>
              </View>
              <View style={[styles.orderItem, { justifyContent: 'center' }]}>
                <Text style={styles.emptyText}>주문 내역이 없습니다.</Text>
              </View>
            </View>
          )}
        </View>

        {/* ===== 결제 계좌 ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 계좌</Text>
          {mainAccount ? (
            <TouchableOpacity
              style={[styles.card, styles.rowBetween]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('WalletStack')}
            >
              <View style={styles.row}>
                <View style={styles.bankIcon} />
                <View>
                  <Text style={styles.bankName}>{mainAccount.bankName}</Text>
                  <Text style={styles.accountNumber}>
                    {mainAccount.accountNo}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={20} color="#8E8E93" />
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              <Text style={styles.text}>등록된 주계좌가 없습니다.</Text>
            </View>
          )}
        </View>

        {/* ===== 결제 차량 ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 차량</Text>
          {pendingOrder ? (
            <View style={[styles.card, styles.rowBetween]}>
              <Text style={styles.carNumber}>{pendingOrder.plateNum}</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.text}>
                진행중인 결제가 없어 표시할 차량이 없습니다.
              </Text>
            </View>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="홈" rightType="profile" rightNavigateTo="ProfileStack" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles... (기존 스타일 유지)
const CARD_BG = '#FFFFFF';
const CHIP_BG = '#F3F4F6';
const BORDER = '#E5E7EB';
const TITLE = '#0F172A';
const SUB = '#8E8E93';
const PRICE = '#0B1020';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContent: { padding: 16 },
  section: { marginTop: 24 },
  ordersBox: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  ordersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
  },
  ordersTitle: { fontSize: 16, fontWeight: '700', color: TITLE },
  parkingName: { fontSize: 12, color: SUB },
  orderItem: {
    backgroundColor: CHIP_BG,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 55,
  },
  orderStore: {
    fontSize: 15,
    fontWeight: '700',
    color: TITLE,
    lineHeight: 20,
    flexShrink: 1,
  },
  orderPrice: { fontSize: 15, fontWeight: '700', color: PRICE },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 12,
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: TITLE },
  totalValue: { fontSize: 16, fontWeight: '800', color: PRICE },
  emptyText: { color: SUB, fontSize: 13 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  text: { fontSize: 14, color: '#555' },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { justifyContent: 'space-between' },
  bankIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  bankName: { fontSize: 16, fontWeight: '500', color: '#000' },
  accountNumber: { fontSize: 12, color: SUB, marginTop: 5 },
  carNumber: { fontSize: 16, fontWeight: '500', color: '#000' },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    color: 'red',
    fontSize: 16,
  },
});
