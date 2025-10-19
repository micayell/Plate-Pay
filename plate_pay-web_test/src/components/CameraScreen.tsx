import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-webgl';
import './CameraScreen.css';

type ParkingAction = 'enter' | 'leave';

interface CarDetection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  class: string;
  confidence: number;
}

interface LicensePlateDetection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
}

interface DockerAPIResponse {
  inference_id: string;
  time: number;
  image: {
    width: number;
    height: number;
  };
  predictions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
    class_id: number;
  }>;
}

const CameraScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [outputText, setOutputText] = useState('COCO-SSD 모델 초기화 중...');
  const [isDetecting, setIsDetecting] = useState(false);
  const [licensePlateNumber, setLicensePlateNumber] = useState<string | null>(null);

  // 설정 상태들
  const [parkingAction, setParkingAction] = useState<ParkingAction>('enter');
  const [parkingLotName, setParkingLotName] = useState<string>('1');

  // 주차장 시스템 상태
  const [parkingState, setParkingState] = useState<'waiting' | 'vehicle_detected' | 'processing' | 'completed'>('waiting');
  const [waitTimer, setWaitTimer] = useState(0);
  const [carDetections, setCarDetections] = useState<CarDetection[]>([]);
  const [plateDetections, setPlateDetections] = useState<LicensePlateDetection[]>([]);
  const [processedPlates, setProcessedPlates] = useState<string[]>([]);
  const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'failure' | null>(null);
  const [feedbackTimer, setFeedbackTimer] = useState<number | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // 한 번만 실행되도록 하는 플래그
  const [hasExecutedOnce, setHasExecutedOnce] = useState(false);

  // 크롭된 번호판 이미지 미리보기
  const [croppedPlateImage, setCroppedPlateImage] = useState<string | null>(null);
  const processingLockRef = useRef<boolean>(false);

  // 테스트용 파일 업로드 상태
  const [testImage, setTestImage] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 차량 처리 플래그 (즉시 반영되는 ref 사용)
  const isVehicleProcessingRef = useRef<boolean>(false);

  const webcamRef = useRef<Webcam>(null);
  const cocoSsdModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOCRProcessingRef = useRef<boolean>(false);
  const audioRef = useRef<{ good: HTMLAudioElement; notgood: HTMLAudioElement } | null>(null);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 오디오 초기화 함수
  const initializeAudio = async () => {
    try {
      const goodAudio = new Audio('/good.mp3');
      const notgoodAudio = new Audio('/notgood.mp3');

      goodAudio.volume = 1.0;
      notgoodAudio.volume = 1.0;

      await Promise.all([
        new Promise((resolve, reject) => {
          goodAudio.addEventListener('canplaythrough', resolve, { once: true });
          goodAudio.addEventListener('error', reject, { once: true });
          goodAudio.load();
        }),
        new Promise((resolve, reject) => {
          notgoodAudio.addEventListener('canplaythrough', resolve, { once: true });
          notgoodAudio.addEventListener('error', reject, { once: true });
          notgoodAudio.load();
        })
      ]);

      audioRef.current = { good: goodAudio, notgood: notgoodAudio };
      setAudioInitialized(true);
      console.log('🔊 오디오 초기화 성공');
    } catch (error) {
      console.warn('🔊 오디오 초기화 실패:', error);
    }
  };

  // 음성 재생 함수
  const playSound = async (type: 'good' | 'notgood') => {
    console.log(`🔊 음성 재생 시도: ${type}`);

    try {
      if (audioRef.current && audioRef.current[type]) {
        const audio = audioRef.current[type];
        audio.currentTime = 0;
        await audio.play();
        console.log('🔊 음성 재생 성공 (기존 오디오):', type);
        return;
      }

      const audio = new Audio(`/${type}.mp3`);
      audio.volume = 1.0;
      await audio.play();
      console.log('🔊 음성 재생 성공 (새 오디오):', type);

    } catch (error) {
      console.error('🔊 오디오 재생 실패:', type, error);
    }
  };

  // COCO-SSD 모델 초기화 (차량 감지용)
  const loadCocoSsdModel = async () => {
    try {
      setIsModelLoading(true);
      setModelProgress(30);
      setOutputText('COCO-SSD 차량 감지 모델 로딩 중...');

      // TensorFlow.js 준비
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      setModelProgress(60);

      // COCO-SSD 모델 로드
      const model = await cocoSsd.load();
      cocoSsdModelRef.current = model;

      setModelProgress(100);
      setOutputText('COCO-SSD 차량 감지 모델 로드 완료! Start를 클릭하세요.');
      setIsModelLoading(false);

      console.log('✅ COCO-SSD 모델 로드 성공');
      await initializeAudio();

    } catch (error) {
      console.error('COCO-SSD 모델 로드 실패:', error);
      setOutputText(`모델 로드 실패: ${error}`);
      setIsModelLoading(false);
    }
  };

  // 도커 API로 번호판 좌표 감지 (이미지 크기 정보 포함)
  const detectLicensePlateCoordinatesWithSize = async (imageDataUrl: string): Promise<{plateDetections: LicensePlateDetection[], imageSize: {width: number, height: number}} | null> => {
    try {
      console.log('🎯 도커 API로 번호판 좌표 감지 시작...');

      // base64 데이터에서 실제 base64 부분만 추출
      const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      console.log('📸 base64 데이터 준비 완료, 길이:', base64Data.length);

      // JSON 형태로 요청 (스웨거와 동일한 형식)
      const requestBody = {
        "model_id": "yolov8-anpr/1",
        "api_key": "IMv3ZjNtl2lvMVUKOZCr",
        "image": [
          {
            "type": "base64",
            "value": base64Data
          }
        ],
        "confidence": 0.4,
        "iou_threshold": 0.5
      };

      console.log('📋 JSON 요청 준비 완료');

      // 도커 API 호출 (직접 localhost:9001) - JSON으로 요청
      const apiResponse = await fetch('http://localhost:9001/infer/object_detection', {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      if (!apiResponse.ok) {
        throw new Error(`도커 API 오류: ${apiResponse.status}`);
      }

      const results: DockerAPIResponse[] = await apiResponse.json();
      console.log('📊 도커 API 응답:', results);

      if (!results || results.length === 0 || !results[0].predictions || results[0].predictions.length === 0) {
        console.log('⚠️ 번호판이 감지되지 않음');
        return null;
      }

      const firstResult = results[0];
      console.log(`📊 도커 API 이미지 크기: ${firstResult.image.width}x${firstResult.image.height}`);
      console.log('📊 첫 번째 결과의 predictions:', firstResult.predictions);

      // 번호판 좌표 변환 (중심점 + 크기 → 좌상단, 우하단)
      const plateDetections: LicensePlateDetection[] = firstResult.predictions.map(pred => {
        const x1 = pred.x - pred.width / 2;
        const y1 = pred.y - pred.height / 2;
        const x2 = pred.x + pred.width / 2;
        const y2 = pred.y + pred.height / 2;

        return {
          bbox: [x1, y1, x2, y2],
          confidence: pred.confidence
        };
      });

      console.log(`✅ ${plateDetections.length}개 번호판 좌표 획득`);

      return {
        plateDetections,
        imageSize: {
          width: firstResult.image.width,
          height: firstResult.image.height
        }
      };

    } catch (error) {
      console.error('❌ 도커 API 번호판 감지 실패:', error);
      return null;
    }
  };

  // 도커 API로 번호판 좌표 감지 (기존 함수 유지)
  const detectLicensePlateCoordinates = async (imageDataUrl: string): Promise<LicensePlateDetection[]> => {
    try {
      console.log('🎯 도커 API로 번호판 좌표 감지 시작...');

      // base64 데이터에서 실제 base64 부분만 추출
      const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      console.log('📸 base64 데이터 준비 완료, 길이:', base64Data.length);

      // JSON 형태로 요청 (스웨거와 동일한 형식)
      const requestBody = {
        "model_id": "yolov8-anpr/1",
        "api_key": "IMv3ZjNtl2lvMVUKOZCr",
        "image": [
          {
            "type": "base64",
            "value": base64Data
          }
        ],
        "confidence": 0.4,
        "iou_threshold": 0.5
      };

      console.log('📋 JSON 요청 준비 완료');

      // 도커 API 호출 (직접 localhost:9001) - JSON으로 요청
      const apiResponse = await fetch('http://localhost:9001/infer/object_detection', {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      if (!apiResponse.ok) {
        throw new Error(`도커 API 오류: ${apiResponse.status}`);
      }

      const results: DockerAPIResponse[] = await apiResponse.json();
      console.log('📊 도커 API 응답:', results);

      if (!results || results.length === 0 || !results[0].predictions || results[0].predictions.length === 0) {
        console.log('⚠️ 번호판이 감지되지 않음');
        return [];
      }

      const firstResult = results[0];
      console.log(`📊 도커 API 이미지 크기: ${firstResult.image.width}x${firstResult.image.height}`);
      console.log('📊 첫 번째 결과의 predictions:', firstResult.predictions);

      // 번호판 좌표 변환 (중심점 + 크기 → 좌상단, 우하단)
      const plateDetections: LicensePlateDetection[] = firstResult.predictions.map(pred => {
        const x1 = pred.x - pred.width / 2;
        const y1 = pred.y - pred.height / 2;
        const x2 = pred.x + pred.width / 2;
        const y2 = pred.y + pred.height / 2;

        return {
          bbox: [x1, y1, x2, y2],
          confidence: pred.confidence
        };
      });

      console.log(`✅ ${plateDetections.length}개 번호판 좌표 획득`);
      return plateDetections;

    } catch (error) {
      console.error('❌ 도커 API 번호판 감지 실패:', error);
      return [];
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setTestImage(imageDataUrl);
      setIsTestMode(true);
      console.log('📁 테스트 이미지 로드 완료');
    };
    reader.readAsDataURL(file);
  }, []);

  // 테스트 이미지로 차량 감지
  const detectVehiclesFromTestImage = async (): Promise<CarDetection[]> => {
    if (!cocoSsdModelRef.current || !testImage) {
      console.log('❌ COCO-SSD 모델 또는 테스트 이미지가 없음');
      return [];
    }

    try {
      console.log('🔍 테스트 이미지 차량 감지 시작...');

      // 이미지 엘리먼트 생성
      const img = new Image();
      img.src = testImage;

      return new Promise((resolve) => {
        img.onload = async () => {
          try {
            console.log(`📷 이미지 로드 완료: ${img.width}x${img.height}`);

            // COCO-SSD 추론
            const predictions = await cocoSsdModelRef.current!.detect(img);
            console.log(`🎯 COCO-SSD 전체 감지 결과:`, predictions);

            // 모든 클래스 출력 (디버깅용)
            predictions.forEach((pred, index) => {
              console.log(`감지 ${index+1}: ${pred.class} (${(pred.score * 100).toFixed(1)}%)`);
            });

            // 차량 관련 클래스만 필터링
            const vehicleClasses = ['car', 'motorcycle', 'bus', 'truck', 'bicycle'];
            const vehicleDetections: CarDetection[] = predictions
              .filter(pred => vehicleClasses.includes(pred.class) && pred.score > 0.1) // 임계값을 0.1로 더 낮춤
              .map(pred => {
                const [x, y, width, height] = pred.bbox;
                console.log(`✅ 차량 감지: ${pred.class} (${(pred.score * 100).toFixed(1)}%) at (${x}, ${y}, ${width}, ${height})`);
                return {
                  bbox: [x, y, x + width, y + height] as [number, number, number, number],
                  class: pred.class,
                  confidence: pred.score
                };
              });

            console.log(`🚗 최종 차량 감지 결과: ${vehicleDetections.length}개`);
            resolve(vehicleDetections);
          } catch (error) {
            console.error('테스트 이미지 차량 감지 오류:', error);
            resolve([]);
          }
        };

        img.onerror = (error) => {
          console.error('이미지 로드 실패:', error);
          resolve([]);
        };
      });

    } catch (error) {
      console.error('테스트 이미지 처리 오류:', error);
      return [];
    }
  };

  // COCO-SSD로 차량 감지 (카메라 또는 테스트 이미지)
  const detectVehiclesWithCocoSsd = async (): Promise<CarDetection[]> => {
    if (!cocoSsdModelRef.current) return [];

    // 테스트 모드면 테스트 이미지 사용
    if (isTestMode && testImage) {
      return await detectVehiclesFromTestImage();
    }

    // 일반 모드면 웹캠 사용
    if (!webcamRef.current?.video) return [];

    try {
      const video = webcamRef.current.video;

      // COCO-SSD 추론
      const predictions = await cocoSsdModelRef.current.detect(video);

      // 차량 관련 클래스만 필터링
      const vehicleClasses = ['car', 'motorcycle', 'bus', 'truck', 'bicycle'];
      const vehicleDetections: CarDetection[] = predictions
        .filter(pred => vehicleClasses.includes(pred.class) && pred.score > 0.5)
        .map(pred => {
          const [x, y, width, height] = pred.bbox;
          return {
            bbox: [x, y, x + width, y + height] as [number, number, number, number],
            class: pred.class,
            confidence: pred.score
          };
        });

      console.log(`🚗 COCO-SSD 차량 감지: ${vehicleDetections.length}개`);
      return vehicleDetections;

    } catch (error) {
      console.error('COCO-SSD 차량 감지 오류:', error);
      return [];
    }
  };

  // 번호판 영역 크롭 (카메라 또는 테스트 이미지)
  const cropLicensePlateArea = useCallback((plateDetection: LicensePlateDetection, sourceImage?: string, dockerImageSize?: {width: number, height: number}): Promise<string | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      let [x1, y1, x2, y2] = plateDetection.bbox;
      let width = x2 - x1;
      let height = y2 - y1;

      console.log(`📏 원본 번호판 크롭 좌표: x=${x1}, y=${y1}, w=${width}, h=${height}`);

      // 웹캠 모드에서 좌표 변환 필요한지 확인
      if (!isTestMode && dockerImageSize && webcamRef.current?.video) {
        const video = webcamRef.current.video;
        const actualWidth = video.videoWidth;
        const actualHeight = video.videoHeight;

        console.log(`🔄 좌표 변환: 도커(${dockerImageSize.width}x${dockerImageSize.height}) → 웹캠(${actualWidth}x${actualHeight})`);

        if (dockerImageSize.width !== actualWidth || dockerImageSize.height !== actualHeight) {
          // 좌표 스케일링
          const scaleX = actualWidth / dockerImageSize.width;
          const scaleY = actualHeight / dockerImageSize.height;

          x1 = Math.round(x1 * scaleX);
          y1 = Math.round(y1 * scaleY);
          x2 = Math.round(x2 * scaleX);
          y2 = Math.round(y2 * scaleY);
          width = x2 - x1;
          height = y2 - y1;

          console.log(`📏 변환된 번호판 크롭 좌표: x=${x1}, y=${y1}, w=${width}, h=${height}`);
        }
      }

      if (width < 30 || height < 10) {
        console.log('❌ 번호판 크기가 너무 작음');
        resolve(null);
        return;
      }

      canvas.width = width;
      canvas.height = height;

      if (isTestMode && sourceImage) {
        // 테스트 이미지에서 크롭
        const img = new Image();
        img.onload = () => {
          try {
            ctx.drawImage(img, x1, y1, width, height, 0, 0, width, height);
            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            console.log('✅ 테스트 이미지에서 번호판 크롭 성공');
            resolve(croppedDataUrl);
          } catch (error) {
            console.error('❌ 테스트 이미지 크롭 실패:', error);
            resolve(null);
          }
        };
        img.onerror = () => {
          console.error('❌ 테스트 이미지 로드 실패');
          resolve(null);
        };
        img.src = sourceImage;
      } else {
        // 웹캠에서 크롭
        const video = webcamRef.current?.video;
        if (!video) {
          console.log('❌ 웹캠 비디오가 없음');
          resolve(null);
          return;
        }

        try {
          ctx.drawImage(video, x1, y1, width, height, 0, 0, width, height);
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          console.log('✅ 웹캠에서 번호판 크롭 성공');
          resolve(croppedDataUrl);
        } catch (error) {
          console.error('❌ 웹캠 크롭 실패:', error);
          resolve(null);
        }
      }
    });
  }, [isTestMode]);

  // Spring 백엔드 API에 번호판 이미지를 FormData로 전송 (참고 코드 방식)
  const sendToSpringAPI = useCallback(async (imageData: string): Promise<string | null> => {
    try {
      console.log('🌸 Spring API로 번호판 이미지 전송 시작...');

      // 실시간 상태 확인을 위해 현재 UI 상태 직접 조회
      const currentParkingAction = (document.querySelector('select.setting-select') as HTMLSelectElement)?.value || parkingAction;
      const currentParkingLotName = (document.querySelector('input.setting-input') as HTMLInputElement)?.value || parkingLotName;

      // eventType 변환 (enter -> ENTRY, leave -> EXIT)
      const eventType = currentParkingAction === 'enter' ? 'ENTRY' : 'EXIT';

      // parkingLotId는 주차장 이름 입력값을 정수로 변환
      const parkingLotId = parseInt(currentParkingLotName) || 1;

      console.log(`🚗 현재 설정 - parkingAction: ${currentParkingAction} (UI에서 직접 조회)`);
      console.log(`📋 전송 파라미터: eventType=${eventType}, parkingLotId=${parkingLotId}`);

      // 이미지 데이터를 Blob으로 변환
      const response = await fetch(imageData);
      const blob = await response.blob();

      // FormData 생성 (참고 코드와 동일한 방식)
      const formData = new FormData();
      formData.append("image", blob, "license_plate.jpg");
      formData.append("eventType", eventType);
      formData.append("parkingLotId", parkingLotId.toString());

      // FormData 내용 확인
      console.log('📦 FormData 파라미터:');
      const formDataEntries = Array.from(formData.entries());
      formDataEntries.forEach(([key, value]) => {
        if (value instanceof File) {
          console.log(`  ${key}: ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });

      // 쿼리 파라미터로도 전송 (참고 코드와 동일)
      const queryParams = new URLSearchParams({
        eventType: eventType,
        parkingLotId: parkingLotId.toString()
      });

      // 성공한 코드와 동일한 방식: axios + 직접 백엔드 URL
      const url = `http://j13c108.p.ssafy.io:8080/api/v1/plates/scan?eventType=${encodeURIComponent(eventType)}&parkingLotId=${encodeURIComponent(parkingLotId.toString())}`;

      console.log('🌐 최종 요청 URL:', url);
      console.log('📨 요청 방식: POST with multipart/form-data');

      const axios = (await import('axios')).default;
      const springResponse = await axios.post(url, formData, {
        headers: {
          // 🔴 Content-Type 헤더를 제거! 브라우저가 자동으로 multipart/form-data boundary 설정
          "accept": "application/json"
        },
      });

      console.log(`🌸 Spring API 응답 상태: ${springResponse.status}`);
      console.log('🌸 Spring API 응답:', springResponse.data);

      // Spring API 응답 형태에 따라 번호판 번호 추출
      const result = springResponse.data;
      if (result && result.plateNumber) {
        return result.plateNumber;
      } else if (result && result.plate_number) {
        return result.plate_number;
      }
      // 응답 구조를 모르므로 임시로 success 체크
      return "번호판 인식 성공"; // 임시 반환값
    } catch (error) {
      console.error('🌸 Spring API 요청 실패:', error);
      return null;
    }
  }, [parkingAction, parkingLotName]);

  // 기존 복잡한 processVehicleAfterWait 함수는 performSingleDetectionProcess로 대체됨

  // 처리 성공 핸들러
  const handleProcessingSuccess = useCallback((plateNumber: string) => {
    setLicensePlateNumber(plateNumber);
    setProcessedPlates(prev => [...prev, plateNumber]);
    setParkingState('completed');

    setFeedbackStatus('success');
    playSound('good');

    // 1초 딜레이 후 다시 1단계 대기로
    setTimeout(() => {
      setFeedbackStatus(null);
      resetToWaitingAndStartDetection();
    }, 1000);
  }, []);

  // 처리 실패 핸들러
  const handleProcessingFailure = useCallback(() => {
    setFeedbackStatus('failure');
    playSound('notgood');

    // 1초 딜레이 후 다시 1단계 대기로
    setTimeout(() => {
      setFeedbackStatus(null);
      resetToWaitingAndStartDetection();
    }, 1000);
  }, []);

  // 대기 상태로 리셋하고 다시 지속적 감지 시작
  const resetToWaitingAndStartDetection = useCallback(() => {
    console.log('🔄 리셋 후 다시 차량 감지 시작');

    // 상태 초기화
    setParkingState('waiting');
    setWaitTimer(0);
    setLicensePlateNumber(null);
    setCroppedPlateImage(null);
    setCarDetections([]);
    setPlateDetections([]);
    processingLockRef.current = false;
    isVehicleProcessingRef.current = false;
    setOutputText('1단계: 차량 감지 대기 중...');

    // 기존 타이머들 정리
    if (waitTimeoutRef.current) {
      clearTimeout(waitTimeoutRef.current);
      waitTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    // 테스트 모드가 아니면 다시 지속적 감지 시작
    if (!isTestMode) {
      // 지속적 감지를 다시 시작하는 타이머 설정
      setTimeout(() => {
        console.log('🔄 지속적 차량 감지 재시작...');

        // 1초마다 차량 감지 시도
        detectionIntervalRef.current = setInterval(async () => {
          if (parkingState !== 'waiting') {
            return;
          }

          try {
            console.log('🔍 차량 감지 시도 중...');
            const vehicles = await detectVehiclesWithCocoSsd();

            if (vehicles.length > 0) {
              console.log('✅ 차량 발견! 프로세스 시작');
              setCarDetections(vehicles);

              // 지속적 감지 중단
              if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
              }

              // 차량 발견되면 2→3→4 단계 진행 (직접 구현)
              try {
                // 2단계: 차량 감지됨, 2초 대기
                setParkingState('vehicle_detected');
                setWaitTimer(2);
                setOutputText('2단계: 차량 감지됨! 2초 대기 중...');

                for (let i = 2; i > 0; i--) {
                  setWaitTimer(i);
                  console.log(`⏰ 대기 중: ${i}초`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // 3단계: 번호판 좌표 감지 및 OCR
                setParkingState('processing');
                setOutputText('3단계: 번호판 좌표 감지 중...');

                // 이미지 캡처
                let lastValidImage: string | null = null;
                if (isTestMode && testImage) {
                  lastValidImage = testImage;
                  console.log('📸 테스트 이미지 사용');
                } else {
                  lastValidImage = webcamRef.current?.getScreenshot() || null;
                  console.log('📸 웹캠 스크린샷 촬영');

                  // 웹캠 비디오 요소의 실제 크기 확인
                  if (webcamRef.current?.video) {
                    const video = webcamRef.current.video;
                    console.log(`📹 웹캠 비디오 크기: ${video.videoWidth}x${video.videoHeight}`);
                    console.log(`📺 웹캠 요소 크기: ${video.clientWidth}x${video.clientHeight}`);

                    // 스크린샷 이미지의 실제 크기도 확인
                    if (lastValidImage) {
                      const img = new Image();
                      img.onload = () => {
                        console.log(`📸 스크린샷 이미지 크기: ${img.width}x${img.height}`);
                      };
                      img.src = lastValidImage;
                    }
                  }
                }

                if (!lastValidImage) {
                  console.log('❌ 유효한 이미지가 없음');
                  handleProcessingFailure();
                  return;
                }

                console.log('🎯 도커 API로 번호판 좌표 감지 시작...');
                const plateDetectionResult = await detectLicensePlateCoordinatesWithSize(lastValidImage);

                if (plateDetectionResult && plateDetectionResult.plateDetections.length > 0) {
                  console.log(`🎯 ${plateDetectionResult.plateDetections.length}개 번호판 좌표 획득`);
                  setPlateDetections(plateDetectionResult.plateDetections);

                  // 가장 신뢰도 높은 번호판 선택
                  const bestPlate = plateDetectionResult.plateDetections.reduce((prev, current) =>
                    prev.confidence > current.confidence ? prev : current
                  );

                  // 번호판 영역 크롭 (도커 이미지 크기 정보 포함)
                  const croppedImage = await cropLicensePlateArea(
                    bestPlate,
                    isTestMode ? lastValidImage : undefined,
                    plateDetectionResult.imageSize
                  );
                  if (croppedImage) {
                    console.log('📸 번호판 크롭 완료, OCR 요청 중...');
                    setCroppedPlateImage(croppedImage);

                    const plateNumber = await sendToSpringAPI(croppedImage);

                    if (plateNumber) {
                      // 4단계: 처리 완료
                      console.log('🎉 전체 프로세스 성공 완료!');
                      handleProcessingSuccess(plateNumber);
                    } else {
                      console.log('❌ OCR 처리 실패');
                      handleProcessingFailure();
                    }
                  } else {
                    console.log('❌ 번호판 크롭 실패');
                    handleProcessingFailure();
                  }
                } else {
                  console.log('❌ 번호판 좌표 감지 실패');
                  handleProcessingFailure();
                }

              } catch (error) {
                console.error('❌ 차량 감지 후 프로세스 오류:', error);
                handleProcessingFailure();
              }
            }
          } catch (error) {
            console.error('🔍 차량 감지 중 오류:', error);
          }
        }, 1000); // 1초마다 감지
      }, 100); // 100ms 후 시작
    }

    console.log('🔄 리셋 완료, 차량 감지 재시작');
  }, [isTestMode, detectVehiclesWithCocoSsd, testImage, detectLicensePlateCoordinates, cropLicensePlateArea, sendToSpringAPI, handleProcessingSuccess, handleProcessingFailure]);

  // 대기 상태로 리셋 (기존 함수 유지)
  const resetToWaiting = useCallback(() => {
    setParkingState('waiting');
    setWaitTimer(0);
    setLicensePlateNumber(null);
    setCroppedPlateImage(null);
    setCarDetections([]);
    setPlateDetections([]);
    processingLockRef.current = false;

    // 차량 처리 플래그 리셋
    isVehicleProcessingRef.current = false;

    if (waitTimeoutRef.current) {
      clearTimeout(waitTimeoutRef.current);
      waitTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    console.log('🔄 대기 상태로 리셋 완료 (플래그 포함)');
  }, []);

  // 기존 반복 감지 함수들은 더 이상 사용하지 않음 (단일 프로세스로 대체)

  // 수동 테스트 함수 (디버깅용)
  const testDetection = useCallback(async () => {
    console.log('🧪 수동 테스트 시작...');
    console.log('isTestMode:', isTestMode);
    console.log('testImage exists:', !!testImage);
    console.log('cocoSsdModel exists:', !!cocoSsdModelRef.current);

    try {
      const vehicles = await detectVehiclesWithCocoSsd();
      console.log('🧪 수동 테스트 결과:', vehicles);
      setCarDetections(vehicles);
    } catch (error) {
      console.error('🧪 수동 테스트 오류:', error);
    }
  }, [isTestMode, testImage, detectVehiclesWithCocoSsd]);

  // 지속적으로 차량 감지 시작
  const startDetection = useCallback(async () => {
    if (hasExecutedOnce) {
      console.log('🚫 이미 실행되었습니다. F5로 새로고침하여 재시작하세요.');
      setOutputText('🚫 이미 실행되었습니다. F5로 새로고침하여 재시작하세요.');
      return;
    }

    console.log('▶️ Start 버튼 클릭됨 - 지속적 차량 감지 시작');
    console.log('현재 상태 - isTestMode:', isTestMode, 'testImage:', !!testImage);

    setHasExecutedOnce(true);
    setIsDetecting(true);
    setParkingState('waiting');
    setOutputText('1단계: 차량 감지 대기 중...');

    // 지속적으로 차량 감지 시작
    if (isTestMode) {
      // 테스트 모드에서는 즉시 프로세스 시작
      await performSingleDetectionProcess();
    } else {
      // 실제 모드에서는 지속적 감지 시작
      startContinuousVehicleDetection();
    }
  }, [isTestMode, testImage, hasExecutedOnce]);

  // 지속적으로 차량 감지 (차량이 나타날 때까지 계속 감지)
  const startContinuousVehicleDetection = useCallback(() => {
    console.log('🔄 지속적 차량 감지 시작...');

    // 1초마다 차량 감지 시도
    detectionIntervalRef.current = setInterval(async () => {
      if (parkingState !== 'waiting') {
        // 이미 다른 상태로 넘어갔으면 감지 중단
        return;
      }

      try {
        console.log('🔍 차량 감지 시도 중...');
        const vehicles = await detectVehiclesWithCocoSsd();

        if (vehicles.length > 0) {
          console.log('✅ 차량 발견! 프로세스 시작');
          setCarDetections(vehicles);

          // 지속적 감지 중단
          if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
          }

          // 차량 발견되면 2→3→4 단계 진행
          await performVehicleDetectedProcess();
        }
      } catch (error) {
        console.error('🔍 차량 감지 중 오류:', error);
      }
    }, 1000); // 1초마다 감지
  }, [parkingState, detectVehiclesWithCocoSsd]);

  // 차량 감지 후 2→3→4 단계 처리
  const performVehicleDetectedProcess = useCallback(async () => {
    try {
      // 2단계: 차량 감지됨, 2초 대기
      setParkingState('vehicle_detected');
      setWaitTimer(2);
      setOutputText('2단계: 차량 감지됨! 2초 대기 중...');

      for (let i = 2; i > 0; i--) {
        setWaitTimer(i);
        console.log(`⏰ 대기 중: ${i}초`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 3단계: 번호판 좌표 감지 및 OCR
      setParkingState('processing');
      setOutputText('3단계: 번호판 좌표 감지 중...');

      // 이미지 캡처
      let lastValidImage: string | null = null;
      if (isTestMode && testImage) {
        lastValidImage = testImage;
      } else {
        lastValidImage = webcamRef.current?.getScreenshot() || null;
      }

      if (!lastValidImage) {
        console.log('❌ 유효한 이미지가 없음');
        handleProcessingFailure();
        return;
      }

      console.log('🎯 도커 API로 번호판 좌표 감지 시작...');
      const plateDetections = await detectLicensePlateCoordinates(lastValidImage);

      if (plateDetections.length > 0) {
        console.log(`🎯 ${plateDetections.length}개 번호판 좌표 획득`);
        setPlateDetections(plateDetections);

        // 가장 신뢰도 높은 번호판 선택
        const bestPlate = plateDetections.reduce((prev, current) =>
          prev.confidence > current.confidence ? prev : current
        );

        // 번호판 영역 크롭
        const croppedImage = await cropLicensePlateArea(bestPlate, isTestMode ? lastValidImage : undefined);
        if (croppedImage) {
          console.log('📸 번호판 크롭 완료, OCR 요청 중...');
          setCroppedPlateImage(croppedImage);

          const plateNumber = await sendToSpringAPI(croppedImage);

          if (plateNumber) {
            // 4단계: 처리 완료
            console.log('🎉 전체 프로세스 성공 완료!');
            handleProcessingSuccess(plateNumber);
          } else {
            console.log('❌ OCR 처리 실패');
            handleProcessingFailure();
          }
        } else {
          console.log('❌ 번호판 크롭 실패');
          handleProcessingFailure();
        }
      } else {
        console.log('❌ 번호판 좌표 감지 실패');
        handleProcessingFailure();
      }

    } catch (error) {
      console.error('❌ 차량 감지 후 프로세스 오류:', error);
      handleProcessingFailure();
    }
  }, [isTestMode, testImage, detectLicensePlateCoordinates, cropLicensePlateArea, sendToSpringAPI, handleProcessingSuccess, handleProcessingFailure]);

  // 단일 프로세스 실행 (1→2→3→4단계 한 번만)
  const performSingleDetectionProcess = useCallback(async () => {
    console.log('🚀 단일 프로세스 시작: 1→2→3→4단계 한 번만 실행');

    try {
      // 1단계: 차량 대기 및 감지
      setParkingState('waiting');
      setOutputText('1단계: 차량 감지 중...');

      // 차량 감지 시도 (딱 한 번만)
      let vehicleFound = false;
      let lastValidImage: string | null = null;

      console.log('🔍 차량 감지 시도 (1번만)');
      const vehicles = await detectVehiclesWithCocoSsd();

      if (vehicles.length > 0) {
        console.log('✅ 차량 발견!');
        vehicleFound = true;
        setCarDetections(vehicles);

        // 이미지 캡처
        if (isTestMode && testImage) {
          lastValidImage = testImage;
        } else {
          lastValidImage = webcamRef.current?.getScreenshot() || null;
        }
      }

      if (!vehicleFound) {
        console.log('❌ 차량을 감지하지 못함');
        setOutputText('❌ 차량을 감지하지 못했습니다.');
        handleProcessingFailure();
        return;
      }

      // 2단계: 차량 감지 완료, 2초 대기
      setParkingState('vehicle_detected');
      setWaitTimer(2);
      setOutputText('2단계: 차량 감지됨! 2초 대기 중...');

      for (let i = 2; i > 0; i--) {
        setWaitTimer(i);
        console.log(`⏰ 대기 중: ${i}초`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 3단계: 번호판 좌표 감지 및 OCR
      setParkingState('processing');
      setOutputText('3단계: 번호판 좌표 감지 중...');

      if (!lastValidImage) {
        console.log('❌ 유효한 이미지가 없음');
        handleProcessingFailure();
        return;
      }

      console.log('🎯 도커 API로 번호판 좌표 감지 시작...');
      const plateDetections = await detectLicensePlateCoordinates(lastValidImage);

      if (plateDetections.length > 0) {
        console.log(`🎯 ${plateDetections.length}개 번호판 좌표 획득`);
        setPlateDetections(plateDetections);

        // 가장 신뢰도 높은 번호판 선택
        const bestPlate = plateDetections.reduce((prev, current) =>
          prev.confidence > current.confidence ? prev : current
        );

        // 번호판 영역 크롭
        const croppedImage = await cropLicensePlateArea(bestPlate, isTestMode ? lastValidImage : undefined);
        if (croppedImage) {
          console.log('📸 번호판 크롭 완료, OCR 요청 중...');
          setCroppedPlateImage(croppedImage);

          const plateNumber = await sendToSpringAPI(croppedImage);

          if (plateNumber) {
            // 4단계: 처리 완료
            console.log('🎉 전체 프로세스 성공 완료!');
            handleProcessingSuccess(plateNumber);
          } else {
            console.log('❌ OCR 처리 실패');
            handleProcessingFailure();
          }
        } else {
          console.log('❌ 번호판 크롭 실패');
          handleProcessingFailure();
        }
      } else {
        console.log('❌ 번호판 좌표 감지 실패');
        handleProcessingFailure();
      }

    } catch (error) {
      console.error('❌ 단일 프로세스 실행 오류:', error);
      handleProcessingFailure();
    }
  }, [isTestMode, testImage, detectVehiclesWithCocoSsd, detectLicensePlateCoordinates, cropLicensePlateArea, sendToSpringAPI, handleProcessingSuccess, handleProcessingFailure]);

  // F5로만 초기화 가능 (Stop 버튼 제거)

  // 모델 초기화
  useEffect(() => {
    loadCocoSsdModel();
  }, []);

  // 컴포넌트 언마운트시 정리
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (cocoSsdModelRef.current) {
        cocoSsdModelRef.current.dispose();
      }
    };
  }, []);

  if (isModelLoading) {
    return (
      <div className="camera-screen">
        <div className="loading-container">
          <div className="loading-text">🤖 COCO-SSD 모델 로딩 중...</div>
          <div className="loading-progress">{modelProgress}%</div>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-screen">
      <div className="main-content">
        {/* 설정 패널 */}
        <div className="settings-panel-left">
          <div className="setting-group">
            <label className="setting-label">주차장 ID:</label>
            <input
              type="number"
              value={parkingLotName}
              onChange={(e) => setParkingLotName(e.target.value)}
              className="setting-input"
              placeholder="주차장 ID를 입력하세요 (숫자)"
              disabled={false}
            />
          </div>

          <div className="setting-group">
            <label className="setting-label">차량 행동:</label>
            <select
              value={parkingAction}
              onChange={(e) => setParkingAction(e.target.value as ParkingAction)}
              className="setting-select"
              disabled={false}
            >
              <option value="enter">입차</option>
              <option value="leave">출차</option>
            </select>
          </div>

          {/* 오디오 테스트 버튼들 */}
          {audioInitialized && (
            <div className="setting-group">
              <label className="setting-label">🔊 오디오 테스트:</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => playSound('good')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  ✅ 성공음
                </button>
                <button
                  onClick={() => playSound('notgood')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  ❌ 실패음
                </button>
              </div>
            </div>
          )}

          {/* 테스트용 파일 업로드 */}
          <div className="setting-group">
            <label className="setting-label">🧪 테스트용 차량 이미지:</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
                disabled={isDetecting}
              >
                📁 이미지 업로드
              </button>
              {isTestMode && (
                <button
                  onClick={() => {
                    setIsTestMode(false);
                    setTestImage(null);
                    setCarDetections([]);
                    setPlateDetections([]);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                  disabled={isDetecting}
                >
                  📹 카메라 모드로
                </button>
              )}
              {isTestMode && (
                <button
                  onClick={testDetection}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  🧪 수동 테스트
                </button>
              )}
            </div>
            {isTestMode && (
              <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#28a745' }}>
                ✅ 테스트 모드 활성화됨
              </div>
            )}
          </div>
        </div>

        <div className="camera-box">
          {!isTestMode ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: 'user',
                width: 1280,
                height: 1080
              }}
              className="webcam"
            />
          ) : (
            testImage && (
              <img
                src={testImage}
                alt="테스트 이미지"
                className="webcam"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            )
          )}

          {/* 차량 감지 결과 오버레이 */}
          <div className="detections-overlay">
            {carDetections.map((detection, index) => (
              <div
                key={index}
                className="detection-box"
                style={{
                  left: Math.max(0, detection.bbox[0]),
                  top: Math.max(0, detection.bbox[1]),
                  width: Math.max(0, detection.bbox[2] - detection.bbox[0]),
                  height: Math.max(0, detection.bbox[3] - detection.bbox[1]),
                }}
              >
                <div className="detection-label">
                  {detection.class} {(detection.confidence * 100).toFixed(1)}%
                </div>
              </div>
            ))}

            {/* 번호판 감지 결과 오버레이 */}
            {plateDetections.map((plate, index) => (
              <div
                key={`plate-${index}`}
                className="plate-box"
                style={{
                  left: Math.max(0, plate.bbox[0]),
                  top: Math.max(0, plate.bbox[1]),
                  width: Math.max(0, plate.bbox[2] - plate.bbox[0]),
                  height: Math.max(0, plate.bbox[3] - plate.bbox[1]),
                }}
              >
                <div className="plate-label">
                  번호판 {(plate.confidence * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* 피드백 화면 오버레이 */}
          {feedbackStatus && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              backgroundColor: feedbackStatus === 'success' ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)',
              animation: 'fadeIn 0.5s ease-in-out'
            }}>
              <div style={{
                textAlign: 'center',
                color: 'white',
                padding: '30px',
                borderRadius: '15px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(5px)'
              }}>
                {feedbackStatus === 'success' ? (
                  <>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>✅</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '10px' }}>번호판 인식 성공!</div>
                    <div style={{ fontSize: '1.1rem', marginBottom: '15px' }}>차량 정보가 성공적으로 처리되었습니다.</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>❌</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '10px' }}>번호판 인식 실패</div>
                    <div style={{ fontSize: '1.1rem', marginBottom: '15px' }}>다시 시도해주세요.</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 제어 버튼들 */}
          <div className="control-buttons">
            <button
              className={`control-btn ${hasExecutedOnce ? 'disabled' : 'start'}`}
              onClick={startDetection}
              disabled={isModelLoading || hasExecutedOnce}
            >
              {hasExecutedOnce ? 'F5로 새로고침 필요' : 'Start'}
            </button>
          </div>
        </div>

        {/* 진행 상황 패널 */}
        <div className="progress-container-right">
          <h3 className="progress-title">🚗 주차장 시스템 진행 단계</h3>

          <div className="steps-container-vertical">
            {/* 1단계: 차량 대기 */}
            <div className={`step-item-vertical ${parkingState === 'waiting' ? 'step-active' : 'step-inactive'}`}>
              <div className={`step-number ${parkingState === 'waiting' ? 'step-number-active' : 'step-number-inactive'}`}>
                1
              </div>
              <div className="step-content">
                <span className={`step-text ${parkingState === 'waiting' ? 'step-text-active' : 'step-text-inactive'}`}>
                  차량 대기
                </span>
              </div>
            </div>

            {/* 2단계: 차량 감지 및 2초 대기 */}
            <div className={`step-item-vertical ${parkingState === 'vehicle_detected' ? 'step-active' : 'step-inactive'}`}>
              <div className={`step-number ${parkingState === 'vehicle_detected' ? 'step-number-active' : 'step-number-inactive'}`}>
                2
              </div>
              <div className="step-content">
                <span className={`step-text ${parkingState === 'vehicle_detected' ? 'step-text-active' : 'step-text-inactive'}`}>
                  차량 감지 - {waitTimer}초 대기
                </span>
              </div>
            </div>

            {/* 3단계: 번호판 좌표 감지 및 OCR */}
            <div className={`step-item-vertical ${parkingState === 'processing' ? 'step-active' : 'step-inactive'}`}>
              <div className={`step-number ${parkingState === 'processing' ? 'step-number-active' : 'step-number-inactive'}`}>
                3
              </div>
              <div className="step-content">
                <span className={`step-text ${parkingState === 'processing' ? 'step-text-active' : 'step-text-inactive'}`}>
                  번호판 좌표 감지 및 OCR
                </span>
              </div>
            </div>

            {/* 4단계: 처리 완료 */}
            <div className={`step-item-vertical ${parkingState === 'completed' ? 'step-active' : 'step-inactive'}`}>
              <div className={`step-number ${parkingState === 'completed' ? 'step-number-active' : 'step-number-inactive'}`}>
                ✓
              </div>
              <div className="step-content">
                <span className={`step-text ${parkingState === 'completed' ? 'step-text-active' : 'step-text-inactive'}`}>
                  처리 완료
                </span>
              </div>
            </div>
          </div>

          {/* 크롭된 번호판 이미지 미리보기 */}
          {croppedPlateImage && (
            <div className="cropped-plate-preview">
              <strong>📸 크롭된 번호판 이미지:</strong>
              <div className="cropped-plate-container">
                <img
                  src={croppedPlateImage}
                  alt="크롭된 번호판"
                  className="cropped-plate-image"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '150px',
                    border: '2px solid #007bff',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa',
                    padding: '5px',
                    marginTop: '10px'
                  }}
                />
              </div>
            </div>
          )}

          {/* 번호판 인식 결과 */}
          {licensePlateNumber && (
            <div className="license-plate-result">
              <strong>🎯 인식된 번호판:</strong>
              <div className="plate-number">{licensePlateNumber}</div>
            </div>
          )}
        </div>
      </div>

      <div className="text-area">
        <div className="text-output">
          <p>{outputText}</p>
          {processedPlates.length > 0 && (
            <div className="processed-vehicles">
              <strong>처리된 차량:</strong> {processedPlates.slice(-5).join(', ')}
              {processedPlates.length > 5 && ` (총 ${processedPlates.length}대)`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraScreen;