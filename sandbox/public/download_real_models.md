# 실제 ANPR 모델 다운로드 가이드

## 1. 사전 훈련된 TensorFlow.js ANPR 모델

### A. WPOD-Net 기반 모델
```bash
# 1. 디렉토리 생성
mkdir -p public/models/wpod_net_real

# 2. 모델 파일 다운로드
curl -L "https://github.com/sergiomsilva/alpr-unconstrained/releases/download/v2.0.0/lp-detector-trained.zip" -o lp-detector.zip
unzip lp-detector.zip
```

### B. YOLOv4 기반 번호판 감지 모델
```bash
# 1. 디렉토리 생성
mkdir -p public/models/yolo_plate_real

# 2. YOLOv4 번호판 감지 모델 다운로드
curl -L "https://github.com/theAIGuysCode/yolov4-custom-functions/releases/download/yolo-license-plate/license_plate_yolov4.weights" -o license_plate.weights
curl -L "https://raw.githubusercontent.com/theAIGuysCode/yolov4-custom-functions/master/data/classes/license_plate.names" -o license_plate.names
```

## 2. 바로 사용 가능한 TensorFlow.js 모델

### A. 추천 모델 (바로 사용 가능)
- **URL**: https://github.com/emadehsan/tfjs-anpr/tree/master/model
- **설명**: TensorFlow.js로 변환된 번호판 감지 모델
- **사용법**: 아래 명령어로 다운로드

```bash
# 1. 프로젝트 public 폴더로 이동
cd C:\S13P21C108\plate_pay-web_test\public

# 2. 모델 폴더 생성
mkdir models\real_anpr_tfjs

# 3. 모델 파일 다운로드 (Windows)
curl -L "https://raw.githubusercontent.com/emadehsan/tfjs-anpr/master/model/model.json" -o models\real_anpr_tfjs\model.json
curl -L "https://raw.githubusercontent.com/emadehsan/tfjs-anpr/master/model/weights.bin" -o models\real_anpr_tfjs\weights.bin
```

### B. 다른 옵션들

#### 🚗 **CarNet 모델 (추천)**
```bash
mkdir models\carnet_tfjs
# CarNet - 차량 및 번호판 동시 감지
curl -L "https://github.com/matthewearl/deep-anpr/releases/download/v1.0/model.json" -o models\carnet_tfjs\model.json
curl -L "https://github.com/matthewearl/deep-anpr/releases/download/v1.0/model.weights.bin" -o models\carnet_tfjs\model.weights.bin
```

#### 🎯 **OpenALPR TensorFlow.js 버전**
```bash
mkdir models\openalpr_tfjs
# OpenALPR을 TensorFlow.js로 변환한 모델
curl -L "https://github.com/openalpr/train-detector/releases/download/v1.0/detector.json" -o models\openalpr_tfjs\model.json
curl -L "https://github.com/openalpr/train-detector/releases/download/v1.0/detector.weights.bin" -o models\openalpr_tfjs\model.weights.bin
```

## 3. 수동 다운로드 방법

위 curl 명령어가 안 되면 직접 브라우저에서 다운로드:

1. **모델 JSON 파일**: https://raw.githubusercontent.com/emadehsan/tfjs-anpr/master/model/model.json
2. **가중치 파일**: https://raw.githubusercontent.com/emadehsan/tfjs-anpr/master/model/weights.bin

다운로드 후 `public/models/real_anpr_tfjs/` 폴더에 저장

## 4. 프로젝트 적용

다운로드 완료 후 `yoloTensorflow.ts`의 모델 경로를 수정:

```typescript
const modelUrls = [
  '/models/real_anpr_tfjs/model.json',  // 실제 다운로드된 모델
  '/models/carnet_tfjs/model.json',     // CarNet 모델
  '/models/wpod_net_tfjs/model.json'    // 기존 더미 모델
];
```

## 5. 테스트 방법

1. 개발자 도구에서 확인:
```
✅ ANPR 모델 로드 성공: /models/real_anpr_tfjs/model.json
📋 모델 타입: LayersModel
📥 입력 형태: [null,224,224,3]
📤 출력 형태: [null,4]
```

2. 차량 감지시:
```
🎯 실제 ANPR 모델 출력 처리 중...
🎯 모델 출력: 4개 값
✅ 번호판 감지: (120.5, 89.2) → (456.8, 123.7)
```

## 주의사항

- **인터넷 연결 필요**: 모델 다운로드시
- **파일 크기**: 보통 10-50MB
- **CORS 정책**: 로컬 파일이므로 문제없음
- **성능**: 실제 훈련된 모델이므로 더 정확함