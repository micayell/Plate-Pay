import { axiosInstance } from './axiosInstance';
import { PendingOrderHistory } from '../../types/type';

// 미결제 내역 조회 API
export const getPendingOrderHistory = async (): Promise<PendingOrderHistory> => {
  console.log('--- API Call: getPendingOrderHistory ---');
  const response = await axiosInstance.get('/order-histories/pending');
  console.log('--- API Response: getPendingOrderHistory ---', response.data);
  return response.data;
};
