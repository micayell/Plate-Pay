import { create } from 'zustand';
import FCMService from '../../services/FCMService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MemberInfo {
  memberUid: number;
  name: string | null;
  nickname: string | null;
  email: string;
  phoneNum: string | null;
  loginType: 'kakao' | 'ssafy';
  isActive: boolean | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  memberInfo: MemberInfo | null;
  isLoggedIn: boolean;
  fcmTokenRegistered: boolean; // FCM 토큰이 이미 등록되었는지 추적
  setAuthData: (data: Partial<Omit<AuthState, 'setAuthData' | 'clearAuthData' | 'fcmTokenRegistered'>>) => void;
  clearAuthData: () => void;
}

export const useAuthStore = create<AuthState>()(set => ({
  accessToken: null,
  refreshToken: null,
  memberInfo: null,
  isLoggedIn: false,
  fcmTokenRegistered: false,

  // 두 함수의 로직을 하나로 올바르게 합친 버전입니다.
  setAuthData: data =>
    set(state => {
      const newState = { ...state, ...data };

      if (data.isLoggedIn !== undefined) {
        // 1. isLoggedIn이 명시적으로 주어지면, 그 값을 최우선으로 사용합니다.
        newState.isLoggedIn = data.isLoggedIn;
      } else if (data.accessToken) {
        // 2. 새로운 accessToken이 들어오면, 로그인 된 것으로 간주합니다.
        newState.isLoggedIn = true;
      } else if (data.accessToken === null) {
        // 3. accessToken이 null로 설정되면, 로그아웃 된 것으로 간주합니다.
        newState.isLoggedIn = false;
      }

      // FCM 토큰 전송 로직: 최초 로그인 시에만 실행 (매우 엄격한 조건)
      const isFirstLogin = (
        // 이전에 로그인 상태가 아니었고
        !state.isLoggedIn &&
        // 현재 로그인 상태가 되고
        newState.isLoggedIn &&
        // 토큰과 회원정보가 모두 있고
        newState.accessToken &&
        newState.memberInfo &&
        // FCM 토큰이 아직 등록되지 않은 경우
        !state.fcmTokenRegistered
      );

      if (isFirstLogin) {
        FCMService.getCurrentToken()
          .then(async (token) => {
            if (token) {
              const result = await FCMService.sendTokenToServer(token);
              if (result.success) {
                // FCM 토큰 등록 성공을 표시
                set(currentState => ({ ...currentState, fcmTokenRegistered: true }));
              }
            }
          })
          .catch(error => {
            // FCM 토큰 처리 중 오류 발생시 조용히 처리
          });
      }
      // 4. 위 모든 경우에 해당하지 않으면 (예: memberInfo만 업데이트),
      //    isLoggedIn 상태를 변경하지 않고 기존 상태를 유지합니다.

      return newState;
    }),

  clearAuthData: () =>
    set({
      accessToken: null,
      refreshToken: null,
      memberInfo: null,
      isLoggedIn: false,
      fcmTokenRegistered: false, // 로그아웃 시 FCM 토큰 등록 상태도 초기화
    }),
}));