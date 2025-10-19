import React, { useEffect, useRef } from 'react';
import { Modal, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const PRIMARY = '#0064FF';

export const DeleteModal: React.FC<Props> = ({ visible, onClose, onConfirm }) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.card, { transform: [{ scale }], opacity }]}>
          <Text style={[s.title]}>계좌 삭제</Text>
          <Text style={s.desc}>정말로 이 계좌를 삭제할까요? 이 작업은 되돌릴 수 없습니다.</Text>

          <View style={s.row}>
            <Pressable style={[s.btn, s.btnGhost]} onPress={onClose}>
              <Text style={s.btnGhostText}>취소</Text>
            </Pressable>
            <Pressable style={[s.btn, s.btnDanger]} onPress={onConfirm}>
              <Text style={s.btnDangerText}>삭제</Text>
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
    paddingVertical: 24, // 내부 여백
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  desc: { marginTop: 12, fontSize: 14, lineHeight: 20, color: '#6B7280' },
  row: { flexDirection: 'row', gap: 10, marginTop: 28 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10 },
  btnDanger: { backgroundColor: '#B91C1C', borderWidth: 1, borderColor: '#B91C1C' },
  btnDangerText: { color: '#ffffff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  btnGhostText: { color: '#374151', fontWeight: '700' },
});
