// src/features/wallet/components/CardCarousel.tsx
import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Text,
} from 'react-native';
import * as WalletCardMod from './WalletCard';
import {useResponsive} from '../../../shared/ui/responsive';

const WalletCard: any =
  (WalletCardMod as any)?.WalletCard ?? (WalletCardMod as any)?.default;

type AccountItem = {
  accountId?: number;
  title: string;
  owner: string;
  last4: string;
  gradient: string[];
};

type Props = {
  onIndexChange?: (idx: number) => void;
  onPressAdd?: () => void;
  items?: AccountItem[]; // ✅ 부모가 []를 넘기면 내부 더미 사용 안 함
  onActiveSlideChange?: (info: {index: number; type: 'account' | 'add'}) => void;
  onRenameAt?: (index: number, nextAlias: string) => void;
  onDeleteAt?: (index: number) => void;
};

export const CardCarousel: React.FC<Props> = ({
  onIndexChange,
  onPressAdd,
  items: externalItems,
  onActiveSlideChange,
  onRenameAt,
  onDeleteAt,
}) => {
  const {s, bp} = useResponsive();

  React.useEffect(() => {
    try {
      console.log('[CardCarousel] WalletCard exports =', Object.keys(WalletCardMod || {}));
      console.log('[CardCarousel] WalletCard typeof  =', typeof WalletCard);
    } catch {}
  }, []);

  const screenWidth = Dimensions.get('window').width || 375;
  const cardWidth = bp === 'tablet' ? s(320) || 320 : s(280) || 280;
  const cardHeight = bp === 'tablet' ? s(200) || 200 : s(170) || 170;
  const cardGap = s(16) || 16;
  const sidePadding = Math.max(0, (screenWidth - cardWidth) / 2);
  const snap = Math.max(1, cardWidth + cardGap);
  const radius = s(20) || 20;

  // ✅ 부모가 준 리스트를 그대로 사용 (undefined일 때만 예시 더미 적용 가능)
  const baseItems: AccountItem[] = externalItems ?? [];

  const accounts = baseItems.slice(0, 4);
  const showAddCard = accounts.length < 3; // 0일 때도 true
  const totalSlides = accounts.length + (showAddCard ? 1 : 0);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset?.x ?? 0;
    const raw = Math.round((x - sidePadding) / snap);
    const slideIdx = Math.max(0, Math.min(totalSlides - 1, raw));

    const isAdd = showAddCard && slideIdx === totalSlides - 1;
    const effectiveIdx = Math.min(slideIdx, Math.max(0, accounts.length - 1));

    // ✅ 계좌가 0개면 onIndexChange 호출 안 함
    if (accounts.length > 0) {
      onIndexChange?.(Math.max(0, effectiveIdx));
    }

    onActiveSlideChange?.({
      index: accounts.length > 0 ? (isAdd ? effectiveIdx : slideIdx) : 0,
      type: isAdd || accounts.length === 0 ? 'add' : 'account',
    });
  };

  const isWalletCardUsable =
    WalletCard && (typeof WalletCard === 'function' || typeof WalletCard === 'object');

  return (
    <View style={{height: cardHeight + (s(10) || 10)}}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snap}
        snapToAlignment="start"
        contentContainerStyle={{paddingLeft: sidePadding, paddingRight: sidePadding}}
        onMomentumScrollEnd={onMomentumEnd}
        keyboardShouldPersistTaps="handled">
        {/* ✅ 계좌가 0개면 이 블록은 렌더링 안 됨 */}
        {accounts.map((it, idx) => (
          <View
            key={`acc-${it.accountId ?? idx}`}
            style={{marginRight: idx === totalSlides - 1 ? 0 : cardGap}}>
            {isWalletCardUsable ? (
              <WalletCard
                {...it}
                size={{width: cardWidth, height: cardHeight}}
                onRename={(name: string) => onRenameAt?.(idx, name)}
                onDelete={() => onDeleteAt?.(idx)}
              />
            ) : (
              <View
                style={[
                  styles.addCard,
                  {width: cardWidth, height: cardHeight, borderRadius: radius, backgroundColor: '#E5E7EB'},
                ]}>
                <Text style={{color: '#111827', fontWeight: '700'}}>WalletCard undefined</Text>
                <Text style={{color: '#6B7280', fontSize: 12, marginTop: 4}}>
                  check export/import or native link
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* ✅ 추가 카드: 계좌 0개면 이 카드만 보임 */}
        {showAddCard && (
          <View key="add-card" style={{marginRight: 0}}>
            <Pressable
              onPress={onPressAdd}
              android_ripple={{color: 'rgba(0,0,0,0.06)', borderless: false}}
              style={[styles.addCard, {width: cardWidth, height: cardHeight, borderRadius: radius}]}>
              <View style={styles.addInner}>
                <Text style={styles.addPlus}>+</Text>
                <Text style={styles.addLabel}>계좌 등록하기</Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  addCard: {
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  addInner: {alignItems: 'center', justifyContent: 'center'},
  addPlus: {fontSize: 28, lineHeight: 32, color: '#6B7280', fontWeight: '700', marginBottom: 6},
  addLabel: {fontSize: 13, color: '#6B7280', fontWeight: '600'},
});
