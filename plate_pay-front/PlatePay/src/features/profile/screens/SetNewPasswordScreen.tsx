import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Vibration,
  Animated,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateMemberInfo } from '../../../shared/api/memberApi';
import { useAuthStore } from '../../../shared/state/authStore';

const PIN_LENGTH = 6;
type Step = 'enter' | 'confirm' | 'complete';

const CustomKeypad = ({ onKeyPress }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return (
    <View style={styles.keypad}>
      {keys.map(key => (
        <Pressable
          key={key || 'empty'}
          style={styles.key}
          onPress={() => onKeyPress(key)}
          disabled={!key}
        >
          <Text style={styles.keyText}>{key}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const SetNewPasswordScreen = () => {
  const navigation = useNavigation();
  const { memberInfo, setAuthData } = useAuthStore();

  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [failureCount, setFailureCount] = useState(0);
  const [isError, setIsError] = useState(false);

  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const currentPin = step === 'enter' ? pin : confirmPin;
  const title = step === 'enter' ? '새 결제 비밀번호' : '비밀번호 확인';
  const buttonText = step === 'enter' ? '다음' : 'Enter';

  const triggerShake = () => {
    shakeAnimation.setValue(0);
    Animated.timing(shakeAnimation, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const shakeInterpolate = shakeAnimation.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -10, 10, -10, 10, 0],
  });

  useEffect(() => {
    if (step === 'enter' && pin.length === PIN_LENGTH) {
      setTimeout(() => setStep('confirm'), 200);
    }

    if (step === 'confirm' && confirmPin.length === PIN_LENGTH) {
      if (pin === confirmPin) {
        const handleUpdatePassword = async () => {
          if (memberInfo?.memberUid) {
            try {
              const updatedInfo = await updateMemberInfo(memberInfo.memberUid, {
                payPwd: pin,
              });
              setAuthData({ memberInfo: updatedInfo });
              setTimeout(() => setStep('complete'), 200);
            } catch (error) {
              console.error('[API ERROR] Failed to update password:', error);
              Alert.alert('오류', '비밀번호 변경에 실패했습니다.', [
                { text: '확인', onPress: () => navigation.pop(2) },
              ]);
            }
          }
        };
        handleUpdatePassword();
      } else {
        const newCount = failureCount + 1;
        setFailureCount(newCount);
        setIsError(true);
        triggerShake();
        Vibration.vibrate();
        setConfirmPin('');

        if (newCount >= 3) {
          Alert.alert(
            '설정 실패',
            '비밀번호가 3회 이상 일치하지 않아 이전 화면으로 돌아갑니다.',
            [{ text: '확인', onPress: () => navigation.pop(2) }],
          );
        } else {
          setTimeout(() => {
            setStep('enter');
            setPin('');
            setIsError(false);
          }, 1500);
        }
      }
    }
  }, [pin, confirmPin, step, navigation, failureCount, memberInfo, setAuthData]);

  useEffect(() => {
    if (step === 'complete') {
      setTimeout(() => {
        Alert.alert('성공', '결제 비밀번호가 성공적으로 변경되었습니다.');
        navigation.pop(2);
      }, 1000); // 1초 후 자동 이동
    }
  }, [step, navigation]);

  const handleKeyPress = (key: string) => {
    if (isError) return;
    const setter = step === 'enter' ? setPin : setConfirmPin;
    if (key === '⌫') {
      setter(prev => prev.slice(0, -1));
    } else if (currentPin.length < PIN_LENGTH) {
      setter(prev => prev + key);
    }
  };

  if (step === 'complete') {
    return (
      <View style={styles.completeContainer}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.completeText}>변경 완료!</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {isError && (
          <Text style={styles.errorText}>
            일치하지 않습니다. 다시 입력해주세요. ({failureCount}/3)
          </Text>
        )}
        <Animated.View
          style={[
            styles.pinContainer,
            { transform: [{ translateX: shakeInterpolate }] },
          ]}
        >
          {Array(PIN_LENGTH)
            .fill(0)
            .map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  i < currentPin.length && styles.pinDotFilled,
                  step === 'enter' &&
                    i === pin.length &&
                    styles.pinDotActive,
                  isError && styles.pinDotError,
                ]}
              >
                {i < currentPin.length && <Text style={styles.pinText}>*</Text>}
              </View>
            ))}
        </Animated.View>
        <Pressable
          style={[
            styles.button,
            currentPin.length !== PIN_LENGTH && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </Pressable>
      </View>
      <CustomKeypad onKeyPress={handleKeyPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    color: '#D9534F',
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 14,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 48,
  },
  pinDot: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDotActive: { borderColor: '#007AFF' },
  pinDotFilled: { borderColor: '#111' },
  pinDotError: { borderColor: '#D9534F' },
  pinText: { fontSize: 24, fontWeight: 'bold' },
  button: {
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#AED6F1' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    backgroundColor: '#E1E5E8',
  },
  key: { width: '33.33%', paddingVertical: 16, alignItems: 'center' },
  keyText: { fontSize: 24 },
  completeContainer: {
    flex: 1,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkMark: { fontSize: 40, color: '#007AFF' },
  completeText: { color: 'white', fontSize: 28, fontWeight: 'bold' },
});

export default SetNewPasswordScreen;
