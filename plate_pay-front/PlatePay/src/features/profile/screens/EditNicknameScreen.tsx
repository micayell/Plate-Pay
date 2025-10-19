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

const EditNicknameScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // setAuthData 함수를 스토어에서 가져옵니다.
  const { memberInfo, setAuthData } = useAuthStore();
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    // @ts-ignore
    if (route.params?.userInfo) {
      // @ts-ignore
      setNickname(route.params.userInfo.nickname || '');
    }
  }, [route.params]);

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
      return;
    }
    if (memberInfo?.memberUid) {
      try {
        // updateMemberInfo가 반환하는 최신 사용자 정보를 받습니다.
        const updatedInfo = await updateMemberInfo(memberInfo.memberUid, {
          nickname: nickname.trim(),
        });

        // 전역 스토어의 memberInfo를 최신 정보로 업데이트합니다.
        setAuthData({ memberInfo: updatedInfo });
        
        Alert.alert('성공', '닉네임이 성공적으로 변경되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } catch (error) {
        console.error('[API ERROR] Failed to update nickname:', error);
        Alert.alert('오류', '닉네임 변경에 실패했습니다.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.header}>닉네임</Text>
        </View>

        <Text style={styles.label}>닉네임</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="새로운 닉네임을 입력하세요"
        />

        <TouchableOpacity style={styles.button} onPress={handleUpdateNickname}>
          <Text style={styles.buttonText}>수정</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// 스타일은 기존과 거의 동일하게 유지합니다.
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
    justifyContent: 'center',
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
    position: 'absolute',
    left: 0,
    top: 5,
    padding: 10,
    zIndex: 1,
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

export default EditNicknameScreen;
