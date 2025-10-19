import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, TextStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

type Props = {
  title?: string;
  /** 기본: plain(높이 56). tall(높이 150, Wallet 스타일) */
  variant?: 'plain' | 'tall';
  /** 좌측 영역: 'back' | 'none' */
  leftType?: 'back' | 'none';
  /** 우측 영역: 'profile' | 'none' */
  rightType?: 'profile' | 'none';
  /** 좌우 버튼 콜백/네비게이션 */
  onBackPress?: () => void;
  onRightPress?: () => void;
  /** 우측 프로필 아이콘 눌렀을 때 이동할 라우트(없으면 onRightPress 사용) */
  rightNavigateTo?: string;

  /** 스타일 오버라이드 */
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;

  /** 배경/구분선 옵션 */
  backgroundColor?: string;     // 기본 white
  border?: boolean;             // plain 헤더 하단 1px 보더
};

export default function AppHeader({
  title,
  variant = 'plain',
  leftType = 'none',
  rightType = 'none',
  onBackPress,
  onRightPress,
  rightNavigateTo,
  containerStyle,
  titleStyle,
  backgroundColor = '#FFFFFF',
  border = variant === 'plain',
}: Props) {
  const navigation = useNavigation<any>();
  const isTall = variant === 'tall';

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    if (navigation.canGoBack()) navigation.goBack();
  };

  const handleRight = () => {
    if (onRightPress) return onRightPress();
    if (rightNavigateTo) navigation.navigate(rightNavigateTo as never);
  };

  return (
    <View
      style={[
        styles.container,
        isTall ? styles.tall : styles.plain,
        { backgroundColor },
        border && !isTall ? styles.border : null,
        containerStyle,
      ]}
    >
      {/* Left */}
      <View style={styles.side}>
        {leftType === 'back' ? (
          <Pressable
            style={styles.iconBtn}
            onPress={handleBack}
            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
            hitSlop={8}
          >
            <Icon name="chevron-back" size={22} color="#111" />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {/* Title */}
      <View style={styles.middle}>
        {!!title && <Text style={[styles.title, titleStyle]} numberOfLines={1}>{title}</Text>}
      </View>

      {/* Right */}
      <View style={styles.side}>
        {rightType === 'profile' ? (
          <Pressable
            style={styles.iconBtn}
            onPress={handleRight}
            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
            hitSlop={8}
          >
            <Icon name="person" size={24} color="#333" />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  plain: { height: 56 },
  tall:  { height: 150, paddingTop: 12, paddingBottom: 5 },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFEF',
  },
  side: { width: 40, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
});
