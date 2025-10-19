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
import { AuthScreenProps } from '../navigation/AuthNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
// axiosInstance 대신 updateMemberInfo를 import 합니다.
import { updateMemberInfo } from '../../../shared/api/memberApi';
import { useAuthStore } from '../../../shared/state/authStore';

const PIN_LENGTH = 6;
type Step = 'enter' | 'confirm' | 'complete';

// 커스텀 키패드 컴포넌트
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

export default function PinSetupScreen({ route, navigation }: AuthScreenProps<'PinSetup'>) {
  // SignupScreen에서 전달받은 파라미터를 가져옵니다.
  const { name, nickname, phoneNum } = route.params;
  const { setAuthData } = useAuthStore();

  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [failureCount, setFailureCount] = useState(0);
  const [isError, setIsError] = useState(false);
  
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const currentPin = step === 'enter' ? pin : confirmPin;
  const title = step === 'enter' ? '결제 비밀번호' : '결제 비밀번호 확인';
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
        // 비밀번호가 일치하면 API를 호출하는 함수를 실행합니다.
        const registerUserInfo = async () => {
          const { memberInfo } = useAuthStore.getState();
          const memberId = memberInfo?.memberUid;

          if (!memberId) {
            Alert.alert("오류", "사용자 정보를 찾을 수 없어 로그인이 필요합니다.", [
              { text: "확인", onPress: () => navigation.navigate('AuthHome') }
            ]);
            return;
          }

          try {
            // 이전 화면의 정보와 현재 PIN 정보를 합쳐서 최종 payload 생성
            const payload = {
              name: name,
              nickname: nickname,
              phoneNum: phoneNum,
              payPwd: pin,
            };
            
            // 모든 정보를 담아 API를 한 번만 호출합니다.
            const updatedInfo = await updateMemberInfo(memberId, payload);
            
            // API 호출 성공 시, 최신 정보와 함께 로그인 상태로 변경
            setAuthData({ memberInfo: updatedInfo, isLoggedIn: true });
            
            // 설정 완료 UI로 이동
            setTimeout(() => setStep('complete'), 200);

          } catch (error) {
            console.error("회원정보 등록 실패:", error);
            Alert.alert("등록 실패", "회원정보 등록 중 오류가 발생했습니다. 다시 시도해주세요.", [
              { text: "확인", onPress: () => navigation.pop() } // 이전 화면(Signup)으로 돌아가기
            ]);
          }
        };
        
        registerUserInfo();
      } else {
        // 비밀번호 불일치 시의 기존 로직
        const newCount = failureCount + 1;
        setFailureCount(newCount);
        setIsError(true);
        triggerShake();
        Vibration.vibrate();

        // 실패를 감지하는 즉시 confirmPin을 초기화하여 무한 루프를 방지합니다.
        setConfirmPin('');

        if (newCount >= 3) {
          Alert.alert(
            '설정 실패',
            '비밀번호가 3회 이상 일치하지 않아 이전 화면으로 돌아갑니다.',
            [{ text: '확인', onPress: () => navigation.goBack() }],
          );
        } else {
          // 에러 애니메이션을 보여준 후, 1.5초 뒤에 처음부터 다시 시작합니다.
          setTimeout(() => {
            setStep('enter');
            setPin('');
            setIsError(false);
          }, 1500);
        }
      }
    }
  }, [pin, confirmPin, step, navigation, failureCount, name, nickname, phoneNum]);

  useEffect(() => {
    if (step === 'complete') {
      // 이 부분은 비워둡니다. RootNavigator가 isLoggedIn 상태 변경을 감지하고
      // 자동으로 메인 화면으로 전환할 것입니다.
    }
  }, [step, navigation]);

  const handleKeyPress = (key: string) => {
    if (isError) return; // 에러 상태에서는 입력 방지
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
        <Text style={styles.completeText}>설정 완료!!</Text>
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
        <Animated.View style={[styles.pinContainer, { transform: [{ translateX: shakeInterpolate }] }]}>
          {Array(PIN_LENGTH)
            .fill(0)
            .map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  i < currentPin.length && styles.pinDotFilled,
                  step === 'enter' && i === pin.length && styles.pinDotActive,
                  isError && styles.pinDotError,
                ]}
              >
                {/* 조건에 따라 숫자 대신 '*' 문자를 렌더링하도록 수정 */}
                {i < currentPin.length && (
                  <Text style={styles.pinText}>*</Text>
                )}
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color:'#000'
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
  pinText: { fontSize: 24, fontWeight: 'bold', color: 'blue' }, // 색상을 blue로 변경하여 테스트
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
