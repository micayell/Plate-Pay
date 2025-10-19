import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import './FaceRecognitionTest.css';

interface FaceRegistrationResponse {
  success: boolean;
  message: string;
  user_id?: string;
}

interface FaceVerificationResponse {
  success: boolean;
  user_id?: string;
  confidence?: number;
  message: string;
}

interface RegisteredUser {
  users: string[];
}

const FaceRecognitionTest: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<FaceRegistrationResponse | null>(null);
  const [verificationResult, setVerificationResult] = useState<FaceVerificationResponse | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // 실시간 얼굴 감지 (Canvas 2D API 사용)
  const detectFace = useCallback(() => {
    if (!webcamRef.current || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!video || !ctx || video.readyState !== 4) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // 간단한 얼굴 감지 (실제로는 더 정교한 라이브러리 사용 권장)
    // 여기서는 비디오가 있으면 얼굴이 있다고 가정하고 테스트
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasValidImage = imageData.data.some(pixel => pixel > 0);
    
    setFaceDetected(hasValidImage && video.videoWidth > 0);
  }, []);

  // 자동 캡처 카운트다운
  const startAutoCapture = useCallback(() => {
    if (!faceDetected) return;
    
    setCaptureCountdown(3);
    const countdown = setInterval(() => {
      setCaptureCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          // 자동 캡처 실행
          const imageSrc = webcamRef.current?.getScreenshot();
          if (imageSrc) {
            fetch(imageSrc)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], 'auto-capture.jpg', { type: 'image/jpeg' });
                setSelectedFile(file);
                setPreviewUrl(imageSrc);
                setAutoCapture(false);
                console.log('🤖 얼굴 감지로 자동 캡처 완료!');
              });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [faceDetected]);

  // 웹캠에서 수동 사진 캡처
  const captureFromWebcam = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Base64를 Blob으로 변환
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(imageSrc);
        });
    }
  };

  // 실시간 얼굴 감지 시작/중지
  useEffect(() => {
    if (useWebcam && autoCapture) {
      detectionIntervalRef.current = setInterval(detectFace, 500); // 0.5초마다 체크
      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
        }
      };
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setFaceDetected(false);
      setCaptureCountdown(0);
    }
  }, [useWebcam, autoCapture, detectFace]);

  // 얼굴 감지 시 자동 캡처 트리거
  useEffect(() => {
    if (faceDetected && autoCapture && captureCountdown === 0) {
      startAutoCapture();
    }
  }, [faceDetected, autoCapture, captureCountdown, startAutoCapture]);

  // 등록된 사용자 목록 조회
  const fetchRegisteredUsers = async () => {
    try {
      const response = await fetch('http://j13c108.p.ssafy.io:8100/api/v1/face/users');
      if (response.ok) {
        const data: RegisteredUser = await response.json();
        setRegisteredUsers(data.users);
      }
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
    }
  };

  // 얼굴 등록
  const registerFace = async () => {
    if (!userId.trim()) {
      alert('사용자 ID를 입력해주세요.');
      return;
    }

    if (!selectedFile) {
      alert('얼굴 사진을 선택하거나 캡처해주세요.');
      return;
    }

    setIsProcessing(true);
    setRegistrationResult(null);

    try {
      const formData = new FormData();
      formData.append('user_id', userId.trim());
      formData.append('file', selectedFile);

      const response = await fetch('http://j13c108.p.ssafy.io:8100/api/v1/face/register', {
        method: 'POST',
        body: formData,
      });

      const result: FaceRegistrationResponse = await response.json();
      setRegistrationResult(result);
      
      if (result.success) {
        fetchRegisteredUsers(); // 목록 새로고침
      }
    } catch (error) {
      setRegistrationResult({
        success: false,
        message: `등록 중 오류 발생: ${error}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 얼굴 검증
  const verifyFace = async () => {
    if (!userId.trim()) {
      alert('사용자 ID를 입력해주세요.');
      return;
    }

    if (!selectedFile) {
      alert('검증할 얼굴 사진을 선택하거나 캡처해주세요.');
      return;
    }

    setIsProcessing(true);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('user_id', userId.trim());
      formData.append('file', selectedFile);

      const response = await fetch('http://j13c108.p.ssafy.io:8100/api/v1/face/verify', {
        method: 'POST',
        body: formData,
      });

      const result: FaceVerificationResponse = await response.json();
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({
        success: false,
        message: `검증 중 오류 발생: ${error}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 초기화
  const resetForm = () => {
    setUserId('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setRegistrationResult(null);
    setVerificationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 컴포넌트 마운트 시 사용자 목록 조회
  React.useEffect(() => {
    fetchRegisteredUsers();
  }, []);

  return (
    <div className="face-recognition-test">
      <div className="main-content">
        <h1 className="page-title">🔐 얼굴 인식 테스트</h1>
        
        {/* 사용자 입력 섹션 */}
        <div className="input-section">
          <div className="user-input-group">
            <label htmlFor="userId">사용자 ID:</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="예: user123"
              className="user-id-input"
            />
          </div>
        </div>

        {/* 이미지 입력 섹션 */}
        <div className="image-input-section">
          <div className="input-method-toggle">
            <button 
              className={`toggle-btn ${!useWebcam ? 'active' : ''}`}
              onClick={() => setUseWebcam(false)}
            >
              📁 파일 업로드
            </button>
            <button 
              className={`toggle-btn ${useWebcam ? 'active' : ''}`}
              onClick={() => setUseWebcam(true)}
            >
              📷 웹캠 사용
            </button>
          </div>

          {!useWebcam ? (
            <div className="file-upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
              />
              <div className="upload-help">
                얼굴이 명확하게 보이는 사진을 선택해주세요
              </div>
            </div>
          ) : (
            <div className="webcam-section">
              <div className="webcam-container">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: 'user',
                    width: 640,
                    height: 480
                  }}
                  className="webcam"
                />
                <canvas 
                  ref={canvasRef} 
                  style={{ display: 'none' }}
                />
                
                {/* 얼굴 감지 상태 표시 */}
                <div className={`face-detection-status ${faceDetected ? 'detected' : 'not-detected'}`}>
                  {faceDetected ? '😊 얼굴 감지됨' : '🔍 얼굴을 찾는 중...'}
                </div>
                
                {/* 자동 캡처 카운트다운 */}
                {captureCountdown > 0 && (
                  <div className="capture-countdown">
                    📸 {captureCountdown}초 후 자동 촬영
                  </div>
                )}
              </div>
              
              <div className="webcam-controls">
                <button 
                  className={`auto-capture-btn ${autoCapture ? 'active' : ''}`}
                  onClick={() => setAutoCapture(!autoCapture)}
                  disabled={isProcessing}
                >
                  {autoCapture ? '🤖 자동 감지 ON' : '🤖 자동 감지 OFF'}
                </button>
                <button 
                  onClick={captureFromWebcam}
                  className="capture-btn"
                  disabled={isProcessing}
                >
                  📸 수동 촬영
                </button>
              </div>
            </div>
          )}

          {/* 이미지 미리보기 */}
          {previewUrl && (
            <div className="image-preview">
              <h3>선택된 이미지:</h3>
              <img src={previewUrl} alt="미리보기" className="preview-image" />
            </div>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div className="action-buttons">
          <button 
            onClick={registerFace}
            disabled={isProcessing || !userId.trim() || !selectedFile}
            className="action-btn register-btn"
          >
            {isProcessing ? '처리 중...' : '🔐 얼굴 등록'}
          </button>
          
          <button 
            onClick={verifyFace}
            disabled={isProcessing || !userId.trim() || !selectedFile}
            className="action-btn verify-btn"
          >
            {isProcessing ? '처리 중...' : '✅ 얼굴 검증'}
          </button>
          
          <button 
            onClick={resetForm}
            disabled={isProcessing}
            className="action-btn reset-btn"
          >
            🔄 초기화
          </button>
        </div>

        {/* 결과 표시 */}
        <div className="results-section">
          {registrationResult && (
            <div className={`result-card ${registrationResult.success ? 'success' : 'error'}`}>
              <h3>📝 등록 결과</h3>
              <p className="result-message">{registrationResult.message}</p>
              {registrationResult.user_id && (
                <p className="result-detail">사용자 ID: {registrationResult.user_id}</p>
              )}
            </div>
          )}

          {verificationResult && (
            <div className={`result-card ${verificationResult.success ? 'success' : 'error'}`}>
              <h3>🔍 검증 결과</h3>
              <p className="result-message">{verificationResult.message}</p>
              {verificationResult.confidence !== undefined && (
                <p className="result-detail">
                  신뢰도: {verificationResult.confidence.toFixed(1)}%
                </p>
              )}
              <p className="result-status">
                상태: {verificationResult.success ? '✅ 인증 성공' : '❌ 인증 실패'}
              </p>
            </div>
          )}
        </div>

        {/* 등록된 사용자 목록 */}
        <div className="users-section">
          <div className="users-header">
            <h3>👥 등록된 사용자 ({registeredUsers.length}명)</h3>
            <button onClick={fetchRegisteredUsers} className="refresh-btn">
              🔄 새로고침
            </button>
          </div>
          <div className="users-list">
            {registeredUsers.length === 0 ? (
              <p className="no-users">등록된 사용자가 없습니다.</p>
            ) : (
              registeredUsers.map((user, index) => (
                <div 
                  key={index} 
                  className={`user-item ${user === userId ? 'selected' : ''}`}
                  onClick={() => setUserId(user)}
                >
                  {user}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognitionTest;