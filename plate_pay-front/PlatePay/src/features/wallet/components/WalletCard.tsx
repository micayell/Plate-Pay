// src/features/wallet/components/WalletCard.tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useResponsive } from '../../../shared/ui/responsive';
import { RenameModal } from './modals/RenameModal';
import { DeleteModal } from './modals/DeleteModal';

type Size = { width: number; height: number };
type Props = {
  title: string; owner: string; last4: string; gradient: string[]; size?: Size;
  onRename?: (nextAlias: string) => void; // 별명 변경 확정 시 상위 콜백
  onDelete?: () => void;                  // 계좌 삭제 확정 시 상위 콜백
};

const round = (n: number) => Math.max(0, Math.round(n || 0));

export const WalletCard: React.FC<Props> = ({
  title, owner, last4, gradient, size, onRename, onDelete,
}) => {
  const { fs, s, bp } = useResponsive();

  // 모달 표시 상태
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fallbackW = bp === 'tablet' ? s(320) : s(280);
  const fallbackH = bp === 'tablet' ? s(200) : s(170);
  const width  = round(size?.width ?? fallbackW);
  const height = round(size?.height ?? fallbackH);

  const pad = round(s(16));
  const radius = round(s(20));

  const safeGradient = Array.isArray(gradient) && gradient.length ? gradient : ['#0F172A', '#111827'];

  return (
    <>
      <LinearGradient
        colors={safeGradient}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={[
          styles.card,
          {
            width,
            height,
            // 하단 밀착
            paddingTop: pad,
            paddingHorizontal: pad,
            paddingBottom: 0,
            borderRadius: radius,
          },
        ]}
      >
        {/* 상단 */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { fontSize: round(fs(20)) }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.owner, { fontSize: round(fs(13)) }]} numberOfLines={1}>{owner}</Text>
        </View>

        {/* 카드번호 */}
        <View style={styles.numberWrap}>
          <Text style={[styles.dots, { fontSize: round(fs(16)), marginRight: 12 }]}>****</Text>
          <Text style={[styles.dots, { fontSize: round(fs(16)), marginRight: 12 }]}>****</Text>
          <Text style={[styles.dots, { fontSize: round(fs(16)), marginRight: 12 }]}>****</Text>
          <Text style={[styles.last4, { fontSize: round(fs(16)) }]}>{last4}</Text>
        </View>

        {/* 하단 버튼 (하단 밀착) */}
        <View style={styles.footerRow}>
          <Pressable
            style={[styles.footerBtn, styles.footerBtnLeft]}
            onPress={() => setShowRename(true)}
            android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
          >
            <Text style={[styles.footerText, { fontSize: round(fs(12)) }]}>별명 변경</Text>
          </Pressable>
          <Pressable
            style={styles.footerBtn}
            onPress={() => setShowDelete(true)}
            android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
          >
            <Text style={[styles.footerText, { fontSize: round(fs(12)) }]}>계좌 삭제</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* 모달 적용 */}
      <RenameModal
        visible={showRename}
        initialName={title}
        onClose={() => setShowRename(false)}
        onConfirm={(nextAlias) => {
          setShowRename(false);
          const trimmed = nextAlias.trim();
          if (trimmed) onRename?.(trimmed);
        }}
      />
      <DeleteModal
        visible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          setShowDelete(false);
          onDelete?.();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: 'white', fontWeight: '700', maxWidth: '70%' },
  owner: { color: 'white', opacity: 0.95, fontWeight: '700', maxWidth: '28%', textAlign: 'right' },
  numberWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dots: { color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 2 },
  last4: { color: 'rgba(255,255,255,0.95)', fontWeight: '700', letterSpacing: 2 },

  // 하단과 완전히 붙도록 margin 없이
  footerRow: { flexDirection: 'row' },
  footerBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  footerBtnLeft: {},
  footerText: { color: 'white', fontWeight: '700' },
});
