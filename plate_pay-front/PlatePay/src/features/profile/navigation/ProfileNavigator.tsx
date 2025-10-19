import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
// EditNameScreen을 EditNicknameScreen으로 변경합니다.
import EditNicknameScreen from '../screens/EditNicknameScreen';
import EditPhoneScreen from '../screens/EditPhoneScreen';
import EditPasswordScreen from '../screens/EditPasswordScreen';
import SetNewPasswordScreen from '../screens/SetNewPasswordScreen';
import FaceRecognitionScreen from '../screens/FaceRecognitionScreen';
import { MemberInfo } from '../../../shared/state/authStore';

export type ProfileStackParamList = {
  Profile: undefined;
  // EditName을 EditNickname으로 변경하고 파라미터 타입도 수정합니다.
  EditNickname: { userInfo: MemberInfo };
  EditPhone: { userInfo: MemberInfo };
  EditPassword: { userInfo: MemberInfo };
  SetNewPassword: undefined;
  FaceRecognition: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      {/* Stack.Screen의 name과 component를 수정합니다. */}
      <Stack.Screen name="EditNickname" component={EditNicknameScreen} />
      <Stack.Screen name="EditPhone" component={EditPhoneScreen} />
      <Stack.Screen name="EditPassword" component={EditPasswordScreen} />
      <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
      <Stack.Screen name="FaceRecognition" component={FaceRecognitionScreen} />
    </Stack.Navigator>
  );
}