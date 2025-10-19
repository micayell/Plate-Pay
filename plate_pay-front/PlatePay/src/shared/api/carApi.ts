
import axiosInstance from './axiosInstance';
import {
  Car,
  ApiResponse,
  VehicleRegistrationRequest,
  VehicleRegistrationResponse,
} from '../../types/type';

export const getMyCars = async (): Promise<Car[]> => {
  try {
    const response = await axiosInstance.get<ApiResponse<Car[]>>('/cars');
    // data 필드가 null이나 undefined일 경우 빈 배열을 반환하도록 수정
    return response.data.data || [];
  } catch (error) {
    console.error("Failed to fetch cars:", error);
    throw error;
  }
};

export const startVehicleRegistration = async (
  data: VehicleRegistrationRequest,
): Promise<VehicleRegistrationResponse> => {
  try {
    const response = await axiosInstance.post<VehicleRegistrationResponse>(
      '/cars/car-registration-a/issuance/initial',
      data,
    );
    return response.data;
  } catch (error) {
    console.error('Failed to start vehicle registration:', error);
    throw error;
  }
};

export const confirmVehicleRegistration = async (): Promise<void> => {
  try {
    // Request와 Response body가 없으므로, URL만으로 POST 요청
    await axiosInstance.post('/cars/car-registration-a/issuance/secondary');
  } catch (error) {
    console.error('Failed to confirm vehicle registration:', error);
    throw error;
  }
};

export const deleteCar = async (carId: number): Promise<void> => {
  try {
    // API 응답의 data는 사용하지 않으므로 반환값은 void로 처리
    await axiosInstance.delete(`/cars/${carId}`);
  } catch (error) {
    console.error(`Failed to delete car with ID ${carId}:`, error);
    throw error;
  }
};

export const updateCarNickname = async (
  carId: number,
  nickname: string,
): Promise<Car> => {
  try {
    // Swagger에 따라 Request Body는 nickname 문자열만 보내도록 수정합니다.
    const response = await axiosInstance.patch<ApiResponse<Car>>(
      `/cars/${carId}`,
      nickname,
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to update nickname for car ${carId}:`, error);
    throw error;
  }
};