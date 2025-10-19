import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import AddAccountScreen from '../../features/wallet/screens/AddAccountScreen';
import VerifyAccountScreen from '../../features/wallet/screens/VerifyAccountScreen';
import ProfileNavigator from '../../features/profile/navigation/ProfileNavigator';
import AuthNavigator from '../../features/auth/navigation/AuthNavigator';
import { useAuthStore } from '../../shared/state/authStore';

export type RootStackParamList = {
  Auth: undefined;
  MainApp: undefined;
  AddAccount: undefined;
  VerifyAccount: undefined;
  ProfileStack: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'white' },
};

export default function RootNavigator() {
  const { isLoggedIn, clearAuthData } = useAuthStore();

  // // 앱이 시작될 때마다 인증 정보를 초기화하는 로직 추가
  // useEffect(() => {
  //   console.log('[Auth] Clearing all authentication data for testing.');
  //   clearAuthData();
  // }, []);

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="MainApp" component={BottomTabNavigator} />
            <Stack.Screen name="AddAccount" component={AddAccountScreen} />
            <Stack.Screen
              name="VerifyAccount"
              component={VerifyAccountScreen}
            />
            <Stack.Screen name="ProfileStack" component={ProfileNavigator} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
