import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSearch?: (searchText: string, type?: string) => void; // ✅ type 함께 전달
};

// 화면에 보여줄 카테고리 라벨
const CATEGORIES = ['마트', '편의점', '식당', '카페', '병원', '약국'] as const;
// API에 보낼 타입 매핑
const TYPE_MAP: Record<(typeof CATEGORIES)[number], string> = {
  마트: 'MART',
  편의점: 'CONVENIENCE_STORE',
  식당: 'RESTAURANT',
  카페: 'CAFE',
  병원: 'HOSPITAL',
  약국: 'PHARMACY',
};

export default function SearchOverlay({
  visible,
  onClose,
  onSearch,
}: Props) {
  const [selected, setSelected] = useState<(typeof CATEGORIES)[number]>('마트');
  const [searchText, setSearchText] = useState<string>('');

  const select = (c: (typeof CATEGORIES)[number]) => setSelected(c);

  const handleSearch = (text?: string) => {
    const t = (text ?? searchText).trim();
    if (t.length === 0) return;
    const type = TYPE_MAP[selected]; // ✅ 선택 카테고리를 type으로 변환
    onSearch?.(t, type);
  };

  const suggestions = useMemo(() => {
    if (!searchText.trim()) return [] as string[];
    return Array.from({ length: 15 }, () => searchText.trim());
  }, [searchText]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      hardwareAccelerated
      statusBarTranslucent={Platform.OS === 'android'}
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
      onRequestClose={onClose}
    >
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onClose} hitSlop={8}>
            <Icon name="arrow-left" size={20} color="#111" />
          </Pressable>

          <TextInput
            style={styles.searchInput}
            placeholder="제휴 매장을 찾아보세요"
            placeholderTextColor="#B0B3B8"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoFocus={false}
          />

          <Pressable style={styles.headerBtn} onPress={() => handleSearch()} hitSlop={8}>
            <Icon name="search" size={20} color="#111" solid />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsWrap}
        >
          {CATEGORIES.map((c) => {
            const active = c === selected;
            return (
              <Pressable
                key={c}
                onPress={() => select(c)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* <FlatList
          data={suggestions}
          keyExtractor={(_, idx) => `${idx}`}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <Pressable style={styles.suggestRow} onPress={() => handleSearch(item)}>
              <View style={styles.suggestIconWrap}>
                <Icon name="search" size={14} color="#7A7A7A" />
              </View>
              <Text style={styles.suggestText} numberOfLines={1}>
                {item}
              </Text>
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>검색어를 입력하면 제안이 표시됩니다</Text>
            </View>
          }
        /> */}
      </View>
    </Modal>
  );
}

const TOP = Platform.select({ android: StatusBar.currentHeight ?? 0, ios: 0 }) || 0;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingTop: TOP,
    height: 56 + TOP,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111',
    paddingHorizontal: 8,
    height: 40,
  },

  chipsWrap: { paddingHorizontal: 12, paddingVertical: 12 },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { fontSize: 13, color: '#111' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  listContent: { paddingBottom: 16 },
  suggestRow: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  sep: { height: 1, backgroundColor: '#EFEFEF' },

  suggestIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E3E3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestText: { flex: 1, fontSize: 16, color: '#111' },

  empty: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
});
