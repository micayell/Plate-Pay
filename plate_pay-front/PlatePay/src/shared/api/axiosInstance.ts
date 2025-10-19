import axios from 'axios';
import { API_BASE_URL } from './api';
import { useAuthStore } from '../state/authStore';

// 1. Axios 인스턴스 생성
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. 요청 인터셉터: 모든 API 요청에 액세스 토큰을 자동으로 추가합니다.
axiosInstance.interceptors.request.use(
  config => {
    const { accessToken } = useAuthStore.getState();
    // ✅ 토큰 존재 여부와 헤더 추가 과정을 로그로 확인합니다.
    console.log(`Axios Interceptor: Request to ${config.url}`);
    console.log('Axios Interceptor: Attaching token:', accessToken);

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // FormData인 경우 Content-Type을 제거하여 axios가 자동으로 multipart/form-data 설정하도록 함
    if (config.data instanceof FormData) {
      console.log('Axios Interceptor: FormData detected, removing Content-Type');
      delete config.headers['Content-Type'];
    }

    console.log('Axios Interceptor: Final Headers:', config.headers);
    return config;
  },
  error => Promise.reject(error),
);

// 큐에 저장될 항목의 타입을 정의합니다.
interface FailedQueueItem {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

// 토큰 재발급 중인지 여부를 추적하는 변수
let isRefreshing = false;
// 재발급이 진행되는 동안 실패한 요청들을 저장하는 배열 (타입을 명시해줍니다)
let failedQueue: FailedQueueItem[] = [];

// processQueue 함수의 error 파라미터 타입을 any로 변경하여 타입 에러를 해결합니다.
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 3. 응답 인터셉터: 401 에러(토큰 만료) 발생 시 토큰 재발급을 시도합니다.
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // 401 에러이고, 재시도한 요청이 아닐 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 이미 토큰 재발급이 진행 중이면, 현재 요청을 큐에 추가하고 대기
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            // 기존 헤더를 복사하고 새 Authorization 헤더를 추가하여 교체합니다.
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: 'Bearer ' + token,
            };
            return axiosInstance(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setAuthData, clearAuthData } =
        useAuthStore.getState();

      if (!refreshToken) {
        isRefreshing = false;
        clearAuthData();
        return Promise.reject(error);
      }

      try {
        console.log('Access Token 만료, Refresh Token으로 재발급 시도');
        const { data } = await axios.post(`${API_BASE_URL}/tokens/reissue`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;

        // Zustand 스토어와 Axios 인스턴스 헤더에 새 토큰 저장
        // (authStore가 수정되어 이제 이 코드는 정상 동작합니다)
        setAuthData({ accessToken: newAccessToken });

        // 기존 common 헤더를 복사하고 새 Authorization 헤더를 추가하여 안전하게 교체합니다.
        axiosInstance.defaults.headers.common = {
          ...axiosInstance.defaults.headers.common,
          Authorization: `Bearer ${newAccessToken}`,
        };

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        // 대기 중이던 모든 요청에 새 토큰을 전달하여 재실행
        processQueue(null, newAccessToken);

        // 원래 실패했던 요청을 다시 실행
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Refresh Token 재발급 실패', refreshError);
        // 재발급 실패 시 모든 인증 정보 삭제 및 큐에 있던 요청들 실패 처리
        processQueue(refreshError, null);
        clearAuthData();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
