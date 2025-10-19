import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { validatePassword } from '../../shared/api/memberApi';

interface PasswordVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
  title?: string;
  description?: string;
}

const PasswordVerificationModal = ({
  visible,
  onClose,
  onVerifySuccess,
  title = '비밀번호 확인',
  description = '계정 비밀번호 6자리를 입력해주세요',
}: PasswordVerificationModalProps) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  const handlePasswordChange = (value: string, index: number) => {
    const newPassword = password.split('');
    newPassword[index] = value;

    // 6자리 초과시 무시
    if (newPassword.join('').length > 6) return;

    setPassword(newPassword.join(''));

    // 자동 포커스 이동
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // 6자리 입력 완료시 자동 확인
    if (newPassword.join('').length === 6) {
      handleVerify(newPassword.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !password[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (passwordToVerify?: string) => {
    const finalPassword = passwordToVerify || password;

    if (finalPassword.length !== 6) {
      Alert.alert('오류', '6자리 비밀번호를 입력해주세요.');
      return;
    }

    setIsVerifying(true);

    try {
      // 실제 서버 비밀번호 검증 API 호출
      const isValid = await validatePassword(finalPassword);

      if (isValid) {
        onVerifySuccess();
        resetModal();
      } else {
        Alert.alert('인증 실패', '비밀번호가 일치하지 않습니다.');
        setPassword('');
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Password validation error:', error);
      Alert.alert('오류', '인증 중 오류가 발생했습니다.');
      setPassword('');
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const resetModal = () => {
    setPassword('');
    setIsVerifying(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderPasswordInputs = () => {
    return (
      <View style={styles.passwordContainer}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) inputRefs.current[index] = ref;
            }}
            style={[
              styles.passwordInput,
              password[index] && styles.passwordInputFilled,
            ]}
            value={password[index] || ''}
            onChangeText={(value) => handlePasswordChange(value, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="numeric"
            maxLength={1}
            secureTextEntry
            editable={!isVerifying}
            autoFocus={index === 0}
          />
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {renderPasswordInputs()}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isVerifying}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.verifyButton,
                (password.length !== 6 || isVerifying) && styles.verifyButtonDisabled,
              ]}
              onPress={() => handleVerify()}
              disabled={password.length !== 6 || isVerifying}
            >
              <Text style={[
                styles.verifyButtonText,
                (password.length !== 6 || isVerifying) && styles.verifyButtonTextDisabled,
              ]}>
                {isVerifying ? '확인중...' : '확인'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  passwordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    width: '100%',
  },
  passwordInput: {
    width: 40,
    height: 50,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#F8F8F8',
    color: '#000000',
  },
  passwordInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#007AFF',
  },
  verifyButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButtonTextDisabled: {
    color: '#999999',
  },
});

export default PasswordVerificationModal;