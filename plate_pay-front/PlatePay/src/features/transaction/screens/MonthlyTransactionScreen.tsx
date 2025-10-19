import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../../shared/ui/AppHeader'; // 공통 헤더 사용
import {
  getMonthlyOrderHistories,
  MonthlyHistoryItem,
} from '../api/transaction';

// react-native-calendars 한글 설정
LocaleConfig.locales['kr'] = {
  monthNames: [
    '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월',
  ],
  monthNamesShort: [
    '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월',
  ],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'kr';


// ✅ [추가] 피그마 디자인에 맞는 새로운 거래 내역 아이템 컴포넌트
const MonthlyTransactionItem = ({ store, amount }) => (
  <View style={styles.itemContainer}>
    <View style={styles.itemIconCircle}>
      <Text style={styles.itemIconText}>₩</Text>
    </View>
    <Text style={styles.itemStoreText}>{store}</Text>
    <Text style={styles.itemAmountText}>{amount.toLocaleString('ko-KR')}원</Text>
  </View>
);

// ✅ [추가] 피그마 디자인에 맞는 커스텀 날짜 컴포넌트
const CustomDay = ({ date, state, marking, onPress, totalAmount, isToday }) => {
  const isSelected = marking?.selected;
  const isMarked = marking?.marked;

  return (
    <TouchableOpacity
      onPress={() => onPress(date)}
      style={styles.dayContainer}
      disabled={!isMarked && !isToday} // ✅ 오늘 날짜는 거래내역 없어도 클릭 가능
    >
      {/* ✅ [수정] 오늘 날짜일 경우 별도의 배경 스타일을 적용 */}
      <View
        style={[
          styles.dayCircle,
          isSelected && styles.selectedDayCircle,
          isToday && !isSelected && styles.todayCircle, // 오늘이지만 선택되지 않았을 때
        ]}
      >
        <Text
          style={[
            styles.dayText,
            state === 'disabled' && styles.disabledDayText,
            isSelected && styles.selectedDayText,
            isToday && !isSelected && styles.todayText, // 오늘이지만 선택되지 않았을 때
          ]}
        >
          {date.day}
        </Text>
      </View>
      {isMarked && (
        <Text style={styles.dayTotalText}>
          {totalAmount.toLocaleString('ko-KR')}
        </Text>
      )}
    </TouchableOpacity>
  );
};


export default function MonthlyTransactionScreen() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [transactions, setTransactions] = useState<Record<string, MonthlyHistoryItem[]>>({});
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(async (dateToFetch: Date) => {
    setIsLoading(true);
    const year = dateToFetch.getFullYear();
    const month = dateToFetch.getMonth() + 1;
    const data = await getMonthlyOrderHistories(year, month);
    setTransactions(data);

    const totals: Record<string, number> = {};
    for (const date in data) {
      totals[date] = data[date].reduce(
        (sum, item) => sum + item.totalCost,
        0,
      );
    }
    setDailyTotals(totals);

    // ✅ [추가] 데이터 로드 후, 거래내역이 있는 첫 날을 자동으로 선택
    const firstTransactionDay = Object.keys(data)[0];
    if (firstTransactionDay) {
      setSelectedDate(firstTransactionDay);
    } else {
      setSelectedDate(''); // 데이터 없으면 선택 해제
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions(currentMonth);
  }, [currentMonth, fetchTransactions]);

  const markedDates = useMemo(() => {
    const marks: { [key: string]: any } = {};
    Object.keys(transactions).forEach(date => {
      marks[date] = { marked: true };
    });
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
      };
    }
    return marks;
  }, [selectedDate, transactions]);
  
  const sections = useMemo(() => {
    const transactionsForDate = transactions[selectedDate] || [];
    if (transactionsForDate.length === 0) return [];
    
    const sectionData = transactionsForDate.map(item => ({
      id: String(item.inOutHistoryId),
      store: item.parkingLotName,
      amount: item.totalCost,
    }));
    return [{ title: selectedDate, data: sectionData }];
  }, [selectedDate, transactions]);

  const handleMonthChange = (isNext: boolean) => {
    const newMonth = new Date(currentMonth);
    newMonth.setDate(1);
    newMonth.setMonth(newMonth.getMonth() + (isNext ? 1 : -1));
    setCurrentMonth(newMonth);
  };
  
  const onDayPress = (day: DateData) => {
    // ✅ [수정] 거래내역이 없어도 오늘 날짜는 선택 가능하도록 변경
    if (transactions[day.dateString] || day.dateString === new Date().toISOString().split('T')[0]) {
      setSelectedDate(day.dateString);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ [수정] leftType="back" 속성을 추가하여 뒤로가기 버튼을 표시합니다. */}
      <AppHeader
        title="월별 거래 내역"
        leftType="back"
        rightType="profile"
        rightNavigateTo="ProfileStack"
      />

      <Calendar
        // ✅ [수정] renderHeader를 제거하여 라이브러리 기본 월/년 표시방식을 사용합니다.
        // 이렇게 해야 월을 넘길 때 날짜들이 정상적으로 업데이트 됩니다.
        renderHeader={undefined}
        dayComponent={({ date, state, marking }) => {
          // ✅ [추가] 오늘 날짜인지 여부를 계산해서 prop으로 전달
          const todayString = new Date().toISOString().split('T')[0];
          const isToday = date.dateString === todayString;

          return (
            <CustomDay
              date={date}
              state={state}
              marking={marking}
              onPress={onDayPress}
              totalAmount={dailyTotals[date.dateString] || 0}
              isToday={isToday}
            />
          );
        }}
        markedDates={markedDates}
        onMonthChange={month => setCurrentMonth(new Date(month.dateString))}
        hideExtraDays={true}
        theme={{
          // ✅ [수정] 피그마 디자인에 맞게 테마를 재설정합니다.
          // 월/년 텍스트 스타일
          monthTextColor: '#0F172A',
          textMonthFontSize: 18,
          textMonthFontWeight: '600',
          // 요일 텍스트 스타일
          textSectionTitleColor: '#64748B',
          textDayHeaderFontSize: 12,
          textDayHeaderFontWeight: '500',
          // 화살표 색상
          arrowColor: '#0F172A',
          // 달력 배경 제거
          calendarBackground: 'transparent',
        }}
      />
      
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 50 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MonthlyTransactionItem {...item} />}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{formatDate(title)}</Text>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                거래 내역이 있는 날짜를 선택해주세요.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const weekday = LocaleConfig.locales['kr'].dayNames[date.getDay()];
  return `${day}일 ${weekday}`;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  // ❌ renderHeader를 사용하지 않으므로 calendarHeader 스타일은 제거해도 됩니다.
  // calendarHeader: { ... },
  // calendarMonthText: { ... },
  dayContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: 60,
  },
  dayCircle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  selectedDayCircle: {
    backgroundColor: '#0064FF',
  },
  // ✅ [추가] 오늘 날짜를 위한 스타일
  todayCircle: {
    borderColor: '#0064FF',
    borderWidth: 1,
  },
  dayText: {
    fontSize: 15,
    color: '#0F172A',
  },
  disabledDayText: {
    color: '#CBD5E1',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // ✅ [추가] 오늘 날짜 텍스트를 위한 스타일
  todayText: {
    color: '#0064FF',
    fontWeight: 'bold',
  },
  dayTotalText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  sectionHeader: {
    paddingTop: 24,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#FFFFFF',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0064FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemStoreText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
});
