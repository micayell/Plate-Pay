import { axiosInstance } from './axiosInstance';

/** 로그아웃 */
export const logout = async (): Promise<void> => {
  await axiosInstance.post('/tokens/logout');
};