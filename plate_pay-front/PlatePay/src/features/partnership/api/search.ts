import { axiosInstance } from '../../../shared/api/axiosInstance';
import { useAuthStore } from '../../../shared/state/authStore';

export const searchShops = async (
  lat: number,
  lon: number,
  type?: string | null,
  keyword?: string | null,
  size?: number,
  page?: number,
) => {
  const params: Record<string, any> = { lat: 35.147, lon: 126.917, size, page };
  if (type != null && type !== '') params.type = type;
  if (keyword != null && keyword !== '') params.keyword = keyword;

  // ✅ Bearer 토큰 직접 주입
  const accessToken  =
    'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJpY2owMTAzQGtha2FvLmNvbSIsIm1lbWJlclVpZCI6MiwiYXV0aCI6IlJPTEVfVVNFUiIsImlzcyI6InBsYXRlIHBheSIsImlhdCI6MTc1ODUyNDE5NSwiZXhwIjoxNzU4NTI3Nzk1fQ.jLhee9TvhsYRxmUag7oflCiuu9JoiV-KJMeg0Hh9Ovv_OpNF-CD9kgUiVnQ0cbrmNlV3KoVOxZHXRqGzQDUT-w';
  console.log('액세스 토큰:', accessToken);
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : undefined;
  console.log('파라미터', params);
  const res = await axiosInstance.get('/stores/search/stores', { params });
  console.log('검색 결과:', res);
  return res.data.data.stores.content;
};

export const searchParkings = async (
  lat: number,
  lon: number,
  keyword?: string | null,
  size?: number,
  page?: number,
) => {
  const params: Record<string, any> = { lat: 35.147, lon: 126.917, size, page };
  if (keyword != null && keyword !== '') params.keyword = keyword;
  console.log('파라미터', params);
  // ✅ Bearer 토큰 직접 주입
  const { accessToken } = useAuthStore.getState();
  console.log('액세스 토큰:', accessToken);
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : undefined;

  const res = await axiosInstance.get('/stores/search/parkingLots', {
    params,
    headers,
  });

  console.log('검색 결과:', res);
  return res.data.data.parkingLots.content;
};
