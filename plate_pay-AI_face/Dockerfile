# DeepFace 베이스 이미지 사용 (얼굴 인식이 미리 설치됨)
FROM serengil/deepface:latest

# 환경변수 설정
ENV PYTHONUNBUFFERED=1

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 최신화
RUN apt-get update && apt-get install -y curl wget && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# pip 업그레이드
RUN pip install --upgrade pip

# requirements.txt 복사
COPY requirements.txt .

# FastAPI 및 필요한 패키지 설치
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    python-multipart==0.0.6 \
    pillow==9.5.0

# 설치 확인
RUN python -c "import deepface; print('DeepFace installed successfully')"
RUN python -c "from deepface import DeepFace; print('DeepFace import successful')"

# 애플리케이션 코드 복사
COPY main.py .
COPY run.py .

# 포트 8100 노출
EXPOSE 8100

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=30s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8100/health || exit 1

# 애플리케이션 실행
CMD ["python", "run.py"]