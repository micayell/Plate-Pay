# PlatePay 실제 적용 기술 스택 및 도입 배경 (TECH.md)

---

## 1. Backend (메인 백엔드 서버: `plate_pay-back`)

차량/회원 정보 관리, 결제 비즈니스 로직, 외부 클라이언트와의 통신을 담당하는 핵심 서버입니다. 단순 API 제공을 넘어, 다양한 데이터 처리와 검색 최적화 기술이 적용되어 있습니다.

*   **Java 17 & Spring Boot 3.5.5**
    *   **사용 기능:** 전체 메인 비즈니스 로직 구현 및 REST API 제공
*   **Spring Data JPA & QueryDSL**
    *   **사용 기능:** 관계형 데이터베이스 매핑 및 동적 쿼리 작성
    *   **도입 이유:** JPA만으로 해결하기 힘든 복잡한 검색 조건이나 통계성 쿼리(가맹점별 매출 등)를 타입 세이프(Type-Safe)하게 처리하기 위해 QueryDSL을 추가로 사용했습니다.
*   **PostgreSQL & Elasticsearch**
    *   **사용 기능:** 영구 데이터 저장 및 고속 텍스트/로그 검색
    *   **도입 이유:** 결제 데이터의 무결성을 위해 메인 DB로 PostgreSQL을 사용하며, 복잡한 검색 및 조회 성능 향상을 위해 Elasticsearch(spring-boot-starter-data-elasticsearch)가 적용되어 있습니다.
*   **Redis & Caffeine Cache**
    *   **사용 기능:** 분산 캐싱(JWT Refresh Token, 상태 관리) 및 로컬 임시 캐싱
    *   **도입 이유:** 네트워크 IO를 줄이고 즉각적인 응답이 필요한 데이터는 Caffeine으로 로컬 메모리 캐싱을 수행하며, 다중 서버간 세션 및 토큰 공유는 Redis로 처리하는 이중 캐시 전략을 구성했습니다.
*   **AWS S3 (aws-java-sdk-s3)**
    *   **사용 기능:** 안면 인식용 이미지, 차량 사진 등 대용량 미디어 파일 저장
    *   **도입 이유:** 초기 설계(Base64 문자열의 DB 저장)와 달리, 데이터베이스의 부하를 줄이고 이미지 로딩 속도를 향상시키기 위해 객체 스토리지인 S3를 도입했습니다.
*   **Spring Security & JWT / OAuth2**
    *   **사용 기능:** 세션리스 인증/인가 및 소셜 로그인 연동
*   **Firebase FCM (firebase-admin)**
    *   **사용 기능:** 입출차 알림 및 모바일 기기로의 실시간 푸시 전송
*   **Jsoup & ImgScalr**
    *   **사용 기능:** 외부 웹 데이터 크롤링(Jsoup) 및 서버단 이미지 전처리/리사이징(ImgScalr)

---

## 2. 모의 은행 서버 (`pcarchu-bank`)

실제 금융 결제를 시뮬레이션하기 위해 별도로 구축된 은행/PG(Payment Gateway) 모의 서버입니다.

*   **Spring Boot 3.5.6 & Thymeleaf**
    *   **사용 기능:** 가상 계좌 관리, 결제 승인/거절 시뮬레이션 및 웹 화면 제공
    *   **도입 이유:** 외부 뱅킹 API를 직접 연동하기 어려운 환경에서, 실제와 유사한 결제 플로우(OAuth 기반 권한 위임 및 승인)를 내부적으로 테스트하기 위해 구축했습니다.

---

## 3. 키오스크 백엔드 서버 (`plate_pay_kiosk-back`)

오직 키오스크 클라이언트만을 위한 초경량 중계 서버(BFF, Backend-for-Frontend)입니다.

*   **Spring Boot (Web Only)**
    *   **사용 기능:** 매장 내 키오스크 클라이언트와 메인 서버/AI 서버 간의 데이터 중계
    *   **도입 이유:** 키오스크에 필요한 API만 노출하여 보안을 강화하고, 무거운 DB 연결 없이(JPA 배제) 빠르고 가벼운 네트워크 라우팅 역할을 담당합니다.

---

## 4. AI / ML (차량 번호판 및 안면 인식)

프로젝트 내 AI는 번호판 인식 서버와 안면 인식 서버로 분리(MSA)되어 있습니다.

### 4.1 번호판 인식 서버 (`plate_pay-AI`)
*   **Python & FastAPI**
    *   **사용 기능:** 차량 이미지 추론용 REST API 제공
*   **YOLO v8 & EasyOCR**
    *   **사용 기능:** Bounding Box로 번호판 영역 크롭(YOLO) 후 텍스트 추출(EasyOCR)
    *   **도입 이유:** 초기 설계(PaddleOCR) 대신, Python 환경과의 통합성이 뛰어나고 다국어 지원이 훌륭한 EasyOCR로 최종 구현하여 안정성을 높였습니다.

### 4.2 안면 인식 서버 (`plate_pay-AI_face`)
*   **FastAPI & DeepFace**
    *   **사용 기능:** 사용자 얼굴의 Feature 벡터 추출 및 두 얼굴 간의 유사도(Verification) 판별
    *   **도입 이유:** 프론트엔드의 `face-api.js`만으로는 해킹이나 조작의 우려가 있어, 서버 단에서 강력한 AI 라이브러리인 DeepFace를 활용해 최종적인 사용자 인증 검증을 수행합니다.

---

## 5. Frontend - Mobile App (`plate_pay-front`)

운전자/회원이 사용하는 모바일 애플리케이션입니다. 

*   **React Native (0.81.4) & TypeScript**
    *   **사용 기능:** 크로스 플랫폼(iOS/Android) 모바일 앱 개발
*   **Zustand**
    *   **사용 기능:** 전역 상태 관리
    *   **도입 이유:** 기본 상태 관리자(Context API) 대비 보일러플레이트 코드가 훨씬 적고, 리렌더링 최적화가 탁월하여 채택했습니다.
*   **React Native Vision Camera & Skia**
    *   **사용 기능:** 얼굴 및 차량 이미지 촬영, 고성능 UI/애니메이션 렌더링
    *   **도입 이유:** 기본 카메라 모듈보다 훨씬 정밀한 설정과 빠른 속도를 제공(Vision Camera)하며, 60fps 이상의 부드러운 차트 및 그래픽(Gifted Charts, Skia)을 지원합니다.
*   **Notifee & Firebase Messaging**
    *   **사용 기능:** 고도화된 로컬/원격 푸시 알림 수신 및 화면 표시

---

## 6. Frontend - Kiosk Web (`plate_pay-kiosk`)

*   **React (19.1.1) & Tailwind CSS**
    *   **사용 기능:** 키오스크용 터치 최적화 UI 구축
    *   **도입 이유:** Tailwind CSS의 유틸리티 클래스를 활용해 빠르고 직관적으로 키오스크 인터페이스의 스타일링을 적용했습니다.
*   **face-api.js**
    *   **사용 기능:** 키오스크에 부착된 카메라로 실시간 얼굴 랜드마크를 추출하여 클라이언트 단의 1차적인 안면 추적/검출을 담당합니다.