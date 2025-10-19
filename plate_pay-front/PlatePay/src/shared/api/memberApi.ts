import { axiosInstance } from './axiosInstance';
import { MemberInfo } from '../state/authStore';
// authStore에서 상태를 직접 가져오기 위해 import 합니다.
import { useAuthStore } from '../state/authStore';
import axios from 'axios';
import { API_BASE_URL } from './api';
import ImageResizer from 'react-native-image-resizer';

export interface UpdateMemberData {
  name: string | null;
  nickname: string | null;
  phoneNum: string | null;
  payPwd: string | null;
}

export const getMemberInfo = async (memberUid: number): Promise<MemberInfo> => {
  const response = await axiosInstance.get<MemberInfo>(`/members/${memberUid}`);
  return response.data;
};

export const deleteMember = async (): Promise<void> => {
  await axiosInstance.delete(`/members`);
};

export const updateMemberInfo = async (
  memberUid: number,
  updateData: Partial<UpdateMemberData>,
): Promise<MemberInfo> => {
  // 서버에 물어보는 대신, 가장 최신 상태를 담고 있는 전역 스토어에서 데이터를 가져옵니다.
  const { memberInfo: latestUserInfo } = useAuthStore.getState();

  if (!latestUserInfo) {
    // 혹시 모를 예외 상황 방지
    throw new Error('User info not found in store. Cannot perform update.');
  }

  // 스토어 데이터에 새로운 변경 사항을 병합합니다.
  const combinedData: MemberInfo = {
    ...latestUserInfo,
    ...updateData,
  };

  // 서버에 보낼 payload를 생성합니다.
  // updateData에 있는 변경된 필드만 payload에 포함시킵니다.
  const payload: Partial<UpdateMemberData> = { ...updateData };

  console.log(`[API CALL] updateMemberInfo with memberUid: ${memberUid}`, payload);

  // 서버에 업데이트를 요청합니다.
  await axiosInstance.put(`/members/${memberUid}`, payload);

  // 서버에 다시 물어보지 않고, 우리가 방금 만든 최신 상태를
  // 즉시 반환하여 호출한 쪽에서 스토어를 업데이트하게 합니다.
  return combinedData;
};

// 얼굴 인식 등록 API - 강력한 이미지 압축 적용
export const uploadFaceImage = async (imageUri: string): Promise<{ compressedUri: string }> => {
  console.log('[API CALL] uploadFaceImage');
  console.log('[DEBUG] Original image URI:', imageUri);

  // 이미지를 500KB 이하로 강력 압축
  let compressedImageUri: string;
  try {
    console.log('[DEBUG] Compressing image to 500KB or less...');

    const compressedImage = await ImageResizer.createResizedImage(
      imageUri,
      1024, // 최대 너비 (800 → 1024로 증가)
      1024, // 최대 높이 (800 → 1024로 증가)
      'JPEG', // 포맷
      75, // 품질 (60 → 75로 향상)
      0, // 회전
      undefined, // outputPath
      false, // keepMeta
    );

    compressedImageUri = compressedImage.uri;
    console.log('[DEBUG] Compressed image info:', {
      originalUri: imageUri,
      compressedUri: compressedImageUri,
      size: compressedImage.size,
    });

    // 만약 여전히 700KB보다 크면 품질을 조금 낮춘다 (500KB → 700KB로 완화)
    if (compressedImage.size && compressedImage.size > 700000) {
      console.log('[DEBUG] Still too large, compressing more...');
      const secondCompression = await ImageResizer.createResizedImage(
        compressedImageUri,
        800, // 더 작은 크기 (600 → 800으로 증가)
        800,
        'JPEG',
        65, // 더 낮은 품질 (40 → 65로 향상).
        0,
        undefined,
        false,
      );
      compressedImageUri = secondCompression.uri;
      console.log('[DEBUG] Second compression result:', secondCompression.size);
    }

  } catch (compressionError) {
    console.error('[ERROR] Image compression failed:', compressionError);
    throw new Error('이미지 압축에 실패했습니다.');
  }

  // FormData 생성 (압축된 이미지 사용)
  const formData = new FormData();
  formData.append('file', {
    uri: compressedImageUri,
    type: 'image/jpeg',
    name: 'face_image.jpg',
  } as any);

  // 먼저 다른 API가 작동하는지 테스트
  console.log('[DEBUG] Testing other API first...');
  try {
    const { memberInfo } = useAuthStore.getState();
    if (memberInfo?.memberUid) {
      const testResponse = await axiosInstance.get(`/members/${memberInfo.memberUid}`);
      console.log('[DEBUG] Other API works! Status:', testResponse.status);
    }
  } catch (testError: any) {
    console.error('[DEBUG] Other API also failed:', testError.message);
    console.error('[DEBUG] This suggests a general network issue');
  }

  console.log('[DEBUG] Making face upload request with fetch...');

  // 토큰 가져오기
  const { accessToken } = useAuthStore.getState();

  try {
    const response = await fetch(`${API_BASE_URL}/members/face-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        // Content-Type은 FormData 사용시 자동 설정되므로 제거
      },
      body: formData,
    });

    console.log('[DEBUG] Fetch response status:', response.status);

    if (response.ok) {
      const responseData = await response.json();
      console.log('[DEBUG] Success! Response:', responseData);

      // 백엔드 응답 구조에 맞춰 성공/실패 확인
      if (responseData?.state === 200 && responseData?.result === 'success') {
        console.log('[DEBUG] Face upload successful:', responseData.message);
        return { compressedUri: compressedImageUri };
      } else {
        throw new Error(responseData?.message || '얼굴 등록에 실패했습니다.');
      }
    } else {
      const errorData = await response.text();
      console.error('[DEBUG] Response not ok:', response.status, errorData);
      throw new Error(`서버 오류: ${response.status}`);
    }
  } catch (error: any) {
    console.error('[DEBUG] Upload failed:', error);

    if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
      throw new Error('네트워크 연결을 확인해주세요.');
    } else {
      throw new Error(error.message || '얼굴 등록에 실패했습니다.');
    }
  }
};

/**
 * 결제 비밀번호가 올바른지 검증합니다.
 * @param password 검증할 결제 비밀번호
 * @returns 비밀번호가 일치하면 true, 그렇지 않으면 false를 반환합니다.
 */
export const validatePassword = async (password: string): Promise<boolean> => {
  try {
    const response = await axiosInstance.post<{ result: boolean }>('/members/pwd-validation', {
      password: password,
    });
    return response.data.result;
  } catch (error) {
    console.error('[API ERROR] 비밀번호 검증 실패:', error);
    return false;
  }
};
