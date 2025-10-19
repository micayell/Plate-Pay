# Python 3.9 슬림 이미지 사용 (더 빠른 시작)
FROM python:3.9-slim

# 작업 디렉토리 설정
WORKDIR /app

# OpenCV와 AI 모델에 필요한 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgomp1 \
    libgl1-mesa-dev \
    libglu1-mesa-dev \
    wget \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    || (apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgomp1 \
    wget \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*)

# requirements.txt 복사 및 의존성 설치 (단계별 최적화)
COPY requirements.txt .

# pip 업그레이드 및 NumPy 강제 고정
RUN pip install --upgrade pip
RUN pip install --no-cache-dir "numpy==1.24.3"

# NumPy 2.x 방지를 위한 추가 제약
RUN pip install --no-cache-dir "numpy<2.0"

# 기본 패키지들 먼저 설치 (PyTorch 제외)
RUN pip install --no-cache-dir -r requirements.txt

# PyTorch CPU 버전 별도 설치 (NumPy 1.24 호환)
RUN pip install --no-cache-dir torch==2.0.1+cpu torchvision==0.15.2+cpu --index-url https://download.pytorch.org/whl/cpu

# 설치 후 NumPy 버전 확인
RUN python -c "import numpy; print(f'NumPy version: {numpy.__version__}')"
RUN python -c "import torch; print(f'PyTorch version: {torch.__version__}')"

# NumPy 호환성을 위한 환경변수 설정
ENV NUMPY_EXPERIMENTAL_ARRAY_FUNCTION=0
ENV NPY_DISABLE_OPTIMIZATION=1

# 애플리케이션 코드 복사
COPY main.py .
COPY run.py .

# 포트 8000 노출
EXPOSE 8000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 애플리케이션 실행
CMD ["python", "run.py"]