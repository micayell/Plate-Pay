# Face Recognition API

얼굴 인식 기반 사용자 등록 및 검증 API

## 🚀 빠른 시작

### 1. Docker Compose로 실행 (권장)
```bash
# 백그라운드에서 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 2. Docker로 직접 실행
```bash
# Docker 이미지 빌드
docker build -t face-recognition-api .

# 컨테이너 실행
docker run -p 8100:8100 face-recognition-api
```

### 3. 로컬 실행
```bash
# 가상환경 생성 (권장)
python -m venv face_env
source face_env/bin/activate  # Windows: face_env\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python run.py
```

## 📋 API 엔드포인트

### 얼굴 등록
```bash
curl -X POST "http://localhost:8100/api/v1/face/register" \
  -H "Content-Type: multipart/form-data" \
  -F "user_id=alice" \
  -F "file=@face_image.jpg"
```

**응답:**
```json
{
  "success": true,
  "message": "얼굴이 성공적으로 등록되었습니다.",
  "user_id": "alice"
}
```

### 얼굴 검증
```bash
curl -X POST "http://localhost:8100/api/v1/face/verify" \
  -H "Content-Type: multipart/form-data" \
  -F "user_id=alice" \
  -F "file=@verify_image.jpg"
```

**응답:**
```json
{
  "success": true,
  "message": "얼굴 인증에 성공했습니다.",
  "confidence": 85.42,
  "user_id": "alice"
}
```

### 사용자 목록 조회
```bash
curl -X GET "http://localhost:8100/api/v1/face/users"
```

**응답:**
```json
{
  "users": ["alice", "bob", "charlie"]
}
```

### 사용자 삭제
```bash
curl -X DELETE "http://localhost:8100/api/v1/face/users/alice"
```

## 🎯 사용 시나리오

### 1. 로그인 시 얼굴 등록
```python
# 사용자가 로그인 후 얼굴 등록
POST /api/v1/face/register
- user_id: 로그인한 사용자 ID
- file: 얼굴 사진
```

### 2. 결제 시 2차 인증
```python
# 결제 시 얼굴 검증으로 2차 인증
POST /api/v1/face/verify
- user_id: 결제하는 사용자 ID
- file: 실시간 얼굴 사진
```

## 🔧 설정

### 환경변수
- `HOST`: 서버 호스트 (기본값: 0.0.0.0)
- `PORT`: 서버 포트 (기본값: 8100)
- `RELOAD`: 개발모드 리로드 (기본값: false)

### .env 파일 생성
```bash
cp .env.example .env
# 필요에 따라 .env 파일 수정
```

## 📊 기술 스택

- **FastAPI**: 고성능 웹 프레임워크
- **face_recognition**: 얼굴 인식 라이브러리
- **dlib**: 머신러닝 라이브러리
- **Docker**: 컨테이너화
- **Ubuntu 20.04**: 안정적인 빌드 환경

## 🛡️ 보안 고려사항

### 현재 구현 (테스트용)
- 인메모리 저장소 사용
- 기본 CORS 설정

### 운영 환경 권장사항
- 암호화된 데이터베이스 사용
- JWT 토큰 기반 인증
- HTTPS 적용
- 얼굴 데이터 암호화 저장
- 접근 제한 및 로깅

## 🔄 데이터베이스 교체

현재 `InMemoryFaceDB` 클래스를 사용하며, 쉽게 교체 가능합니다:

```python
# 새로운 DB 클래스 구현
class PostgreSQLFaceDB:
    async def save_face_encoding(self, user_id: str, face_encoding: np.ndarray) -> bool:
        # PostgreSQL 구현
        pass
    
    async def get_face_encoding(self, user_id: str) -> Optional[np.ndarray]:
        # PostgreSQL 구현
        pass

# main.py에서 교체
face_db = PostgreSQLFaceDB()
```

## 📈 모니터링

### 헬스체크
```bash
curl http://localhost:8100/health
```

### 로그 확인
```bash
# Docker Compose 사용시
docker-compose logs -f face-recognition-api

# Docker 직접 사용시
docker logs -f <container_id>
```

## 🐛 문제 해결

### dlib 컴파일 오류
- Ubuntu 20.04 베이스 이미지 사용
- 충분한 빌드 시간 확보 (2-3분)
- 메모리 부족 시 swap 메모리 추가

### 얼굴 인식 정확도 향상
- 명확하고 밝은 얼굴 사진 사용
- 정면 촬영 권장
- 640x480 이상 해상도 권장

### 포트 충돌
- `.env` 파일에서 PORT 변경
- docker-compose.yml에서 포트 매핑 수정