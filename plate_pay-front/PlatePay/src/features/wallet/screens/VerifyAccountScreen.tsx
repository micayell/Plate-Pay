import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

type RouteParams = {
  accountDisplay: string;
  onVerified?: () => void;
  validateCode?: (code: string) => boolean | Promise<boolean>;
};

const PRIMARY = '#0064FF';
const DISABLED = '#A5B4FC';
const MAX_LEN = 4;

export default function VerifyAccountScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { accountDisplay, onVerified, validateCode } = (route.params ?? {}) as RouteParams;

  // ✅ 단일 문자열로만 입력 제어 (숨은 TextInput 한 개)
  const [code, setCode] = useState('');
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hiddenRef = useRef<TextInput>(null);

  // 보이는 4칸에 표시할 문자 배열
  const chars = useMemo(
    () => Array.from({ length: MAX_LEN }, (_, i) => code[i] ?? ''),
    [code]
  );
  const isFilled = code.length === MAX_LEN;

  useEffect(() => {
    if (__DEV__) console.log('[VerifyAccount][A]', { code, isFilled });
  }, [code, isFilled]);

  // 완료 화면 보여주고 자동 복귀
  useEffect(() => {
    if (complete) {
      onVerified?.();
      const t = setTimeout(() => {
        if (nav.canGoBack()) nav.pop(2);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [complete, nav, onVerified]);

  const handleBack = () => nav.goBack();

  // 숫자만 허용 + 최대 4자리
  const sanitize = (t: string) => t.replace(/[^0-9]/g, '').slice(0, MAX_LEN);

  const verify = async () => {
    if (!validateCode) return code.length === MAX_LEN; // 데모 기본
    try {
      const res = await Promise.resolve(validateCode(code));
      return !!res;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!isFilled) return;
    setError(null);
    const ok = await verify();
    if (ok) {
      setComplete(true);
    } else {
      setCode('');
      setError('인증번호가 올바르지 않습니다. 다시 입력해 주세요.');
      requestAnimationFrame(() => hiddenRef.current?.focus());
    }
  };

  // 완료 화면
  if (complete) {
    return (
      <View style={s.completeContainer}>
        <View style={s.checkCircle}>
          <Text style={s.checkMark}>✓</Text>
        </View>
        <Text style={s.completeText}>등록 완료!</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={handleBack} hitSlop={8}>
          <Text style={s.icon}>{'<'}</Text>
        </Pressable>
        <Text style={s.headerTitle}>계좌 인증</Text>
        <View style={s.iconBtn} />
      </View>

      <View style={s.body}>
        <Text style={s.title}>1원을 보냈습니다.</Text>
        <Text style={s.subtitle}>입금내역에 표시된 숫자를 입력해주세요.</Text>

        <View style={s.accountPill}>
          <Text style={s.accountText} numberOfLines={1}>
            {accountDisplay || 'KB국민 123-123455-123123-123'}
          </Text>
        </View>

        {/* ✅ 숨은 단일 입력: 여기서만 실제 입력을 받음 */}
        <TextInput
          ref={hiddenRef}
          value={code}
          onChangeText={t => setCode(sanitize(t))}
          keyboardType="number-pad"
          {...(Platform.OS !== 'web' ? { inputMode: 'numeric' as any } : {})}
          autoFocus
          onSubmitEditing={isFilled ? handleSubmit : undefined}
          returnKeyType={isFilled ? 'done' : 'next'}
          blurOnSubmit={false}
          style={s.hiddenInput}
          accessibilityLabel="인증번호 입력"
        />

        {/* ✅ 보이는 4칸: 상태만 표시, 탭하면 숨은 입력에 포커스 */}
        <Pressable onPress={() => hiddenRef.current?.focus()} style={s.otpWrap}>
          {chars.map((ch, i) => {
            const active = i === code.length || !!ch; // 현재 입력 위치/채워진 칸 하이라이트
            return (
              <View key={i} style={[s.otpBox, active && s.otpBoxActive]}>
                <Text style={s.otpChar}>{ch}</Text>
              </View>
            );
          })}
        </Pressable>

        {!!error && <Text style={s.errorText}>{error}</Text>}
      </View>

      {/* 하단 인증 버튼 */}
      <View style={s.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={!isFilled}
          style={[s.submitBtn, { backgroundColor: isFilled ? PRIMARY : DISABLED }]}
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isFilled }}
        >
          <Text style={s.submitText}>인증</Text>
        </Pressable>
      </View>
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

  body: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },
  title: { marginTop: 12, fontSize: 22, fontWeight: '800', color: '#111', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  accountPill: {
    marginTop: 16,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  accountText: { fontSize: 14, color: '#111827', fontWeight: '700' },

  // 🔒 숨은 입력(접근 가능하지만 화면에서 보이지 않게)
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },

  // OTP 표시 박스
  otpWrap: {
    marginTop: 28,
    flexDirection: 'row',
    // RN 버전에 따라 gap 미지원이면 아래 두 줄로 대체:
    // justifyContent: 'space-between',
    // width: 56 * 4 + 18 * 3,
    gap: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  otpBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderColor: PRIMARY },
  otpChar: { fontSize: 20, fontWeight: '700', color: '#111' },

  errorText: { marginTop: 10, color: '#EF4444', fontWeight: '600', fontSize: 12 },

  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 10 },
  submitBtn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  // 등록 완료 화면
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
});
