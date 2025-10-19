export interface Order {
  orderHistoryId: number;
  storeName: string;
  cost: number;
  isPaid: boolean;
}

export interface PendingOrderHistory {
  inOutHistoryId: number;
  parkingLotUid: number;
  parkingLotName: string;
  address: string;
  plateNum: string;
  bankName: string;
  accountNo: string;
  outTime: string | null;
  orders: Order[];
  totalCost: number;
}

export interface Car {
  carUid: number;
  nickName: string;
  plateNum: string;
  carModel: string;
  imgUrl: string; // imgUrl 필드 추가
}

export interface Account {
  accountId: number;
  bankName: string;
  accountName: string;
  accountNo: string;
  main: boolean;
}

export interface VehicleRegistrationRequest {
  name: string;
  nickname: string;
  plateNum: string;
  ssn: string; // 주민번호 앞 6자리 + 뒤 7자리
}

export interface VehicleRegistrationResponse {
  code: string;
  jobIndex?: number;
  threadIndex?: number;
  jti?: string;
  twoWayTimestamp?: number;
}

export interface ApiResponse<T> {
  state: number;
  result: string;
  message: string | null;
  data: T;
  error: any[];
}

export interface MemberInfo {
  memberUid: number;
  name: string;
  nickname: string;
  email: string;
  phoneNum: string;
  loginType: string;
  isActive: boolean;
}

export interface CardInfo {
  cardId: number;
  cardNo: string;
  cardName: string;
}

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MemberInfo } from '../shared/state/authStore';

export type AuthStackParamList = {
  Login: undefined;
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

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;