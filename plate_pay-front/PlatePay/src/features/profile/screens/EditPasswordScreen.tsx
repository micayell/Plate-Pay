import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { validatePassword } from '../../../shared/api/memberApi';
import { SafeAreaView } from 'react-native-safe-area-context';

const EditPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentPassword, setCurrentPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (currentPassword.length !== 6) {
      Alert.alert('오류', '기존 결제 비밀번호 6자리를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await validatePassword(currentPassword);
      if (isValid) {
        // @ts-ignore
        navigation.navigate('SetNewPassword' as never, { userInfo: route.params?.userInfo } as never);
      } else {
        Alert.alert('인증 실패', '비밀번호가 일치하지 않습니다.');
        setCurrentPassword('');
      }
    } catch (error) {
      Alert.alert('오류', '비밀번호 확인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{'<'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>기존 결제 비밀번호</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>다음</Text>
          )}
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
    paddingVertical: 15,
    position: 'relative',
  },
  backButton: {
    fontSize: 24,
    color: '#000000',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginTop: 40,
    marginBottom: 10,
    marginLeft: 28,
  },
  input: {
    width: '85%',
    alignSelf: 'center',
    height: 47,
    borderBottomWidth: 1,
    borderColor: '#0064FF',
    fontSize: 22,
    paddingHorizontal: 5,
    textAlign: 'center',
    letterSpacing: 10,
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
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default EditPasswordScreen;
