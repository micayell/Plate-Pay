// src/features/profile/screens/ProfileScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../../shared/state/authStore';
import { deleteMember } from '../../../shared/api/memberApi';
import { logout } from '../../../shared/api/authApi';

const SIDE_WIDTH = 36;

const ProfileScreen = () => {
  const { memberInfo, clearAuthData } = useAuthStore();
  const navigation = useNavigation<any>();

  if (!memberInfo) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      clearAuthData();
    } catch (error) {
      console.error('[API ERROR] Logout failed:', error);
      Alert.alert('오류', '로그아웃에 실패했습니다.');
    }
  };

  const handleDeleteMember = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            if (memberInfo) {
              try {
                await deleteMember();
                Alert.alert('탈퇴 완료', '회원 탈퇴가 완료되었습니다.');
                clearAuthData();
                // 로그인 화면으로 이동하는 로직이 필요하다면 여기에 추가
              } catch (error) {
                console.error('[API ERROR] Failed to delete member:', error);
                Alert.alert('오류', '회원 탈퇴에 실패했습니다.');
              }
            }
          },
        },
      ],
      { cancelable: false },
    );
  };

  const menuItems = [
    { label: '닉네임', value: memberInfo?.nickname, screen: 'EditNickname', params: { userInfo: memberInfo } },
    { label: '연락처', value: memberInfo?.phoneNum, screen: 'EditPhone', params: { userInfo: memberInfo } },
    { label: '결제 비밀번호', value: '******', screen: 'EditPassword', params: { userInfo: memberInfo } },
    { label: '2차 인증', value: '얼굴 인식', screen: 'FaceRecognition', params: {} },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* 헤더 */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerSide}
            onPress={() => navigation.canGoBack() && navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>내 정보</Text>

          {/* 오른쪽 균형용 빈 영역 */}
          <View style={styles.headerSide} />
        </View>

        {/* 정보 목록 */}
        <View style={styles.infoContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.infoRow}
              onPress={() => navigation.navigate(item.screen as never, item.params as never)}
            >
              <Text style={styles.label}>{item.label}</Text>
              <View style={styles.valueContainer}>
                <Text style={styles.value}>{item.value || '정보 없음'}</Text>
                <Text style={styles.arrow}>&gt;</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 버튼들 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonTextAction}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleDeleteMember}>
            <Text style={styles.buttonTextAction}>회원 탈퇴</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 40 },

  // 헤더
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  headerSide: {
    width: SIDE_WIDTH,
    height: SIDE_WIDTH,
    borderRadius: SIDE_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: '#111' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },

  // 리스트
  infoContainer: { marginTop: 20 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  label: { fontSize: 15, fontWeight: '600', color: '#AFAFAF' },
  valueContainer: { flexDirection: 'row', alignItems: 'center' },
  value: { fontSize: 15, fontWeight: '600', color: '#000000', marginRight: 15 },
  arrow: { fontSize: 15, fontWeight: '600', color: '#000000' },

  // 버튼
  buttonContainer: { marginTop: 30 },
  button: {
    backgroundColor: '#F7F7F7',
    borderRadius: 15,
    paddingVertical: 12,
    marginVertical: 5,
    paddingHorizontal: 20,
  },
  buttonTextAction: { color: '#EA0000', fontSize: 13 },

  // 로딩
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProfileScreen;
