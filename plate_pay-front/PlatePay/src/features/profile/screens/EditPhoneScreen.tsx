import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { updateMemberInfo } from '../../../shared/api/memberApi';
import { useAuthStore } from '../../../shared/state/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';

const EditPhoneScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // setAuthData 함수를 스토어에서 가져옵니다.
  const { memberInfo, setAuthData } = useAuthStore();
  const [phoneNum, setPhoneNum] = useState('');

  useEffect(() => {
    // @ts-ignore
    if (route.params?.userInfo) {
      // @ts-ignore
      setPhoneNum(route.params.userInfo.phoneNum || '');
    }
  }, [route.params]);

  const handleUpdatePhone = async () => {
    if (!phoneNum.trim()) {
      Alert.alert('오류', '연락처를 입력해주세요.');
      return;
    }
    if (memberInfo?.memberUid) {
      try {
        // updateMemberInfo가 반환하는 최신 사용자 정보를 받습니다.
        const updatedInfo = await updateMemberInfo(memberInfo.memberUid, {
          phoneNum: phoneNum.trim(),
        });

        // 전역 스토어의 memberInfo를 최신 정보로 업데이트합니다.
        setAuthData({ memberInfo: updatedInfo });

        Alert.alert('성공', '연락처가 성공적으로 변경되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } catch (error) {
        console.error('[API ERROR] Failed to update phone number:', error);
        Alert.alert('오류', '연락처 변경에 실패했습니다.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.header}>연락처</Text>
        </View>

        <Text style={styles.label}>연락처</Text>
        <TextInput
          style={styles.input}
          value={phoneNum}
          onChangeText={setPhoneNum}
          placeholder="새로운 연락처를 입력하세요"
          keyboardType="phone-pad"
        />

        <TouchableOpacity style={styles.button} onPress={handleUpdatePhone}>
          <Text style={styles.buttonText}>수정</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // 제목을 중앙에 배치
    paddingVertical: 15,
    position: 'relative',
    width: '100%',
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  backButton: {
    position: 'absolute', // 부모(headerContainer) 기준으로 위치 지정
    left: 0,
    top: 5,
    padding: 10, // 터치 영역 확보
    zIndex: 1, // 다른 요소 위에 오도록 설정
  },
  backButtonText: {
    fontSize: 24,
    color: '#000000',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginTop: 40,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    height: 47,
    borderBottomWidth: 1,
    borderColor: '#0064FF',
    fontSize: 16,
    paddingHorizontal: 5,
    color: '#000',
  },
  button: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0064FF',
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default EditPhoneScreen;
