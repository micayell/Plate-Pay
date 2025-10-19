import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import AuthHomeScreen from '../screens/AuthHomeScreen'; // LoginScreen -> AuthHomeScreen
import KakaoLoginScreen from '../screens/KakaoLoginScreen';
import SsafyLoginScreen from '../screens/SsafyLoginScreen';
import KakaoSignupScreen from '../screens/KakaoSignupScreen';
import SsafySignupScreen from '../screens/SsafySignupScreen';
import PinSetupScreen from '../screens/PinSetupScreen';
import { MemberInfo } from '../../../shared/state/authStore';

export type AuthStackParamList = {
  AuthHome: undefined; // 'Login'을 'AuthHome'으로 변경
  KakaoLogin: undefined;
  SsafyLogin: undefined;
  KakaoSignup: { memberInfo: MemberInfo };
  SsafySignup: { memberInfo: MemberInfo };
  PinSetup: {
    name: string | null;
    nickname: string | null;
    phoneNum: string;
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthHome" component={AuthHomeScreen} />
      <Stack.Screen name="KakaoLogin" component={KakaoLoginScreen} />
      <Stack.Screen name="SsafyLogin" component={SsafyLoginScreen} />
      <Stack.Screen name="KakaoSignup" component={KakaoSignupScreen} />
      <Stack.Screen name="SsafySignup" component={SsafySignupScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
    </Stack.Navigator>
  );
}

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;
