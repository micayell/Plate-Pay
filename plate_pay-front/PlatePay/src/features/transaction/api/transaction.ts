// src/features/transaction/api/transaction.ts
import { axiosInstance } from '../../../shared/api/axiosInstance';

export type LastWeekOrder = {
  orderHistoryId: number;
  storeName: string;
  cost: number;
  isPaid: boolean;
};

export type LastWeekOrderHistory = {
  inOutHistoryId: number;
  parkingLotUid: number;
  parkingLotName: string;
  address: string;
  plateNum: string;
  bankName: string;
  accountNo: string;
  outTime: number[]; // [Y, M, D, h, m, s, nanos]
  orders: LastWeekOrder[];
  totalCost: number;
};

// ✅ 백엔드 DTO(OrderHistoryResponseDto.PaymentHistoryInfo)와 일치하는 타입 정의
export interface MonthlyHistoryItem {
  inOutHistoryId: number;
  parkingLotUid: number;
  parkingLotName: string;
  address: string;
  plateNum: string;
  bankName: string;
  accountNo: string;
  outTime: number[]; // [Y, M, D, h, m, s] 형식의 배열
  orders: {
    orderHistoryId: number;
    storeName: string;
    cost: number;
    isPaid: boolean;
  }[];
  totalCost: number;
  carModel: string;
}

export const getLastWeekOrderHistories = async (): Promise<
  LastWeekOrderHistory[]
> => {
  try {
    console.log('🔄 [API] 거래 내역 요청 시작: /order-histories/last-week');

    const res = await axiosInstance.get<LastWeekOrderHistory[]>(
      '/order-histories/last-week',
    );

    console.log('✅ [API] 거래 내역 응답 받음:');
    console.log('  - Status:', res.status);
    console.log('  - Headers:', res.headers);
    console.log('  - Data type:', typeof res.data);
    console.log('  - Data:', res.data);

    // 일부 환경에서 인증이 꼬이면 HTML(로그인 페이지)이 돌아오는 케이스 방어
    if (typeof res.data === 'string') {
      console.error('❌ [API] HTML 응답 받음 (인증 문제 가능성)');
      throw new Error('인증이 만료되었거나 응답이 올바르지 않습니다.');
    }

    // 응답 데이터 구조 확인
    if (res.data && typeof res.data === 'object') {
      // ApiResponse 래핑된 경우 체크
      if ('data' in res.data && Array.isArray((res.data as any).data)) {
        console.log('📦 [API] ApiResponse 래핑된 데이터 감지');
        return (res.data as any).data;
      }

      // 직접 배열인 경우
      if (Array.isArray(res.data)) {
        console.log('📋 [API] 직접 배열 데이터:', res.data.length, '개 항목');
        return res.data;
      }
    }

    console.warn('⚠️ [API] 예상하지 못한 데이터 구조, 빈 배열 반환');
    return [];
  } catch (error: any) {
    console.error('❌ [API] 거래 내역 요청 실패:');
    console.error('  - Error type:', error.constructor.name);
    console.error('  - Status:', error.response?.status);
    console.error('  - Data:', error.response?.data);
    console.error('  - Message:', error.message);
    console.error('  - Full error:', error);
    throw error;
  }
};

/** 월별 거래내역 조회 */
export const getMonthlyOrderHistories = async (
  year: number,
  month: number,
): Promise<Record<string, MonthlyHistoryItem[]>> => {
  try {
    const response = await axiosInstance.get<
      Record<string, MonthlyHistoryItem[]>
    >('/order-histories', {
      params: { year, month },
    });
    console.log(
      `[API RESPONSE /order-histories] for ${year}-${month}:`,
      response,
    );
    
    // ✅ [수정] 서버가 보내준 데이터 객체를 그대로 반환 (배열이 아님)
    // response.data가 객체 형태이므로 isObject와 유사한 체크를 합니다.
    return typeof response.data === 'object' && response.data !== null
      ? response.data
      : {};
  } catch (error) {
    console.error(
      `[API] Failed to fetch monthly history for ${year}-${month}:`,
      error,
    );
    // ✅ [수정] 에러 발생 시 빈 객체를 반환
    return {};
  }
};
