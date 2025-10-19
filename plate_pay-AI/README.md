# PayThru-AI: License Plate OCR API

라즈베리파이에서 촬영한 차량 번호판 이미지를 OCR로 인식하는 FastAPI 서버입니다.

## 설치

```bash
pip install -r requirements.txt
```

## 실행

```bash
# 방법 1: 직접 실행
python main.py

# 방법 2: run 스크립트 사용
python run.py

# 방법 3: uvicorn 직접 사용
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API 사용법

### 번호판 OCR
- **URL**: `POST /ocr/license-plate`
- **Content-Type**: `multipart/form-data`
- **파라미터**: `file` (이미지 파일)

### 예제 (Python)
```python
import requests

# 이미지 파일 업로드
with open('car_image.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:8000/ocr/license-plate', files=files)
    result = response.json()
    
print(f"번호판: {result['best_result']}")
```

### 예제 (curl)
```bash
curl -X POST "http://localhost:8000/ocr/license-plate" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@car_image.jpg"
```

### 라즈베리파이에서 사용 예제
```python
import requests
import cv2

# 카메라로 사진 촬영
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
cv2.imwrite('temp_image.jpg', frame)
cap.release()

# API로 전송
with open('temp_image.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://YOUR_SERVER_IP:8000/ocr/license-plate', files=files)
    result = response.json()
    
if result['success']:
    print(f"인식된 번호판: {result['best_result']}")
else:
    print("번호판 인식 실패")
```

## API 응답 형식

```json
{
    "success": true,
    "license_plates": [
        {
            "text": "12가3456",
            "confidence": 0.95,
            "bbox": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
        }
    ],
    "best_result": "12가3456"
}
```

## 지원 기능

- 한국어 및 영어 번호판 인식
- 이미지 전처리로 OCR 정확도 향상
- 번호판 패턴 매칭 필터링
- 신뢰도 기반 결과 정렬

## API 문서

서버 실행 후 다음 URL에서 자동 생성된 API 문서를 확인할 수 있습니다:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc