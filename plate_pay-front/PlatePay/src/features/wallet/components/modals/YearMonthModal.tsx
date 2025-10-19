import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, FlatList } from 'react-native';

type Props = {
  visible: boolean;
  year: number;
  month: number; // 1~12
  onClose: () => void;
  onConfirm: (nextYear: number, nextMonth: number) => void;
  startYear?: number; // 기본: year-5
  endYear?: number;   // 기본: year+5
};

export const YearMonthModal: React.FC<Props> = ({
  visible, year, month, onClose, onConfirm, startYear, endYear,
}) => {
  const defaultStart = year - 5;
  const defaultEnd = year + 5;

  const years = useMemo(() => {
    const s = startYear ?? defaultStart;
    const e = endYear ?? defaultEnd;
    const arr: number[] = [];
    for (let y = e; y >= s; y--) arr.push(y); // 최근 연도부터 내림차순
    return arr;
  }, [year, startYear, endYear]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const [y, setY] = useState(year);
  const [m, setM] = useState(month);

  useEffect(() => { if (visible) { setY(year); setM(month); } }, [visible, year, month]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet} accessibilityLabel="년월 선택">
          <Text style={s.title}>년/월 선택</Text>

          <View style={s.columns}>
            {/* Year column */}
            <View style={s.column}>
              <Text style={s.colTitle}>연도</Text>
              <FlatList
                data={years}
                keyExtractor={(item) => `y-${item}`}
                style={s.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setY(item)}
                    style={[s.item, y === item && s.itemActive]}
                  >
                    <Text style={[s.itemText, y === item && s.itemTextActive]}>{item}</Text>
                  </Pressable>
                )}
              />
            </View>

            {/* Month column */}
            <View style={s.column}>
              <Text style={s.colTitle}>월</Text>
              <FlatList
                data={months}
                keyExtractor={(item) => `m-${item}`}
                style={s.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setM(item)}
                    style={[s.item, m === item && s.itemActive]}
                  >
                    <Text style={[s.itemText, m === item && s.itemTextActive]}>
                      {String(item).padStart(2, '0')}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </View>

          <View style={s.row}>
            <Pressable style={[s.btn, s.btnGhost]} onPress={onClose}>
              <Text style={s.btnGhostText}>취소</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnPrimary]}
              onPress={() => onConfirm(y, m)}
            >
              <Text style={s.btnPrimaryText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PRIMARY = '#0064FF';

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  sheet: {
    width: '100%', maxWidth: 360, borderRadius: 16, backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  columns: { flexDirection: 'row', gap: 12, marginTop: 12 },
  column: { flex: 1 },
  colTitle: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  list: { maxHeight: 220, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10 },
  item: { paddingVertical: 10, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEE' },
  itemActive: { backgroundColor: '#EFF6FF' },
  itemText: { fontSize: 15, color: '#111827' },
  itemTextActive: { color: PRIMARY, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10 },
  btnGhost: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  btnGhostText: { color: '#374151', fontWeight: '700' },
  btnPrimary: { backgroundColor: PRIMARY },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700' },
});
