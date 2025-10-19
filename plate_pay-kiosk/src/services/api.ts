// API 베이스 URL (나중에 실제 백엔드 URL로 변경) 'http://13.125.255.131:80'
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://pcarchu-kiosk.duckdns.org';

// 차량 정보 타입 정의
export interface CarInfo {
  id: string;
  plateNumber: string;
  model?: string;
  color?: string;
}

// API 응답 타입
export interface CarSearchResponse {
  success: boolean;
  data: CarInfo[];
  message?: string;
}

// 결제 요청 타입
export interface PaymentRequest {
  amount: number;
  carNumber: string;
  password: string;
  orderItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

// 결제 응답 타입
export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  errorCode?: string;
}



// 차량 번호 뒷자리로 차량 정보 검색
export const searchCarsByLastDigits = async (
    lastDigits: string,
    parkingLotId: number = 1
): Promise<CarSearchResponse> => {
  console.log(`[API CALL] searchCarsByLastDigits 호출됨. lastDigits: ${lastDigits}, parkingLotId: ${parkingLotId}`);
  try {
    const response = await fetch(
        `${API_BASE_URL}/api/v1/plate-pays/${parkingLotId}/${encodeURIComponent(lastDigits)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const raw = await response.json();
    // [개선] JSON.stringify를 사용해 객체 내용을 상세하게 출력
    console.log("[API RESPONSE] searchCarsByLastDigits 결과:", JSON.stringify(raw, null, 2));

    // 변환 로직: state=200 & result="success" → success=true 로 매핑
    return {
      success: raw.state === 200 && raw.result === "success",
      data: (raw.data || []).map((car: any) => ({
        id: car.carUid,
        plateNumber: car.plateNum,
        model: car.carModel,
        color: car.color,
      })),
      message: raw.message,
    };
  } catch (error) {
    console.error('[API ERROR] searchCarsByLastDigits 오류:', error);

    // 개발용 목업 데이터 (실제 API 연결 전까지 사용)
    return {
      success: true,
      data: [
        { id: '1', plateNumber: `123가 ${lastDigits}` },
        { id: '2', plateNumber: `456나 ${lastDigits}` },
        { id: '3', plateNumber: `789다 ${lastDigits}` },
      ],
      message: '개발용 목업 데이터입니다.',
    };
  }
};

// 결제 요청
export const orderMenu = async (
    plateNum: string,
    password: string,
    cost: number,
    storeId: number = 1
): Promise<PaymentResponse> => {
  const requestBody = { password, cost, storeId };

  console.log(`[API CALL] orderMenu 호출됨. plateNum: ${plateNum}`);
  console.log(`  > Request Body:`, JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(
        `${API_BASE_URL}/api/v1/plate-pays/${encodeURIComponent(plateNum)}`, // ← 인코딩 중요!
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
    );

    if (!response.ok) {
      // 백엔드 에러 바디를 읽어 메시지 전달
      let msg = `HTTP error! status: ${response.status}`;
      try {
        const errBody = await response.json();
        console.error('[API ERROR] orderMenu 에러 응답:', JSON.stringify(errBody, null, 2));
        if (errBody?.message) msg = errBody.message;
      } catch {}
      return { success: false, message: msg };
    }

    const raw = await response.json();
    console.log('[API RESPONSE] orderMenu 결과 (Raw):', JSON.stringify(raw, null, 2));

    // 백엔드 케이스 A) ResponseDto 포맷: { state, result, message, data, error }
    if (raw && typeof raw === 'object' && 'state' in raw) {
      const ok =
          (raw.state === 200 || raw.state === '200') &&
          (raw.result === 'success' || raw.result === true);

      return {
        success: ok,
        transactionId: raw?.data?.transactionId ?? raw?.data?.id ?? undefined,
        message: raw?.message ?? (ok ? '주문 성공' : '주문 실패'),
        errorCode: raw?.error?.code ?? undefined,
      };
    }

    // 백엔드 케이스 B) boolean만 내려오는 경우 (KioskController가 boolean 반환)
    if (typeof raw === 'boolean') {
      return { success: raw, message: raw ? '주문 성공' : '주문 실패' };
    }

    // 기타 예외 응답
    return {
      success: !!raw?.success,
      transactionId: raw?.transactionId,
      message: raw?.message ?? '응답 형식이 예상과 다릅니다.',
      errorCode: raw?.errorCode,
    };
  } catch (error) {
    console.error('[API ERROR] orderMenu 오류:', error);
    return {
      success: false,
      message: '결제 처리 중 오류가 발생했습니다.',
    };
  }
};
