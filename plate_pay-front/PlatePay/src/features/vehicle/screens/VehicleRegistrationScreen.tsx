import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  startVehicleRegistration,
  confirmVehicleRegistration,
} from '../../../shared/api/carApi';
import { VehicleRegistrationRequest } from '../../../types/type';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../shared/state/authStore';

const PRIMARY = '#0064FF';

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  return (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((step, index) => (
        <React.Fragment key={step}>
          <View
            style={[
              styles.step,
              currentStep === step && styles.stepActive,
              currentStep > step && styles.stepCompleted,
            ]}
          >
            {currentStep > step ? (
              <Icon name="check" size={14} color="#FFF" />
            ) : (
              <Text
                style={[
                  styles.stepText,
                  currentStep >= step && styles.stepTextActive,
                ]}
              >
                {step}
              </Text>
            )}
          </View>
          {index < 2 && (
            <View
              style={[
                styles.stepConnector,
                currentStep > step && styles.stepConnectorActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const InfoBox = () => (
  <View style={styles.infoBox}>
    <Text style={styles.infoTitle}>차량 소유주 확인</Text>
    <Text style={styles.infoText}>
      입력하신 차량 번호의 소유주 확인을 위해 간단한 인증 절차가 진행됩니다.
      차량번호와 주민등록번호로 본인 확인이 가능합니다.
    </Text>
  </View>
);

const VehicleRegistrationScreen = ({ navigation }) => {
  // [수정] 무한 루프를 방지하기 위해 객체가 아닌, 필요한 '이름' 데이터만 직접 선택합니다.
  const memberNameFromStore = useAuthStore(state => state.memberInfo?.name);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [plateNumber, setPlateNumber] = useState('');
  const [nickname, setNickname] = useState('');
  // [수정] 초기값은 빈 문자열로 시작합니다.
  const [ownerName, setOwnerName] = useState('');
  const [rrn1, setRrn1] = useState('');
  const [rrn2, setRrn2] = useState('');

  // === 입력 필드 Ref ===
  const nicknameRef = useRef<TextInput>(null);
  const ownerNameRef = useRef<TextInput>(null);
  const rrn1Ref = useRef<TextInput>(null);
  const rrn2Ref = useRef<TextInput>(null);

  // === 입력 유효성 검사 (useMemo로 실시간 계산) ===
  const isStep1Valid = useMemo(() => {
    return plateNumber.trim().length > 0 && nickname.trim().length > 0;
  }, [plateNumber, nickname]);

  const isStep2Valid = useMemo(() => {
    return (
      ownerName.trim().length > 0 &&
      rrn1.trim().length === 6 &&
      rrn2.trim().length === 7 // 주민번호 뒷자리는 7자리
    );
  }, [ownerName, rrn1, rrn2]);

  // [추가] useEffect를 사용해 스토어에서 로드된 사용자 이름을 안전하게 한 번만 설정합니다.
  useEffect(() => {
    // 스토어에서 가져온 이름이 있을 경우, ownerName 상태를 업데이트합니다.
    if (memberNameFromStore) {
      setOwnerName(memberNameFromStore);
    }
  }, [memberNameFromStore]); // 이 useEffect는 memberNameFromStore 값이 변경될 때만 실행됩니다.


  // 완료 화면에서 자동 복귀
  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(() => navigation.popToTop(), 1500);
      return () => clearTimeout(t);
    }
  }, [step, navigation]);
  
  // === 공백 제거 핸들러 ===
  const handlePlateNumberChange = (text: string) => setPlateNumber(text.replace(/\s/g, ''));
  const handleNicknameChange = (text: string) => setNickname(text.replace(/\s/g, ''));
  const handleOwnerNameChange = (text: string) => setOwnerName(text.replace(/\s/g, ''));
  
  // === 주민번호 앞자리 핸들러 (6자리 채우면 자동 포커스 이동) ===
  const handleRrn1Change = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    setRrn1(cleaned);
    if (cleaned.length === 6) {
      rrn2Ref.current?.focus();
    }
  };
  const handleRrn2Change = (text: string) => setRrn2(text.replace(/\s/g, ''));


  const handleNext = async () => {
    Keyboard.dismiss();
    if (step === 1) {
      if (!isStep1Valid) return; // 버튼이 활성화된 상태에서만 동작
      setStep(2);
    } else if (step === 2) {
      if (!isStep2Valid) return;
      setIsLoading(true);
      try {
        const registrationData: VehicleRegistrationRequest = {
          name: ownerName,
          nickname: nickname,
          plateNum: plateNumber,
          ssn: `${rrn1}${rrn2}`,
        };
        await startVehicleRegistration(registrationData);
        setStep(3);
      } catch (error) {
        Alert.alert('오류', '차량 소유주 확인에 실패했습니다. 입력 정보를 확인해주세요.');
        setStep(5);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFinalRegistration = async () => {
    setIsLoading(true);
    try {
      await confirmVehicleRegistration();
      setStep(4);
    } catch (error) {
      Alert.alert('등록 실패', '차량 등록 최종 확인에 실패했습니다.');
      setStep(5);
    } finally {
      setIsLoading(false);
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => (step === 1 ? navigation.goBack() : setStep(prev => prev - 1))}>
        <Ionicons name="arrow-back" size={24} color="#1A365D" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>차량 등록</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.title}>차량 정보를 입력하세요</Text>
            <Text style={styles.subtitle}>
              등록된 차량 정보로 자동 결제가 진행됩니다
            </Text>
            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>차량 번호</Text>
                <TextInput
                  style={styles.input}
                  value={plateNumber}
                  onChangeText={handlePlateNumberChange}
                  placeholder="12가3456"
                  placeholderTextColor="#999999"
                  returnKeyType="next"
                  onSubmitEditing={() => nicknameRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <Text style={styles.label}>차량 닉네임 (별칭)</Text>
                <TextInput
                  ref={nicknameRef}
                  style={styles.input}
                  value={nickname}
                  onChangeText={handleNicknameChange}
                  placeholder="예: 아빠차, 파란 아반떼"
                  placeholderTextColor="#999999"
                  returnKeyType="done"
                />
              </View>
            </View>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.title}>본인인증을 진행해주세요</Text>
            <Text style={styles.subtitle}>차량 소유주인지 확인합니다</Text>
            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>이름</Text>
                <TextInput
                  ref={ownerNameRef}
                  style={styles.input}
                  value={ownerName}
                  onChangeText={handleOwnerNameChange}
                  placeholder="홍길동"
                  placeholderTextColor="#999999"
                  returnKeyType="next"
                  onSubmitEditing={() => rrn1Ref.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <Text style={styles.label}>주민등록번호</Text>
                <View style={styles.rrnContainer}>
                  <TextInput
                    ref={rrn1Ref}
                    style={[styles.input, { flex: 1 }]}
                    value={rrn1}
                    onChangeText={handleRrn1Change}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="next"
                  />
                  <Text style={styles.rrnDash}>-</Text>
                  <TextInput
                    ref={rrn2Ref}
                    style={[styles.input, { flex: 1 }]}
                    value={rrn2}
                    onChangeText={handleRrn2Change}
                    keyboardType="number-pad"
                    maxLength={7}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.title}>카카오 인증</Text>
            <Text style={styles.subtitle}>
              카카오톡에서 인증 요청을 확인하고 승인해 주세요. 인증 완료 후
              '내 차 등록하기' 버튼을 눌러주세요
            </Text>
            <InfoBox />
          </>
        );
      case 4:
        // ✅ VerifyAccountScreen의 완료 화면과 동일한 UI
        return (
          <View style={styles.completeContainer}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.completeText}>등록 완료!</Text>
          </View>
        );
      case 5:
        return (
          <View style={styles.resultContainer}>
            <View style={styles.failIconContainer}>
               <Icon name="exclamation" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.resultTitle}>등록에 실패했어요.</Text>
            <Text style={styles.resultSubtitle}>
              차량등록 상태가 유효하지 않습니다.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.resultButton]}
              onPress={() => setStep(1)}
            >
              <Text style={styles.buttonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  const getButtonText = () => {
    if (step === 3) return '내 차 등록하기';
    return '다음';
  };

  // === 버튼 활성화 상태 결정 ===
  const isButtonDisabled = () => {
    if (isLoading) return true;
    if (step === 1 && !isStep1Valid) return true;
    if (step === 2 && !isStep2Valid) return true;
    return false;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {step < 4 && <Header />}
      {step <= 3 ? (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.contentWrapper}>
            <View>
              <StepIndicator currentStep={step} />
              {renderContent()}
            </View>
            <View>
              {step < 3 && <InfoBox />}
              <TouchableOpacity
                style={[styles.button, isButtonDisabled() && styles.buttonDisabled]}
                onPress={step === 3 ? handleFinalRegistration : handleNext}
                disabled={isButtonDisabled()}
              >
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{getButtonText()}</Text>}
              </TouchableOpacity>
              <Text style={styles.footerText}>
                차량 번호 입력에 어려움이 있으신가요?{' '}
                <Text style={styles.footerLink}>도움말 보기</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        renderContent()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, backgroundColor: '#FFFFFF' },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    minHeight: Dimensions.get('window').height - 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E6',
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#1A3366',
  },

  // step indicator
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    width: 200,
    alignSelf: 'center',
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CCCCCC',
  },
  stepActive: {
    borderColor: '#1A3366',
    backgroundColor: '#648FDB'
  },
  stepCompleted: {
    backgroundColor: '#648FDB',
    borderColor: '#648FDB',
  },
  stepText: { fontSize: 14, fontWeight: '600', color: '#CCCCCC' },
  stepTextActive: { color: '#FFFFFF' },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#D9D9D9',
  },
  stepConnectorActive: { backgroundColor: '#648FDB' },

  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1A3366',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999999',
    marginBottom: 30,
  },
  inputCard: {
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 8,
    padding: 16,
    paddingTop: 24,
  },
  inputGroup: { marginBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3366',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#333',
  },
  rrnContainer: { flexDirection: 'row', alignItems: 'center' },
  rrnDash: { marginHorizontal: 10, fontSize: 20, color: '#CCCCCC' },

  infoBox: {
    borderWidth: 1,
    borderColor: '#1A3366',
    backgroundColor: '#F0FAFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3366',
    marginBottom: 8,
  },
  infoText: { fontSize: 12, lineHeight: 15, color: '#61616B' },

  button: {
    backgroundColor: '#0064FF',
    height: 67,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { backgroundColor: '#A9A9A9' },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: '#808080',
  },
  footerLink: { textDecorationLine: 'underline' },

  // ✅ 완료/실패 화면
  //   - 완료(step 4): VerifyAccountScreen과 동일한 스타일
  completeContainer: {
    flex: 1,
    backgroundColor: PRIMARY,
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
  checkMark: { fontSize: 40, color: PRIMARY },
  completeText: { color: 'white', fontSize: 28, fontWeight: 'bold' },

  //   - 실패(step 5): 기존 실패 카드 유지
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  failIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF5858',
    marginBottom: 40,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A3366',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  resultButton: { width: '100%', height: 52 },
});

export default VehicleRegistrationScreen;
