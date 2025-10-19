import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AuthScreenProps } from '../navigation/AuthNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { updateMemberInfo } from '../../../shared/api/memberApi';
import { useAuthStore } from '../../../shared/state/authStore';

const AGREEMENT_ITEMS = [
  { id: 'personalInfo', label: '[필수] 개인정보 수집/이용 동의' },
  { id: 'uniqueId', label: '[필수] 고유식별정보 처리 동의' },
  { id: 'serviceTerms', label: '[필수] 서비스 이용약관 동의' },
  { id: 'locationInfo', label: '[필수] 위치정보 수집/이용 동의' },
];

const Checkbox = ({ checked, label, onPress, isParent = false }) => (
  <Pressable style={styles.checkboxRow} onPress={onPress}>
    <View style={[styles.checkboxBase, isParent && styles.checkboxParentBase, checked && styles.checkboxChecked]}>
      {checked && <Icon name="checkmark-sharp" size={isParent ? 18 : 14} color="#FFFFFF" />}
    </View>
    <Text style={[styles.checkboxLabel, isParent && styles.checkboxParentLabel]}>{label}</Text>
    {!isParent && <Text style={styles.chevron}>〉</Text>}
  </Pressable>
);

export default function SsafySignupScreen({ route, navigation }: AuthScreenProps<'SsafySignup'>) {
  const { memberInfo } = route.params;
  const { setAuthData } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const [agreements, setAgreements] = useState(
    AGREEMENT_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );
  const [allAgreed, setAllAgreed] = useState(false);

  const [nickname, setNickname] = useState('');
  const [phone1, setPhone1] = useState('010');
  const [phone2, setPhone2] = useState('');

  useEffect(() => {
    if (memberInfo) {
      setNickname(memberInfo.nickname === 'string' ? '' : memberInfo.nickname || '');
    }
  }, [memberInfo]);

  useEffect(() => {
    const allItemsChecked = Object.values(agreements).every(Boolean);
    if (allItemsChecked !== allAgreed) {
      setAllAgreed(allItemsChecked);
    }
  }, [agreements, allAgreed]);

  const toggleAllAgreements = () => {
    const nextValue = !allAgreed;
    setAllAgreed(nextValue);
    const newAgreements = {};
    AGREEMENT_ITEMS.forEach(item => {
      newAgreements[item.id] = nextValue;
    });
    setAgreements(newAgreements);
  };

  const toggleAgreement = (id) => {
    setAgreements(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const canSubmit = allAgreed && nickname && phone2.length >= 7;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    const phoneNum = phone1 + phone2;

    try {
      // API 호출 없이, 입력받은 정보를 PinSetupScreen으로 전달만 합니다.
      navigation.navigate('PinSetup', {
        name: memberInfo.name, // SSAFY에서 받은 이름
        nickname: nickname.trim(),
        phoneNum: phoneNum,
      });
    } catch (error) {
      console.error("Failed to navigate to PinSetup:", error);
      Alert.alert("오류", "다음 단계로 진행하는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={styles.title}>약관에 동의해주세요.</Text>
          
          <View style={styles.agreementSection}>
            <Checkbox
              checked={allAgreed}
              label="전체동의"
              onPress={toggleAllAgreements}
              isParent
            />
            <View style={styles.divider} />
            {AGREEMENT_ITEMS.map(item => (
              <Checkbox
                key={item.id}
                checked={agreements[item.id]}
                label={item.label}
                onPress={() => toggleAgreement(item.id)}
              />
            ))}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>개인정보 입력</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>닉네임</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="닉네임을 입력하세요"
                placeholderTextColor="#C6CBD0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>휴대폰</Text>
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={[styles.input, styles.phoneInputPrefix]}
                  value={phone1}
                  onChangeText={setPhone1}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TextInput
                  style={[styles.input, styles.phoneInputSuffix]}
                  value={phone2}
                  onChangeText={setPhone2}
                  placeholder="나머지번호 입력"
                  placeholderTextColor="#C6CBD0"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        </ScrollView>
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.submitButton, (!canSubmit || isLoading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>확인</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#26282C',
    letterSpacing: -0.02 * 28,
    marginBottom: 30,
  },
  agreementSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DDE1E4',
    paddingVertical: 10,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  checkboxBase: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#8C949E',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxParentBase: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  checkboxChecked: {
    backgroundColor: '#484B51',
    borderColor: '#484B51',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '300',
    color: '#26282C',
    letterSpacing: -0.02 * 16,
  },
  checkboxParentLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 'auto',
    color: '#8C949E',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#484B51',
    marginVertical: 8,
  },
  formSection: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#26282C',
    letterSpacing: -0.02 * 18,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '300',
    color: '#696E76',
    marginBottom: 8,
    letterSpacing: -0.02 * 16,
  },
  input: {
    height: 50,
    fontSize: 19,
    borderBottomWidth: 2,
    borderBottomColor: '#AAB0B8',
    paddingHorizontal: 4,
    fontWeight: '700',
    color: '#26282C',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInputPrefix: {
    width: 80,
    marginRight: 20,
    textAlign: 'center',
  },
  phoneInputSuffix: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#0064FF',
    height: 67,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A9A9A9',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.02 * 20,
  },
});
