#!/bin/bash

# PayThru-AI Docker 빌드 및 실행 스크립트

echo "🚀 PayThru-AI Docker 빌드 시작..."

# 도커 이미지 빌드
docker build -t paythrough-ai:latest .

if [ $? -eq 0 ]; then
    echo "✅ 도커 이미지 빌드 성공!"
    
    # 기존 컨테이너 중지 및 제거
    echo "🛑 기존 컨테이너 정리..."
    docker stop paythrough-ocr 2>/dev/null || true
    docker rm paythrough-ocr 2>/dev/null || true
    
    # 컨테이너 실행
    echo "🐳 컨테이너 실행 중..."
    docker run -d \
        --name paythrough-ocr \
        -p 8000:8000 \
        --restart unless-stopped \
        paythrough-ai:latest
    
    if [ $? -eq 0 ]; then
        echo "✅ 컨테이너 실행 성공!"
        echo "📊 API 엔드포인트: http://localhost:8000"
        echo "📚 API 문서: http://localhost:8000/docs"
        echo ""
        echo "📋 컨테이너 로그 확인: docker logs -f paythrough-ocr"
        echo "🛑 컨테이너 중지: docker stop paythrough-ocr"
    else
        echo "❌ 컨테이너 실행 실패"
        exit 1
    fi
else
    echo "❌ 도커 이미지 빌드 실패"
    exit 1
fi