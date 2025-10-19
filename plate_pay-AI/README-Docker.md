# License Plate OCR API Docker 배포 가이드

## 빠른 시작

### 1. Docker로 빌드 및 실행
```bash
# Docker 이미지 빌드
docker build -t plate-ocr-api .

# 컨테이너 실행
docker run -p 8000:8000 plate-ocr-api
```

### 2. Docker Compose로 실행 (권장)
```bash
# 백그라운드에서 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

## EC2 배포

### 1. EC2에서 접근 가능한 주소
- **API 엔드포인트**: `https://j13c108.p.ssafy.io:8000`
- **OCR 엔드포인트**: 
  - YOLO 포함: `https://j13c108.p.ssafy.io:8000/api/v1/ocr/license-plate`
  - YOLO 제외: `https://j13c108.p.ssafy.io:8000/api/v1/ocr/non-yolo-license-plate`

### 2. EC2 보안 그룹 설정
- **포트 8000**: 인바운드 규칙에 HTTP/HTTPS 허용 추가

### 3. 사용 예시

#### 번호판 OCR 테스트
```bash
curl -X POST "https://j13c108.p.ssafy.io:8000/api/v1/ocr/license-plate" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@license_plate.jpg"
```


## API 사용법

### 번호판 OCR (YOLO 포함)
- **URL**: `/api/v1/ocr/license-plate`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **파라미터**: file (이미지 파일)

### 번호판 OCR (YOLO 제외)
- **URL**: `/api/v1/ocr/non-yolo-license-plate`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **파라미터**: file (이미지 파일)

### 응답 형식
```json
{
  "success": true,
  "plate_number": "12가3456"
}
```

## 환경 설정

### 환경변수
- `HOST`: 서버 호스트 (기본값: 0.0.0.0)
- `PORT`: 서버 포트 (기본값: 8000)
- `RELOAD`: 개발모드 리로드 (기본값: false)

### .env 파일 생성
```bash
cp .env.example .env
# 필요에 따라 .env 파일 수정
```

## 모니터링

### 헬스체크
```bash
curl http://localhost:8000/health
```

### 로그 확인
```bash
# Docker Compose 사용시
docker-compose logs -f paythrough-ai

# Docker 직접 사용시
docker logs -f <container_id>
```