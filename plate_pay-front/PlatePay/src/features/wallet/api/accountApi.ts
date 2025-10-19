// src/features/wallet/api/accountApi.ts
import { axiosInstance } from '../../../shared/api/axiosInstance';
import { Account, ApiResponse } from '../../../types/type';

export type AccountStat = {
  storeType: string;
  totalCost: number;
  count: number;
};
export const getAccounts = async (): Promise<Account[]> => {
  const res = await axiosInstance.get<ApiResponse<Account[]>>('/accounts');

  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status}: ${res.data?.message ?? '요청 실패'}`);
  }

  const { state, result, message, data } = res.data ?? {};
  const okByBody =
    (state === 200 || state === '200' || state === undefined) &&
    (result === 'success' || result === 'SUCCESS' || result === true || result === undefined);

  if (!okByBody) throw new Error(message ?? 'API 응답 포맷이 예상과 다름');
  if (!data) throw new Error('응답에 data 필드가 없습니다');

  return data as Account[];
};

/** 🔒 세션 캐시 + 중복요청 통합 */
let _accountsCache: Account[] | null = null;
let _inflight: Promise<Account[]> | null = null;

export const getAccountsOnce = async (opts?: { force?: boolean }): Promise<Account[]> => {
  const force = !!opts?.force;
  if (!force && _accountsCache) return _accountsCache;
  if (!force && _inflight) return _inflight;

  _inflight = (async () => {
    try {
      const list = await getAccounts();
      _accountsCache = list; // 성공 시에만 캐시
      console.log('계좌 목록 API 응답:', list);
      return list;
    } finally {
      _inflight = null; // 완료 후 정리
    }
  })();

  return _inflight;
};

export const clearAccountsCache = () => {
  _accountsCache = null;
  _inflight = null;
};

export const refreshAccounts = async (): Promise<Account[]> => {
  clearAccountsCache();
  return getAccountsOnce({ force: true });
};

export const registerAccount = async (accountNo: string): Promise<any> => {
  try {

    const res = await axiosInstance.post<ApiResponse<any>>('/accounts/register', { accountNo });

    if (res.data.state !== 200 || res.data.result !== 'success') {
      console.error('계좌 등록 API 응답 오류:', res.data);
      throw new Error(res.data.message || '계좌 등록 실패');
    }
    // clearAccountsCache(); // 필요 시 최신화
    return res.data.data;
  } catch (error: any) {
    console.error('계좌 등록 요청 실패! 전체 응답:', error.response);
    throw error;
  }
};

export const verifyAccount = async (
  accountNo: string,
  authCode: string,
  accountName: string,
): Promise<any> => {
  try {
    const res = await axiosInstance.post<ApiResponse<any>>('/accounts/verify', {
      accountNo,
      authCode,
      accountName,
    });
    if (res.data.state !== 200 || res.data.result !== 'success') {
      console.error('계좌 등록 API 응답 오류:', res.data);
      throw new Error(res.data.message || '계좌 등록 실패');
    }
    // clearAccountsCache(); // 필요 시 최신화
    return res.data.data;
  } catch (error: any) {
    console.error('계좌 등록 요청 실패! 전체 응답:', error.response);
    throw error;
  }
};

export const setPrimaryAccount = async (accountId: number): Promise<void> => {
  try {
    const res = await axiosInstance.patch<ApiResponse<null>>(`/accounts/${accountId}/primary`);
    if (res.data.state !== 200 || res.data.result !== 'success') {
      throw new Error(res.data.message || '주 계좌 변경 실패');
    }
    // clearAccountsCache(); // 필요 시 최신화
  } catch (error: any) {
    console.error(`주 계좌 변경 실패 (accountId: ${accountId}):`, error.response?.data || error.message);
    throw error;
  }
};


// 🔧 계좌 별명(이름) 변경
export const renameAccount = async (accountId: number, newName: string): Promise<void> => {
  const next = (newName ?? '').trim();
  if (!next) throw new Error('newName이 비어 있습니다.');
  try {
    const res = await axiosInstance.patch<ApiResponse<null>>(
      `/accounts/${accountId}`,
      { newName: next }
    );
    const okByBody =
      res?.data &&
      (res.data.state === 200 || res.data.state === '200' || res.data.state === undefined) &&
      (res.data.result === 'success' ||
        res.data.result === 'SUCCESS' ||
        res.data.result === true ||
        res.data.result === undefined);

    if (!okByBody) {
      throw new Error(res?.data?.message || '계좌 이름 변경 실패');
    }

    // ✅ 캐시가 있으면 즉시 반영(낙관적 업데이트)
    if (_accountsCache) {
      _accountsCache = _accountsCache.map(a =>
        a.accountId === accountId ? { ...a, accountName: next } : a
      );
    }
    // 필요 시 강제 최신화를 원하면 아래 주석 해제
    // clearAccountsCache();
  } catch (error: any) {
    console.error(`계좌 이름 변경 실패 (accountId: ${accountId}):`, error?.response?.data || error?.message);
    throw error;
  }
};
// 🗑️ 계좌 삭제
export const deleteAccount = async (accountId: number): Promise<void> => {
  try {
    const res = await axiosInstance.delete<ApiResponse<null>>(`/accounts/${accountId}`);

    const httpOk = res.status === 200 || res.status === 204; // 204 No Content도 허용
    const okByBody =
      !!res.data &&
      (res.data.state === 200 || res.data.state === '200' || res.data.state === undefined) &&
      (res.data.result === 'success' ||
        res.data.result === 'SUCCESS' ||
        res.data.result === true ||
        res.data.result === undefined);

    if (!(httpOk || okByBody)) {
      throw new Error(res?.data?.message || '계좌 삭제 실패');
    }

    // ✅ 캐시에도 즉시 반영
    if (_accountsCache) {
      _accountsCache = _accountsCache.filter(a => a.accountId !== accountId);
    }
  } catch (error: any) {
    console.error(`계좌 삭제 실패 (accountId: ${accountId}):`, error?.response?.data || error?.message);
    throw error;
  }
};



/** ✅ 계좌별 통계 조회 (연/월 필터는 선택) */
export const getAccountStats = async (
  accountId: number,
  opts?: { year?: number; month?: number },
): Promise<AccountStat[]> => {
  const params: Record<string, any> = {};
  if (opts?.year) params.year = opts.year;
  if (opts?.month) params.month = opts.month;
  console.log('계좌별 통계 조회 요청, accountId:', accountId, 'params:', params, opts);
  const res = await axiosInstance.get<ApiResponse<AccountStat[]>>(
    `/accounts/${accountId}/stats`,
    { params },
  );
  // HTTP OK 체크
  const httpOk = res.status === 200;
  if (!httpOk) {
    throw new Error(`HTTP ${res.status}: ${res.data?.message ?? '요청 실패'}`);
  }

  // 바디 OK 체크 (state/result 패턴 통일)
  const { state, result, message, data } = res.data ?? {};
  const okByBody =
    (state === 200 || state === '200' || state === undefined) &&
    (result === 'success' || result === 'SUCCESS' || result === true || result === undefined);

  if (!okByBody) throw new Error(message ?? '계좌별 통계 조회 실패');
  return (data ?? []) as AccountStat[];
};