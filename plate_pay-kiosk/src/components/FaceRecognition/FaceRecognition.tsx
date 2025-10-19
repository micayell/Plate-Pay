import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { useApp } from '../../contexts/AppContext';
import ProgressBar from '../common/ProgressBar';
import styles from './FaceRecognition.module.css'; // 저희가 만든 CSS 모듈을 사용합니다.

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://pcarchu-kiosk.duckdns.org';

// origin/AI/IOT 브랜치의 상세한 상태를 사용합니다.
type Status = 'initializing' | 'loading-models' | 'detecting' | 'detected' | 'verifying' | 'success' | 'failed';

const FaceRecognition = () => {
  const navigate = useNavigate();
  const { state } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // UI 상태 관리는 저희가 만든 방식으로 통합합니다.
  const [status, setStatus] = useState<Status>('initializing');

  const totalAmount = state.cart.reduce((total, item) => total + item.product.price * item.quantity, 0);

  // origin/AI/IOT 브랜치의 백엔드 통신 로직을 가져옵니다.
  const sendFaceToAPI = useCallback(async (imageData: string) => {
    const orderDetails = { 
      storeId: 1, 
      carNumber: state.carNumber, 
      cost: totalAmount 
    };
    
    console.log(`[API CALL] sendFaceToAPI 호출됨.`);
    console.log(`  > 전송될 이미지 데이터 길이:`, imageData.length);
    console.log(`  > 전송될 주문 정보 (orderMenuRequest):`, JSON.stringify(orderDetails, null, 2));

    try {
      const byteString = atob(imageData.split(',')[1]);
      const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const formData = new FormData();
      formData.append("file", blob, "face.jpg");
      formData.append(
        "orderMenuRequest",
        new Blob(
          [JSON.stringify(orderDetails)],
          { type: "application/json" }
        )
      );
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/plate-pays/${encodeURIComponent(state.carNumber)}/compare`,
        { method: "POST", body: formData }
      );
      const result = await response.json();
      console.log(`[API RESPONSE] sendFaceToAPI 결과: status=${response.status}, ok=${response.ok}, body=`, result);
      return response.ok && result === true;
    } catch (error) {
      console.error("[API ERROR] sendFaceToAPI 오류:", error);
      return false;
    }
  }, [state.carNumber, totalAmount]);

  // 얼굴 인식 및 처리 로직 (두 브랜치의 장점을 결합)
  const handleVideoPlay = () => {
    setStatus('detecting');
    intervalRef.current = setInterval(async () => {
      if (videoRef.current && !videoRef.current.paused) {
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );

        if (detection) {
          setStatus('detected');
          if (intervalRef.current) clearInterval(intervalRef.current);

          // 캡처 및 API 전송
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d')?.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg');
          
          setStatus('verifying');
          const success = await sendFaceToAPI(imageData);

          if (success) {
            setStatus('success');
            setTimeout(() => {
              navigate('/payment-success', { state: { isCarPay: true } });
            }, 1500);
          } else {
            setStatus('failed');
            setTimeout(() => {
              // 실패 후 다시 감지 시작
              setStatus('detecting');
              handleVideoPlay();
            }, 3000);
          }
        }
      }
    }, 500);
  };

  // 모델 로딩 및 카메라 시작 로직
  useEffect(() => {
    const modelPath = '/models/face-api.js/face-api.js-master/weights';
    const loadAndStart = async () => {
      try {
        setStatus('loading-models');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        ]);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera or Model loading error:", err);
        setStatus('failed');
      }
    };
    loadAndStart();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // UI 렌더링 로직 (저희가 만든 동적 메시지 방식을 사용합니다)
  const getStatusMessage = () => {
    switch (status) {
      case 'initializing': return '카메라를 준비하고 있습니다...';
      case 'loading-models': return '얼굴 인식 모델을 불러오는 중...';
      case 'detecting': return '얼굴을 타원 안에 맞춰주세요.';
      case 'detected': return '얼굴이 인식되었습니다!';
      case 'verifying': return '얼굴을 인증하고 있습니다...';
      case 'success': return '인증이 완료되었습니다!';
      case 'failed': return '인증에 실패했습니다. 다시 시도합니다.';
      default: return '';
    }
  };

  const getStatusClass = () => {
    if (status === 'success') return styles.success;
    if (status === 'failed') return styles.error;
    return '';
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <ProgressBar currentStep={'payment-method'} />
        <h2 className={styles.title}>얼굴 인식</h2>
        <div className={styles.cameraContainer}>
          <video 
            ref={videoRef} 
            className={styles.video} 
            onPlay={handleVideoPlay}
            autoPlay 
            muted 
            playsInline 
          />
          <div className={styles.overlay}>
            <div className={styles.faceOutline}></div>
            <div className={`${styles.statusMessage} ${getStatusClass()}`}>
              {getStatusMessage()}
            </div>
          </div>
        </div>
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>선택된 차량</span>
            <span className={styles.summaryValue}>{state.carNumber}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>총 결제금액</span>
            <span className={styles.summaryValue}>{totalAmount.toLocaleString()}원</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button onClick={() => navigate(-1)} className={styles.cancelBtn}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;