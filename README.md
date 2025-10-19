# PlatePay 🚗💳

PlatePay는 차량 번호판과 얼굴 인식을 기반으로 한 차량용 간편결제 시스템입니다.
운전자는 차량 번호 또는 등록된 얼굴을 통해 주차장, 매장 키오스크 등에서 비대면·간편하게 결제할 수 있습니다.

## 주요 기능

### 회원/인증
- OAuth2 + JWT 기반 회원 인증
- 회원 프로필/은행 계좌 등록
- 얼굴 인식 이미지 등록 (Base64 저장)

### 차량/주차 관리
- 차량 번호판을 통한 사용자 식별
- 주차장 정보 조회 및 결제 연동
- PlatePay API를 통한 차량-회원 매핑

### 결제/주문
- 키오스크 → PlatePay API 연동
- 차량번호/얼굴 인증 후 결제 승인
- 주문 내역(OrderHistory) 저장 및 조회
- 가맹점별 매출 데이터 관리

### 키오스크 모듈
- React/웹 기반 UI
- 음식/상품 선택 → PlatePay API 호출
- 얼굴 인식 비교(등록된 이미지 vs 실시간 촬영)
- 결제 완료 후 주문 내역 화면 표시

### AI 번호판/얼굴 인식
- YOLO 기반 번호판 감지 및 OCR 인식
- FastAPI 서버로 AI 모델 서빙
- 얼굴 인식 API를 통한 사용자 인증

### 실시간 알림 & 상태 관리
- Firebase FCM
- 입차, 출차, 키오스크 주문 시 실시간 알림

## 기술 스택

### Backend
| 구분 | 기술 |
|------|------|
| **언어/런타임** | Java 17, Gradle |
| **프레임워크** | Spring Boot 3.5.5 (Web, Security, Data JPA, OAuth2 Client) |
| **데이터베이스** | PostgreSQL, Redis |
| **인증/보안** | JWT, Spring Security |
| **메시징** | Firebase FCM |
| **문서화** | Swagger (SpringDoc OpenAPI) |

### Frontend (Mobile App)
| 구분 | 기술 |
|------|------|
| **언어/프레임워크** | React Native 0.81.1 |
| **타입스크립트** | TypeScript 5.8.3 |
| **네비게이션** | React Navigation 7.x |
| **아이콘** | React Native Vector Icons |
| **상태 관리** | React Native 내장 상태 관리 |

### Frontend (Kiosk)
| 구분 | 기술 |
|------|------|
| **언어/프레임워크** | React (웹 기반) |
| **얼굴 인식** | face-api.js |
| **빌드 도구** | Webpack |

### AI/ML
| 구분 | 기술 |
|------|------|
| **언어** | Python |
| **프레임워크** | FastAPI |
| **AI 모델** | YOLO v8 (번호판 감지), PaddleOCR (OCR) |
| **이미지 처리** | OpenCV, PIL |

### 개발 환경 및 협업 도구
| 구분 | 기술 |
|------|------|
| **배포 환경** | Docker, Docker Compose |
| **버전 관리** | Git + GitLab |
| **프로젝트 관리** | SSAFY |

## 주요 모듈 구조

```
PlatePay/
├── platepay-back/              # 메인 Spring Boot 백엔드
│   ├── src/main/java/com/pcarchu/  # 비즈니스 로직
│   ├── build.gradle            # Gradle 의존성 설정
│   └── Dockerfile              # Backend 컨테이너 설정
├── plate_pay-frontend/         # React Native 모바일 앱
│   └── PlatePay/
│       ├── package.json        # RN 의존성 설정
│       ├── android/            # Android 빌드 설정
│       └── src/                # RN 소스코드
├── plate_pay-kiosk/            # React 웹 키오스크
│   ├── src/                    # 키오스크 UI 소스
│   └── build/                  # 빌드된 정적 파일
├── plate_pay-AI/               # AI 번호판 인식 서버
│   ├── main.py                 # FastAPI 서버
│   ├── requirements.txt        # Python 의존성
│   ├── yolov8n.pt             # YOLO 모델 가중치
│   └── Dockerfile              # AI 서버 컨테이너
└── plate_pay-AI_face/          # 얼굴 인식 관련 로그
```

## 실행 방법

### 사전 요구사항
- Java 17 (JDK)
- Node.js
- Python 3.9+
- Docker, Docker Compose

### 1. Backend (Spring Boot)
```bash
cd platepay-back
./gradlew build
./gradlew bootRun
```

### 2. AI 서버 (FastAPI)
```bash
cd plate_pay-AI
pip install -r requirements.txt
python main.py
# 또는
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Mobile App (React Native)
```bash
cd plate_pay-frontend/PlatePay
npm install
npm run android  # Android
npm run ios      # iOS
```

### 4. Kiosk (Web)
```bash
cd plate_pay-kiosk
npm install
npm start
```

### 5. Docker Compose로 전체 실행
```bash
# AI 서버
cd plate_pay-AI
docker-compose up --build

# 모바일 앱
cd plate_pay-frontend/PlatePay
docker-compose up --build
```

## 테스트 방법

### API 문서 (Swagger)
- **Backend API**: `https://j13c108.p.ssafy.io/swagger-ui/index.html`
- **AI OCR API**: `http://j13c108.p.ssafy.io:/8000/docs`

### 주요 API 예시
```bash
# 1. 얼굴 등록
POST /api/v1/members/face-upload
Content-Type: multipart/form-data

# 2. 키오스크 얼굴 비교/결제
POST /api/v1/kiosk/{plateNum}/compare

# 3. 주문 내역 조회
GET /api/v1/order-histories/{plateNum}

# 4. 번호판 OCR
POST /ocr/license-plate
Content-Type: multipart/form-data
```

## 시스템 아키텍처
![](https://velog.velcdn.com/images/brylimo/post/83031da6-808c-459f-86bc-40822d7fefe9/image.png)

## 특징

- **차량 번호/얼굴인식 결제**를 융합한 새로운 결제 경험
- **YOLO + OCR** 기반의 정확한 번호판 인식
- **Spring Security + JWT** 기반 보안 인증
- **React Native + Web** 멀티플랫폼 지원

## 팀 정보

**SSAFY 13기 광주 1반 C108**

**Project**: Plate Pay

**기간**: 2025.08 ~ 2025.09

## 라이센스

이 프로젝트는 SSAFY 교육용 프로젝트입니다.