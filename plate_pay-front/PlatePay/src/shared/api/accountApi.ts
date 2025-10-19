import { axiosInstance } from './axiosInstance';
import { Account, ApiResponse } from '../../types/type';

export const getAccounts = async (): Promise<Account[]> => {
  try {
    const response = await axiosInstance.get<ApiResponse<Account[]>>('/accounts');
    // data 필드가 null이나 undefined일 경우 빈 배열을 반환하도록 수정
    return response.data.data || [];
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    throw error;
  }
};

