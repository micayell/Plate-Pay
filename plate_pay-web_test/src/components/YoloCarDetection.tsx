import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import './YoloCarDetection.css';

// OpenCV.js 타입 선언
declare global {
  interface Window {
    cv: any;
  }
}

interface Detection {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

interface DetectionResult {
  success: boolean;
  detections?: Array<{
    bbox: number[];
    confidence: number;
    class: number;
    class_name: string;
  }>;
  message?: string;
  plateResult?: any;
  croppedPlateImages?: string[];
  plateRegions?: Array<{bbox: number[], confidence: number}>;
  originalImage?: string | null;
  detectionMethod?: string;
}

const YoloCarDetection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [openCVLoaded, setOpenCVLoaded] = useState(false);
  const [isWebcamMode, setIsWebcamMode] = useState(false);
  const [parkingSystemActive, setParkingSystemActive] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'waiting' | 'detected' | 'checking' | 'processing' | 'completed' | 'success' | 'failure'>('waiting');
  const [detectionTimer, setDetectionTimer] = useState<number | null>(null);
  const [feedbackTimer, setFeedbackTimer] = useState<number | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<{ good: HTMLAudioElement; notgood: HTMLAudioElement } | null>(null);

  // 오디오 초기화 함수
  const initializeAudio = async () => {
    try {
      const goodAudio = new Audio('/good.mp3');
      const notgoodAudio = new Audio('/notgood.mp3');

      goodAudio.volume = 1.0;
      notgoodAudio.volume = 1.0;

      // 두 오디오 로드
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
      console.log('오디오 초기화 성공');

      // 테스트 재생
      setTimeout(() => {
        console.log('초기화 후 테스트 사운드 재생');
        goodAudio.play().catch(e => console.log('테스트 재생 실패:', e));
      }, 1000);
    } catch (error) {
      console.warn('오디오 초기화 실패:', error);
    }
  };

  // 음성 재생 함수 (간단한 방법)
  const playSound = async (type: 'good' | 'notgood') => {
    console.log(`음성 재생 시도: ${type}`);

    try {
      // 방법 1: 기존 오디오 사용
      if (audioRef.current && audioRef.current[type]) {
        const audio = audioRef.current[type];
        audio.currentTime = 0;
        await audio.play();
        console.log('음성 재생 성공 (기존 오디오):', type);
        return;
      }

      // 방법 2: 새로운 Audio 객체 생성
      const audio = new Audio(`/${type}.mp3`);
      audio.volume = 1.0;
      await audio.play();
      console.log('음성 재생 성공 (새 오디오):', type);

    } catch (error) {
      console.error('오디오 재생 실패:', type, error);

      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('브라우저에서 자동재생을 차단함. 사용자가 수동으로 오디오 테스트 버튼을 눌러주세요.');
      }
    }
  };

  // COCO-SSD 모델 및 OpenCV 로드
  useEffect(() => {
    let isComponentMounted = true;

    const loadModel = async () => {
      if (model) {
        console.log('COCO-SSD 모델 이미 로드됨');
        return;
      }

      try {
        console.log('TensorFlow.js 초기화 중...');
        await tf.ready();
        console.log('COCO-SSD 모델 로드 중...');
        const loadedModel = await cocoSsd.load();
        if (isComponentMounted) {
          setModel(loadedModel);
          console.log('COCO-SSD 모델 로드 완료!');
        }
      } catch (err) {
        console.error('COCO-SSD 모델 로드 실패:', err);
        if (isComponentMounted) {
          setError('COCO-SSD 모델 로드에 실패했습니다.');
        }
      }
    };

    const loadOpenCV = () => {
      // 이미 OpenCV가 로드되어 있는지 확인
      if (window.cv && window.cv.Mat) {
        console.log('OpenCV.js 이미 로드되어 있음');
        if (isComponentMounted) {
          setOpenCVLoaded(true);
        }
        return;
      }

      // 이미 스크립트가 추가되어 있는지 확인
      const existingScript = document.querySelector('script[src*="opencv.js"]');
      if (existingScript) {
        console.log('OpenCV.js 스크립트 이미 존재함');
        // 기존 스크립트 이벤트 리스너 추가
        existingScript.addEventListener('load', () => {
          console.log('기존 OpenCV.js 스크립트 로드 완료!');
          setOpenCVLoaded(true);
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      script.onload = () => {
        // OpenCV가 실제로 사용 가능할 때까지 대기
        const checkOpenCV = () => {
          if (window.cv && window.cv.Mat) {
            console.log('OpenCV.js 로드 및 초기화 완료!');
            setOpenCVLoaded(true);
          } else {
            setTimeout(checkOpenCV, 100);
          }
        };
        checkOpenCV();
      };
      script.onerror = () => {
        console.error('OpenCV.js 로드 실패');
        setError('OpenCV.js 로드에 실패했습니다.');
        setModelLoading(false);
      };
      document.head.appendChild(script);
    };

    loadModel();
    loadOpenCV();

    // 컴포넌트 언마운트 시 정리
    return () => {
      isComponentMounted = false;
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행

  // 모델과 OpenCV 로딩 상태 체크
  useEffect(() => {
    if (model && openCVLoaded) {
      setModelLoading(false);
    }
  }, [model, openCVLoaded]);

  // 번호판 위치 시각화 함수
  const drawPlateLocations = (img: HTMLImageElement, plateRegions: Array<{bbox: number[], confidence: number}>, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기를 화면에 맞게 설정
    const maxWidth = 800;
    const aspectRatio = img.naturalHeight / img.naturalWidth;
    const displayWidth = Math.min(img.naturalWidth, maxWidth);
    const displayHeight = displayWidth * aspectRatio;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // 스케일 비율 계산
    const scaleX = displayWidth / img.naturalWidth;
    const scaleY = displayHeight / img.naturalHeight;

    // 이미지 그리기
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

    // 번호판 바운딩 박스 그리기
    plateRegions.forEach((region, index) => {
      const [x, y, width, height] = region.bbox;

      // 스케일 적용
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;

      // 번호판 바운딩 박스 (빨간색)
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 3;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // 번호판 라벨
      ctx.fillStyle = '#e74c3c';
      const label = `번호판 ${index + 1} (${(region.confidence * 100).toFixed(1)}%)`;
      ctx.font = '16px Arial';
      const metrics = ctx.measureText(label);
      const textHeight = 20;

      ctx.fillRect(scaledX, scaledY - textHeight, metrics.width + 10, textHeight);
      ctx.fillStyle = 'white';
      ctx.fillText(label, scaledX + 5, scaledY - 5);
    });
  };

  // 결과가 업데이트될 때 번호판 위치 그리기
  useEffect(() => {
    if (result && result.originalImage && result.plateRegions && result.plateRegions.length > 0) {
      const canvas = canvasRef.current;
      const img = imageRef.current;

      if (canvas && img && img.naturalWidth > 0) {
        setTimeout(() => {
          drawPlateLocations(img, result.plateRegions!, canvas);
        }, 100);
      }
    }
  }, [result]);

  // 차량 관련 클래스들
  const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];

  // 간단한 번호판 영역 추정 함수 (차량 바운딩 박스 기반)
  const estimateLicensePlateRegions = (vehicleDetections: Detection[], img: HTMLImageElement) => {
    const plateRegions: Array<{bbox: number[], text?: string}> = [];

    vehicleDetections.forEach(vehicle => {
      const [vx, vy, vwidth, vheight] = vehicle.bbox;

      // 차량 하단 1/3 지역에서 번호판 영역 추정
      const plateY = vy + (vheight * 0.6); // 차량 하단 40% 지점
      const plateHeight = vheight * 0.15; // 차량 높이의 15%
      const plateWidth = vwidth * 0.4; // 차량 너비의 40%
      const plateX = vx + (vwidth - plateWidth) / 2; // 중앙 정렬

      // 경계값 체크
      const finalX = Math.max(0, Math.min(plateX, img.naturalWidth - plateWidth));
      const finalY = Math.max(0, Math.min(plateY, img.naturalHeight - plateHeight));
      const finalWidth = Math.min(plateWidth, img.naturalWidth - finalX);
      const finalHeight = Math.min(plateHeight, img.naturalHeight - finalY);

      // 최소 크기 체크
      if (finalWidth > 30 && finalHeight > 10) {
        plateRegions.push({
          bbox: [finalX, finalY, finalWidth, finalHeight]
        });
      }
    });

    return plateRegions;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setResult(null);

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 간단한 박스 기반 번호판 영역 추출
  const extractLicensePlateFromVehicle = (vehicleDetections: Detection[], img: HTMLImageElement): { croppedImages: string[], plateRegions: Array<{bbox: number[], confidence: number}> } => {
    const croppedImages: string[] = [];
    const plateRegions: Array<{bbox: number[], confidence: number}> = [];

    vehicleDetections.forEach(vehicle => {
      const [vx, vy, vwidth, vheight] = vehicle.bbox;

      // 차량 박스에서 번호판 영역 계산
      // 가로: 가운데 70% (좌우 15%씩 제외)
      // 세로: 하단 30%
      const plateWidth = vwidth * 0.7;
      const plateHeight = vheight * 0.3;
      const plateX = vx + (vwidth * 0.15);
      const plateY = vy + (vheight * 0.7);

      // 번호판 영역 크롭
      const plateCanvas = document.createElement('canvas');
      const plateCtx = plateCanvas.getContext('2d');
      if (plateCtx) {
        plateCanvas.width = plateWidth;
        plateCanvas.height = plateHeight;

        // 원본 이미지에서 번호판 영역만 크롭
        plateCtx.drawImage(
          img,
          plateX, plateY, plateWidth, plateHeight,
          0, 0, plateWidth, plateHeight
        );

        // base64 이미지로 변환
        const croppedDataUrl = plateCanvas.toDataURL('image/png');
        croppedImages.push(croppedDataUrl);

        // 위치 정보 저장
        plateRegions.push({
          bbox: [plateX, plateY, plateWidth, plateHeight],
          confidence: 0.8
        });
      }
    });

    return { croppedImages, plateRegions };
  };

  // 기존 간단한 번호판 영역 크롭 함수 (fallback용)
  const cropLicensePlateRegionsSimple = (vehicleDetections: Detection[], img: HTMLImageElement): { croppedImages: string[], plateRegions: Array<{bbox: number[], confidence: number}> } => {
    const croppedImages: string[] = [];
    const plateRegions: Array<{bbox: number[], confidence: number}> = [];

    vehicleDetections.forEach(vehicle => {
      const [vx, vy, vwidth, vheight] = vehicle.bbox;

      // 차량 하단 영역에서 번호판 영역 추정
      const plateY = vy + (vheight * 0.6);
      const plateHeight = vheight * 0.15;
      const plateWidth = vwidth * 0.4;
      const plateX = vx + (vwidth - plateWidth) / 2;

      // 경계값 체크
      const finalX = Math.max(0, Math.min(plateX, img.naturalWidth - plateWidth));
      const finalY = Math.max(0, Math.min(plateY, img.naturalHeight - plateHeight));
      const finalWidth = Math.min(plateWidth, img.naturalWidth - finalX);
      const finalHeight = Math.min(plateHeight, img.naturalHeight - finalY);

      if (finalWidth > 30 && finalHeight > 10) {
        // 캔버스를 사용해서 번호판 영역 크롭
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCanvas.width = finalWidth;
          cropCanvas.height = finalHeight;

          // 원본 이미지에서 번호판 영역만 크롭
          cropCtx.drawImage(
            img,
            finalX, finalY, finalWidth, finalHeight,
            0, 0, finalWidth, finalHeight
          );

          // base64 이미지로 변환
          const croppedDataUrl = cropCanvas.toDataURL('image/png');
          croppedImages.push(croppedDataUrl);

          // 간단한 방식에서도 위치 정보 저장
          plateRegions.push({
            bbox: [finalX, finalY, finalWidth, finalHeight],
            confidence: 0.5 // 기본 신뢰도
          });
        }
      }
    });

    return { croppedImages, plateRegions };
  };

  const detectLicensePlate = async (imageFile: File) => {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch('/api/v1/ocr/enter-ocr', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const plateResult = await response.json();
        return plateResult;
      }
    } catch (err) {
      console.warn('번호판 인식 실패:', err);
    }
    return null;
  };

  const handleDetection = async () => {
    if (!selectedFile || !model) {
      setError('이미지를 선택하고 모델이 로드될 때까지 기다려주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const img = imageRef.current;
      if (!img) {
        throw new Error('이미지 요소를 찾을 수 없습니다.');
      }

      // COCO-SSD로 객체 감지
      const predictions = await model.detect(img);

      // 차량 관련 클래스만 필터링
      const vehicleDetections = predictions.filter(prediction =>
        vehicleClasses.includes(prediction.class)
      );

      // 번호판 인식도 동시에 수행
      const plateResult = await detectLicensePlate(selectedFile);

      // 간단한 박스 기반 번호판 영역 추출
      const plateDetectionResult = extractLicensePlateFromVehicle(vehicleDetections, img);

      const { croppedImages: croppedPlateImages, plateRegions } = plateDetectionResult;

      // 결과 데이터 준비
      const detections = vehicleDetections.map((detection, index) => ({
        bbox: detection.bbox,
        confidence: detection.score,
        class: index,
        class_name: detection.class
      }));

      const resultData = {
        success: vehicleDetections.length > 0,
        detections: vehicleDetections.length > 0 ? detections : undefined,
        message: vehicleDetections.length === 0 ? '차량이 감지되지 않았습니다.' : undefined,
        plateResult: plateResult,
        croppedPlateImages: croppedPlateImages,
        plateRegions: plateRegions,
        originalImage: previewImage,
        detectionMethod: 'Simple Box'
      };

      // 결과 설정
      setResult(resultData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '차량 감지 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 웹캠 시작
  const startWebcam = async () => {
    try {
      // 오디오 초기화 (사용자 상호작용으로 인해 가능)
      if (!audioInitialized) {
        await initializeAudio();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsWebcamMode(true);
        setError(null);
      }
    } catch (err) {
      setError('웹캠 접근에 실패했습니다.');
      console.error('웹캠 오류:', err);
    }
  };

  // 웹캠 정지
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamMode(false);
    stopParkingSystem();
  };

  // 주차장 시스템 시작
  const startParkingSystem = async () => {
    if (!model || !isWebcamMode) return;

    // 오디오 초기화 확인
    if (!audioInitialized) {
      await initializeAudio();
    }

    setParkingSystemActive(true);
    setSystemStatus('waiting');
    setDetectionTimer(2); // 2초 카운트다운

    // 2초 대기 타이머
    const countdown = setInterval(() => {
      setDetectionTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdown);
          startVehicleDetection(); // 2초 후 차량 감지 시작
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 차량 감지 시작 (1초간 연속 체크)
  const startVehicleDetection = () => {
    setSystemStatus('checking');
    let detectionCount = 0;
    let checkCount = 0;
    const maxChecks = 10; // 1초간 10번 체크 (100ms 간격)

    const checkInterval = setInterval(async () => {
      checkCount++;

      if (videoRef.current && model) {
        const predictions = await model.detect(videoRef.current);
        const vehicleDetections = predictions.filter(prediction =>
          ['car', 'truck', 'bus', 'motorcycle'].includes(prediction.class)
        );

        if (vehicleDetections.length > 0) {
          detectionCount++;
        }
      }

      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);

        // 10번 중 3번 이상 감지되면 성공
        console.log(`차량 감지 결과: ${detectionCount}/10번 감지`);

        if (detectionCount >= 3) {
          console.log('차량 감지 성공! 처리 시작');
          setSystemStatus('processing');
          await captureAndProcessImage();
        } else {
          // 차량 탐지 실패 - 빨간 화면 + notgood.mp3
          console.log('차량 감지 실패! 빨간 화면 표시');
          setSystemStatus('failure');
          playSound('notgood');

          // 3초 후 다시 대기 상태로
          setFeedbackTimer(3);
          const failureCountdown = setInterval(() => {
            setFeedbackTimer(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(failureCountdown);
                setSystemStatus('waiting');
                setResult(null);
                startParkingSystem(); // 다시 시작
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    }, 100);

    detectionIntervalRef.current = checkInterval;
  };

  // 이미지 캡처 및 처리
  const captureAndProcessImage = async () => {
    if (!videoRef.current || !model) return;

    // 비디오에서 현재 프레임 캡처
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    // 캡처된 이미지로 차량 감지
    const predictions = await model.detect(videoRef.current);
    const vehicleDetections = predictions.filter(prediction =>
      ['car', 'truck', 'bus', 'motorcycle'].includes(prediction.class)
    );

    if (vehicleDetections.length > 0) {
      // 임시 이미지 엘리먼트 생성
      const tempImg = new Image();
      tempImg.onload = async () => {
        // 번호판 추출
        const plateDetectionResult = extractLicensePlateFromVehicle(vehicleDetections, tempImg);
        const { croppedImages: croppedPlateImages, plateRegions } = plateDetectionResult;

        if (croppedPlateImages.length > 0) {
          // 첫 번째 번호판 이미지를 파일로 변환
          const dataUrl = croppedPlateImages[0];
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], 'captured_plate.png', { type: 'image/png' });

          // OCR API 호출
          const plateResult = await detectLicensePlate(file);

          // 결과 설정
          const resultData = {
            success: true,
            detections: vehicleDetections.map((detection, index) => ({
              bbox: detection.bbox,
              confidence: detection.score,
              class: index,
              class_name: detection.class
            })),
            plateResult: plateResult,
            croppedPlateImages: croppedPlateImages,
            plateRegions: plateRegions,
            originalImage: canvas.toDataURL(),
            detectionMethod: 'Parking System'
          };

          setResult(resultData);

          // 번호판 인식 성공여부에 따른 피드백
          console.log('OCR 결과 확인:', plateResult);

          if (plateResult && plateResult.success && plateResult.plate_number) {
            // 성공: 녹색 화면 + good.mp3
            console.log('번호판 인식 성공! 녹색 화면 표시');
            setSystemStatus('success');
            playSound('good');
          } else {
            // 실패: 빨간 화면 + notgood.mp3
            console.log('번호판 인식 실패! 빨간 화면 표시');
            setSystemStatus('failure');
            playSound('notgood');
          }

          // 3초 후 다시 대기 상태로
          setFeedbackTimer(3);
          const feedbackCountdown = setInterval(() => {
            setFeedbackTimer(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(feedbackCountdown);
                setSystemStatus('waiting');
                setResult(null);
                startParkingSystem();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          // 번호판 영역을 찾지 못한 경우 - 실패 처리
          setSystemStatus('failure');
          playSound('notgood');

          setFeedbackTimer(3);
          const failureCountdown = setInterval(() => {
            setFeedbackTimer(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(failureCountdown);
                setSystemStatus('waiting');
                setResult(null);
                startParkingSystem();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      };
      tempImg.src = canvas.toDataURL();
    } else {
      // 차량이 감지되지 않은 경우 - 실패 처리
      setSystemStatus('failure');
      playSound('notgood');

      setFeedbackTimer(3);
      const failureCountdown = setInterval(() => {
        setFeedbackTimer(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(failureCountdown);
            setSystemStatus('waiting');
            setResult(null);
            startParkingSystem();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // 주차장 시스템 정지
  const stopParkingSystem = () => {
    setParkingSystemActive(false);
    setSystemStatus('waiting');
    setDetectionTimer(null);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  const resetTest = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // 캔버스 초기화
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const getClassColor = (className: string) => {
    const colors: { [key: string]: string } = {
      'car': '#ff6b6b',
      'truck': '#4ecdc4',
      'bus': '#45b7d1',
      'motorcycle': '#96ceb4',
    };
    return colors[className] || '#feca57';
  };

  if (modelLoading) {
    return (
      <div className="yolo-detection-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>COCO-SSD 모델을 로드하는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="yolo-detection-container">
      <div className="yolo-header">
        <h1>🚗 COCO-SSD 차량 감지 테스트</h1>
        <p>이미지를 업로드하여 클라이언트 사이드 COCO-SSD 모델의 차량 감지 성능을 테스트해보세요.</p>
      </div>

      <div className="yolo-content">
        {/* 모드 선택 */}
        <div className="mode-selection">
          <button
            onClick={() => setIsWebcamMode(false)}
            className={`mode-btn ${!isWebcamMode ? 'active' : ''}`}
          >
            📁 이미지 업로드 모드
          </button>
          <button
            onClick={() => setIsWebcamMode(true)}
            className={`mode-btn ${isWebcamMode ? 'active' : ''}`}
            disabled={!model}
          >
            📹 주차장 시스템 모드
          </button>
        </div>

        {!isWebcamMode ? (
          // 기존 파일 업로드 섹션
          <div className="upload-section">
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input" className="upload-label">
                <div className="upload-icon">📁</div>
                <div className="upload-text">
                  {selectedFile ? selectedFile.name : '이미지 파일을 선택하세요'}
                </div>
              </label>
            </div>

            <div className="action-buttons">
              <button
                onClick={handleDetection}
                disabled={!selectedFile || loading || !model}
                className="detect-btn"
              >
                {loading ? '감지 중...' : '차량 감지 시작'}
              </button>
              <button
                onClick={resetTest}
                className="reset-btn"
              >
                초기화
              </button>
            </div>
          </div>
        ) : (
          // 주차장 시스템 섹션
          <div className="parking-system-section">
            {/* 오디오 테스트 버튼들 */}
            {audioInitialized && (
              <div style={{ marginBottom: '20px', textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>🔊 오디오 테스트</h4>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    onClick={() => playSound('good')}
                    className="start-btn"
                    style={{ fontSize: '0.9rem', padding: '10px 20px' }}
                  >
                    🔊 성공음 테스트
                  </button>
                  <button
                    onClick={() => playSound('notgood')}
                    className="stop-btn"
                    style={{ fontSize: '0.9rem', padding: '10px 20px' }}
                  >
                    🔊 실패음 테스트
                  </button>
                </div>
              </div>
            )}

            <div className="parking-status">
              <h3>🚗 주차장 시스템 진행 단계</h3>
              <div className="status-steps">
                <div className={`status-step ${systemStatus === 'waiting' ? 'active' : (systemStatus === 'checking' || systemStatus === 'processing' || systemStatus === 'completed') ? 'completed' : ''}`}>
                  <span className="step-number">1</span>
                  <span className="step-text">차량 대기</span>
                </div>
                <div className={`status-step ${systemStatus === 'checking' ? 'active' : (systemStatus === 'processing' || systemStatus === 'completed' || systemStatus === 'success' || systemStatus === 'failure') ? 'completed' : ''}`}>
                  <span className="step-number">2</span>
                  <span className="step-text">
                    차량 감지
                    {detectionTimer !== null && ` - ${detectionTimer}초 대기`}
                    {systemStatus === 'checking' && ' - 감지 중...'}
                  </span>
                </div>
                <div className={`status-step ${systemStatus === 'processing' ? 'active' : (systemStatus === 'completed' || systemStatus === 'success' || systemStatus === 'failure') ? 'completed' : ''}`}>
                  <span className="step-number">3</span>
                  <span className="step-text">YOLO 처리 및 번호판 OCR</span>
                </div>
                <div className={`status-step ${(systemStatus === 'completed' || systemStatus === 'success' || systemStatus === 'failure') ? 'completed' : ''}`}>
                  <span className="step-icon">✓</span>
                  <span className="step-text">처리 완료</span>
                </div>
              </div>
            </div>

            <div className="webcam-controls">
              <div className="video-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', maxWidth: '640px', height: 'auto' }}
                />

                {/* 피드백 화면 오버레이 */}
                {(systemStatus === 'success' || systemStatus === 'failure') && (
                  <div className={`feedback-overlay ${systemStatus}`} style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    backgroundColor: systemStatus === 'success' ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)',
                    animation: 'fadeIn 0.5s ease-in-out'
                  }}>
                    <div className="feedback-content" style={{
                      textAlign: 'center',
                      color: 'white',
                      padding: '30px',
                      borderRadius: '15px',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      backdropFilter: 'blur(5px)'
                    }}>
                      {systemStatus === 'success' ? (
                        <>
                          <div className="feedback-icon" style={{ fontSize: '4rem', marginBottom: '15px' }}>✅</div>
                          <div className="feedback-title" style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '10px' }}>번호판 인식 성공!</div>
                          <div className="feedback-subtitle" style={{ fontSize: '1.1rem', marginBottom: '15px' }}>차량 정보가 성공적으로 처리되었습니다.</div>
                        </>
                      ) : (
                        <>
                          <div className="feedback-icon" style={{ fontSize: '4rem', marginBottom: '15px' }}>❌</div>
                          <div className="feedback-title" style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '10px' }}>번호판 인식 실패</div>
                          <div className="feedback-subtitle" style={{ fontSize: '1.1rem', marginBottom: '15px' }}>다시 시도해주세요.</div>
                        </>
                      )}
                      {feedbackTimer !== null && (
                        <div className="feedback-timer" style={{ fontSize: '1rem', opacity: 0.8 }}>{feedbackTimer}초 후 자동 재시도</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="control-buttons">
                {!streamRef.current ? (
                  <button onClick={startWebcam} className="start-btn">
                    📹 웹캠 시작
                  </button>
                ) : (
                  <>
                    <button onClick={stopWebcam} className="stop-btn">
                      🛑 웹캠 정지
                    </button>
                    {!parkingSystemActive ? (
                      <button onClick={startParkingSystem} className="system-btn" disabled={!model}>
                        🚗 주차장 시스템 시작
                      </button>
                    ) : (
                      <button onClick={stopParkingSystem} className="system-btn">
                        ⏹ 주차장 시스템 정지
                      </button>
                    )}

                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 이미지 미리보기 */}
        {previewImage && (
          <div className="preview-section">
            <h3>업로드된 이미지</h3>
            <div className="image-container">
              <img
                ref={imageRef}
                src={previewImage}
                alt="업로드된 이미지"
                className="preview-image"
                crossOrigin="anonymous"
                onLoad={() => {
                  // 이미지 로드 완료 시 캔버스 초기화
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="error-section">
            <div className="error-message">
              ⚠️ {error}
            </div>
          </div>
        )}

        {/* 단계별 처리 결과 */}
        {result && (
          <div className="process-result-section">
            <h3>🔍 번호판 인식 과정</h3>

            {result.success ? (
              <>
                {/* 1단계: 원본 이미지 */}
                <div className="step-section">
                  <h4>1단계: 업로드된 원본 이미지</h4>
                  <div className="step-content">
                    <div className="image-container">
                      {result.originalImage && (
                        <img src={result.originalImage} alt="원본 이미지" className="step-image" />
                      )}
                    </div>
                    <div className="step-info">
                      <p>감지된 차량 수: <strong>{result.detections?.length || 0}대</strong></p>
                      {result.detections && result.detections.map((detection, index) => (
                        <div key={index} className="vehicle-info">
                          🚗 {detection.class_name} (신뢰도: {(detection.confidence * 100).toFixed(1)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2단계: 크롭된 번호판 영역들 */}
                {result.croppedPlateImages && result.croppedPlateImages.length > 0 && (
                  <div className="step-section">
                    <h4>2단계: 추출된 번호판 영역 ({result.detectionMethod || 'Unknown'} 방식)</h4>
                    <div className="step-content">
                      <div className="detection-info">
                        <p>
                          <strong>검출 방식:</strong> 📦 간단한 박스 기반 (차량 가로 70% x 하단 30%)
                        </p>
                        {result.plateRegions && result.plateRegions.length > 0 && (
                          <p><strong>검출된 후보 영역:</strong> {result.plateRegions.length}개</p>
                        )}
                      </div>
                      <div className="cropped-plates-grid">
                        {result.croppedPlateImages.map((plateImage, index) => (
                          <div key={index} className="cropped-plate-item">
                            <div className="plate-label">
                              번호판 영역 {index + 1}
                              {result.plateRegions && result.plateRegions[index] && (
                                <span className="confidence-badge">
                                  신뢰도: {(result.plateRegions[index].confidence * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                            <img src={plateImage} alt={`번호판 ${index + 1}`} className="cropped-plate-image" />
                            {result.plateRegions && result.plateRegions[index] && (
                              <div className="bbox-info">
                                위치: [{result.plateRegions[index].bbox.map(coord => Math.round(coord)).join(', ')}]
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 번호판 위치 시각화 */}
                      {result.originalImage && result.plateRegions && result.plateRegions.length > 0 && (
                        <div className="plate-visualization">
                          <h5>📍 원본 이미지에서 번호판 위치</h5>
                          <div className="visualization-container">
                            <canvas
                              ref={canvasRef}
                              className="plate-location-canvas"
                            />
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                )}

                {/* 3단계: OCR 결과 */}
                <div className="step-section">
                  <h4>3단계: OCR 분석 결과</h4>
                  <div className="step-content">
                    {result.plateResult && result.plateResult.success ? (
                      <div className="ocr-success">
                        <div className="ocr-result-box">
                          <div className="ocr-icon">🎯</div>
                          <div className="ocr-text">
                            <div className="ocr-label">인식된 번호판</div>
                            <div className="ocr-number">{result.plateResult.plate_number}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="ocr-failure">
                        <div className="ocr-result-box">
                          <div className="ocr-icon">❌</div>
                          <div className="ocr-text">
                            <div className="ocr-label">OCR 결과</div>
                            <div className="ocr-error">번호판을 인식하지 못했습니다</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="no-detection">
                <div className="no-detection-icon">🚫</div>
                <div className="no-detection-text">
                  {result.message || '차량이 감지되지 않았습니다.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default YoloCarDetection;