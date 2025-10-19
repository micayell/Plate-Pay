import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { registerAccount, verifyAccount } from '../api/accountApi'; // ✅ verifyAccount import 추가

type AddAccountPayload = {
  title: string;
  owner: string;
  last4: string;
  gradient: string[];
};

type RouteParams = {
  onSubmit?: (acc: AddAccountPayload) => void;
  ownerName?: string; // 예금주명(서버에 보낼 값)
};

const PRIMARY = '#0064FF';

// 3-6-6-3 포맷
function formatAccount(num: string) {
  const n = num.replace(/[^0-9]/g, '');
  const parts: string[] = [];
  if (n.length <= 3) return n;
  parts.push(n.slice(0, 3));
  if (n.length <= 9) return `${parts[0]}-${n.slice(3)}`;
  parts.push(n.slice(3, 9));
  if (n.length <= 15) return `${parts[0]}-${parts[1]}-${n.slice(9)}`;
  parts.push(n.slice(9, 15));
  return `${parts[0]}-${parts[1]}-${parts[2]}-${n.slice(15)}`;
}

export default function AddAccountScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { onSubmit, ownerName } = (route.params ?? {}) as RouteParams;

  const [alias, setAlias] = useState('');
  const [number, setNumber] = useState(''); // 숫자만
  const [loading, setLoading] = useState(false); // ✅ 중복요청 방지

  const numberRef = useRef<TextInput>(null);

  const aliasLen = alias.trim().length;
  const aliasValid = aliasLen > 0 && aliasLen <= 10;
  const numberFilled = number.trim().length > 0;

  const isActive = aliasValid && numberFilled && !loading;

  const handleCancel = () => nav.goBack();

  const handleSubmit = async () => {
    if (!isActive) return;

    const accountNo = number; // ✅ 실제 요청에 보낼 계좌번호(숫자만)
    const accountName = alias ?? ''; // ✅ 예금주명(라우트에서 받음, 없으면 빈 문자열)

    try {
      setLoading(true);

      // 1) 1원 인증 송금 트리거
      await registerAccount(accountNo);

      // 2) 검증 성공 시 부모에 넘길 payload 미리 구성
      const payload: AddAccountPayload = {
        title: alias.trim(),
        owner: accountName,
        last4: accountNo.slice(-4).padStart(4, '0'),
        // 필요 시 서버/은행별 색상 규칙으로 변경
        gradient: ['#4F46E5', '#06B6D4'],
      };

      // 3) 인증 화면으로 이동 + validateCode 콜백 주입
      nav.navigate('VerifyAccount', {
        accountDisplay: `${alias} ${formatAccount(accountNo)}`,
        onVerified: () => {
          onSubmit?.(payload);
        },
        // ✅ 여기서 실제 서버 검증 수행
        validateCode: async (code: string) => {
          await verifyAccount(accountNo, code, accountName);
          return true; // 예외 없이 끝나면 성공
        },
      });
    } catch (error) {
      console.error('계좌 등록 중 오류 발생:', error);
      // TODO: Toast/Alert 등 사용자 피드백
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={handleCancel} hitSlop={8}>
          <Text style={s.icon}>{'<'}</Text>
        </Pressable>
        <Text style={s.headerTitle}>계좌 등록</Text>
        <View style={s.iconBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.body}>
          {/* 별명 */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>계좌 별명</Text>
              <Text style={[s.counter, aliasValid ? s.counterOk : s.counterBad]}>
                {aliasLen}/10
              </Text>
            </View>
            <TextInput
              value={alias}
              onChangeText={setAlias}
              placeholder="별명 입력"
              placeholderTextColor="#C7CBD1"
              style={[s.input]}
              maxLength={10}
              returnKeyType="next"
              onSubmitEditing={() => numberRef.current?.focus()}
              showSoftInputOnFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!aliasValid && aliasLen > 0 && (
              <Text style={s.error}>별명은 1~10자만 가능합니다.</Text>
            )}
          </View>

          {/* 계좌번호 */}
          <View style={[s.field, { marginTop: 18 }]}>
            <Text style={s.label}>계좌번호</Text>
            <TextInput
              ref={numberRef}
              value={number}
              onChangeText={t => setNumber(t.replace(/[^0-9]/g, ''))}
              placeholder="'-' 제외하고 입력"
              placeholderTextColor="#C7CBD1"
              keyboardType="number-pad"
              style={s.input}
              maxLength={20}
              returnKeyType="done"
              showSoftInputOnFocus
            />
            {!numberFilled && <Text style={s.helper}>숫자만 입력하세요.</Text>}
          </View>
        </View>

        {/* 하단 버튼 */}
        <View style={s.footer}>
          <Pressable
            style={[s.btn, s.btnGray]}
            onPress={handleCancel}
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
          >
            <Text style={s.btnGrayText}>취소</Text>
          </Pressable>
          <Pressable
            style={[s.btn, isActive ? s.btnPrimary : s.btnPrimaryDisabled]}
            disabled={!isActive}
            onPress={handleSubmit}
          >
            <Text style={s.btnPrimaryText}>{loading ? '등록 중...' : '등록'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 150,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  icon: { fontSize: 18, color: '#111' },
  body: { flex: 1, paddingHorizontal: 60, alignItems: 'center', justifyContent: 'center' },
  field: { width: '100%' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8, marginLeft: 12 },
  counter: { fontSize: 12, marginRight: 12 },
  counterOk: { color: '#6B7280' },
  counterBad: { color: '#EF4444', fontWeight: '600' },
  input: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    color: '#111827',
    borderWidth: 0,
  },
  helper: { marginTop: 6, marginLeft: 12, fontSize: 12, color: '#9CA3AF' },
  error: { marginTop: 6, marginLeft: 12, fontSize: 12, color: '#EF4444', fontWeight: '600' },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  btn: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  btnGray: { backgroundColor: '#E5E7EB' },
  btnGrayText: { color: '#111827', fontWeight: '700' },
  btnPrimary: { backgroundColor: PRIMARY },
  btnPrimaryDisabled: { backgroundColor: '#A5B4FC' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700' },
});
