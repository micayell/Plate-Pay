// src/features/wallet/components/modals/RenameModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
};

const PRIMARY = '#0064FF';

export const RenameModal: React.FC<Props> = ({ visible, initialName, onClose, onConfirm }) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [nickname, setNickname] = useState(initialName);

  useEffect(() => setNickname(initialName), [initialName]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.9, duration: 140, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.card, { transform: [{ scale }], opacity }]}>
          <Text style={s.title}>별명 변경</Text>
          <Text style={s.desc}>계좌의 별명을 수정하세요.</Text>

          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="새 별명"
            placeholderTextColor="#9CA3AF"
            style={s.input}
          />

          <View style={s.row}>
            <Pressable style={[s.btn, s.btnGhost]} onPress={onClose}>
              <Text style={s.btnGhostText}>취소</Text>
            </Pressable>
            <Pressable style={[s.btn, s.btnPrimary]} onPress={() => onConfirm(nickname.trim())}>
              <Text style={s.btnPrimaryText}>저장</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  desc: { marginTop: 12, fontSize: 14, lineHeight: 20, color: '#6B7280' },
  input: {
    marginTop: 20,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10 },
  btnPrimary: { backgroundColor: PRIMARY },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700' },
  btnGhost: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  btnGhostText: { color: '#374151', fontWeight: '700' },
});
