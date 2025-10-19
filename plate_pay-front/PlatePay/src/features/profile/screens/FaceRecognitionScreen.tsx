import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import PasswordVerificationModal from '../../../components/common/PasswordVerificationModal';
import { uploadFaceImage } from '../../../shared/api/memberApi';

const { width, height } = Dimensions.get('window');

const FaceRecognitionScreen = () => {
  const navigation = useNavigation();
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionStep, setRecognitionStep] = useState<'ready' | 'detecting' | 'validating' | 'success' | 'failed'>('ready');
  const [attemptCount, setAttemptCount] = useState(0);
  const [guidanceMessage, setGuidanceMessage] = useState('정면을 바라보고 얼굴을 프레임에 맞춰주세요');
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [compressedPhoto, setCompressedPhoto] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const autoDetectInterval = useRef<NodeJS.Timeout | null>(null);
  const camera = React.useRef<Camera>(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const maxAttempts = 3;

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // 비밀번호 인증 후 자동 감지 시작
  useEffect(() => {
    if (isPasswordVerified && !showPreview && !isRecognizing && attemptCount < maxAttempts) {
      startAutoDetection();
    } else {
      stopAutoDetection();
    }

    return () => stopAutoDetection();
  }, [isPasswordVerified, showPreview, isRecognizing, attemptCount]);

  // 자동 얼굴 감지 시작
  const startAutoDetection = () => {
    if (isAutoDetecting) return;

    setIsAutoDetecting(true);
    setGuidanceMessage('얼굴을 자동으로 감지하고 있습니다...');

    // 초당 3번 (333ms마다) 감지
    autoDetectInterval.current = setInterval(() => {
      attemptFaceDetection();
    }, 333);
  };

  // 자동 감지 중지
  const stopAutoDetection = () => {
    if (autoDetectInterval.current) {
      clearInterval(autoDetectInterval.current);
      autoDetectInterval.current = null;
    }
    setIsAutoDetecting(false);
  };

  // 자동 얼굴 감지 시도
  const attemptFaceDetection = async () => {
    if (!device || !camera.current || isRecognizing || attemptCount >= maxAttempts) return;

    try {
      // 조용히 사진 촬영 (UI 업데이트 없이)
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'speed',
        flash: 'off',
        enableAutoRedEyeReduction: false,
        skipMetadata: true,
        enableShutterSound: false,
      });

      if (photo && photo.path) {
        const imageUri = `file://${photo.path}`;
        console.log('[AUTO-DETECT] 사진 촬영 완료, API 호출 중...');

        // 바로 API 호출 (UI 업데이트 없이)
        try {
          const result = await uploadFaceImage(imageUri);

          // 성공! 자동 감지 중지하고 결과 표시
          stopAutoDetection();
          setCapturedPhoto(imageUri);
          setCompressedPhoto(result.compressedUri);
          setShowPreview(true);
          handleRecognitionSuccess();

        } catch (apiError: any) {
          console.log('[AUTO-DETECT] API 실패, 계속 시도 중:', apiError.message);
          // 실패해도 계속 시도 (에러 UI 표시 안함)
        }
      }
    } catch (error) {
      console.log('[AUTO-DETECT] 촬영 실패, 계속 시도 중:', error);
      // 촬영 실패해도 계속 시도
    }
  };

  const takePhoto = async () => {
    if (!device || !camera.current || isRecognizing || attemptCount >= maxAttempts) return;

    try {
      setIsRecognizing(true);
      setRecognitionStep('detecting');
      setGuidanceMessage('사진을 촬영하는 중...');

      // 실제 사진 촬영 (강한 압축 옵션 적용)
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'speed', // 'quality' 대신 'speed'로 변경하여 파일 크기 줄임
        flash: 'off',
        enableAutoRedEyeReduction: false,
        skipMetadata: true, // 메타데이터 제거로 파일 크기 감소
        enableShutterSound: false, // 셔터 사운드 비활성화
      });

      // 사진이 제대로 촬영되었는지 확인
      if (photo && photo.path) {
        const imageUri = `file://${photo.path}`;
        setCapturedPhoto(imageUri);
        setShowPreview(true);
        setIsRecognizing(false);
        setGuidanceMessage('촬영된 사진을 확인하세요');
      } else {
        handleRecognitionFailure('사진 촬영에 실패했습니다.');
      }
    } catch (error) {
      console.error('Camera error:', error);
      handleRecognitionFailure('카메라 오류가 발생했습니다.');
    }
  };

  // 사진 확인 (업로드 진행)
  const confirmPhoto = async () => {
    if (!capturedPhoto) return;

    try {
      setIsRecognizing(true);
      setShowPreview(false);
      setRecognitionStep('validating');
      setGuidanceMessage('얼굴을 등록하는 중...');

      // 실제 얼굴 인식 등록 API 호출
      const result = await uploadFaceImage(capturedPhoto);

      // 압축된 이미지를 미리보기용으로 저장
      setCompressedPhoto(result.compressedUri);

      handleRecognitionSuccess();
    } catch (apiError: any) {
      console.error('Face upload API error:', apiError);

      // 에러가 발생해도 압축된 이미지를 임시로 생성해서 확인 가능하도록
      try {
        // 임시로 압축 결과를 확인하기 위해 실제 압축만 수행
        const ImageResizer = require('react-native-image-resizer');
        const tempCompressed = await ImageResizer.createResizedImage(
          capturedPhoto,
          1024,
          1024,
          'JPEG',
          75,
          0,
          undefined,
          false,
        );
        setCompressedPhoto(tempCompressed.uri);
        console.log('[DEBUG] 압축된 이미지 확인용:', tempCompressed.size, 'bytes');
      } catch (e) {
        console.log('[DEBUG] 압축 미리보기 실패');
      }

      // Network Error나 연결 문제인 경우 로그아웃하지 않고 에러 메시지만 표시
      if (apiError.message?.includes('Network Error') || !apiError.response) {
        handleRecognitionFailure('네트워크 연결을 확인해주세요. 다시 시도해주세요.');
      } else if (apiError.response?.status === 401) {
        handleRecognitionFailure('인증에 문제가 있습니다. 다시 시도해주세요.');
      } else {
        handleRecognitionFailure('얼굴 등록에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  // 사진 재촬영
  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCompressedPhoto(null);
    setShowPreview(false);
    setRecognitionStep('ready');
    setGuidanceMessage('정면을 바라보고 얼굴을 프레임에 맞춰주세요');
  };

  const handleRecognitionSuccess = () => {
    setRecognitionStep('success');
    setGuidanceMessage('등록 성공! 등록된 이미지를 확인해보세요.');
  };

  const handleRecognitionFailure = (message: string) => {
    setRecognitionStep('failed');
    setAttemptCount(prev => prev + 1);
    setGuidanceMessage(message);
    setIsRecognizing(false);

    setTimeout(() => {
      if (attemptCount + 1 >= maxAttempts) {
        Alert.alert(
          '인증 실패',
          `${maxAttempts}번 시도 후에도 인증에 실패했습니다. 나중에 다시 시도해주세요.`,
          [
            {
              text: '확인',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      } else {
        setRecognitionStep('ready');
        setGuidanceMessage('정면을 바라보고 얼굴을 프레임에 맞춰주세요');
      }
    }, 2000);
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handlePasswordVerifySuccess = () => {
    setIsPasswordVerified(true);
    setShowPasswordModal(false);
  };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    navigation.goBack();
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.header}>카메라 권한 필요</Text>
          <Text style={styles.subtitle}>얼굴 인식을 위해 카메라 권한이 필요합니다.</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.header}>카메라를 찾을 수 없음</Text>
          <Text style={styles.subtitle}>전면 카메라를 사용할 수 없습니다.</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>2차 인증 - 얼굴 인식</Text>
        <Text style={styles.subtitle}>
          밝은 곳에서 정면을 바라보고{'\n'}얼굴 전체가 잘 보이도록 촬영해주세요
        </Text>

        <View style={styles.cameraContainer}>
          {showPreview && capturedPhoto ? (
            // 미리보기 화면
            <>
              <View style={styles.imagePreviewContainer}>
                {compressedPhoto && (
                  <View style={styles.imageSection}>
                    <Text style={styles.imageLabel}>등록된 이미지</Text>
                    <Image source={{ uri: compressedPhoto }} style={styles.previewImage} />
                  </View>
                )}
              </View>
              <View style={styles.overlay}>
                <View style={styles.previewButtons}>
                  <TouchableOpacity
                    style={[styles.previewButton, styles.retakeButton]}
                    onPress={retakePhoto}
                  >
                    <Text style={styles.retakeButtonText}>다시 촬영</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.previewButton, styles.confirmButton]}
                    onPress={() => navigation.goBack()}
                  >
                    <Text style={styles.confirmButtonText}>
                      확인
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            // 카메라 화면
            <>
              <Camera
                ref={camera}
                style={styles.camera}
                device={device}
                isActive={isPasswordVerified && !showPreview}
                photo={true}
              />

              <View style={styles.overlay}>
                <View style={styles.faceFrame} />
              </View>
            </>
          )}
        </View>

        <View style={styles.statusContainer}>
          <Text style={[
            styles.statusText,
            recognitionStep === 'failed' && styles.statusTextError,
            recognitionStep === 'success' && styles.statusTextSuccess
          ]}>
            {!isPasswordVerified ? '비밀번호 인증 후 이용 가능합니다' : guidanceMessage}
          </Text>
          {attemptCount > 0 && attemptCount < maxAttempts && (
            <Text style={styles.attemptText}>
              시도: {attemptCount}/{maxAttempts}
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PasswordVerificationModal
        visible={showPasswordModal}
        onClose={handlePasswordModalClose}
        onVerifySuccess={handlePasswordVerifySuccess}
        title="얼굴 인식 인증"
        description="얼굴 인식 기능을 사용하려면&#10;결제 비밀번호 6자리를 입력해주세요"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 40,
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    paddingVertical: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 200,
    height: 250,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderRadius: 100,
    backgroundColor: 'transparent',
  },
  statusContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#F7F7F7',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#EA0000',
    fontSize: 16,
    fontWeight: '600',
  },
  captureButton: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 45,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  captureButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  statusTextError: {
    color: '#EA0000',
  },
  statusTextSuccess: {
    color: '#00AA00',
  },
  attemptText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
    textAlign: 'center',
  },
  previewButtons: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  retakeButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
  },
  imageSection: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 5,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
  },
});

export default FaceRecognitionScreen;