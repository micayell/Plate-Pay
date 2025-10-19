#!/bin/bash

# EC2에서 실행할 배포 스크립트

echo "🚀 Face Recognition API EC2 배포 시작..."

# Docker 및 Docker Compose 설치 확인
if ! command -v docker &> /dev/null; then
    echo "📦 Docker 설치 중..."
    sudo apt-get update
    sudo apt-get install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Docker Compose 설치 중..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 기존 컨테이너 중지 및 제거
echo "🛑 기존 컨테이너 중지 중..."
docker stop face-recognition-api 2>/dev/null || true
docker rm face-recognition-api 2>/dev/null || true

# 최신 이미지 풀
echo "📥 최신 이미지 다운로드 중..."
docker pull your-dockerhub-username/face-recognition-api:latest

# Docker Compose로 실행
echo "🏃 Face Recognition API 실행 중..."
docker-compose -f docker-compose.prod.yml up -d

# 상태 확인
echo "✅ 배포 완료! 상태 확인 중..."
sleep 10
docker ps | grep face-recognition-api
curl -f http://localhost:8100/health || echo "❌ 헬스체크 실패"

echo "🎉 Face Recognition API가 포트 8100에서 실행 중입니다!"
echo "📊 API 상태: http://your-ec2-ip:8100/health"
echo "📋 사용자 목록: http://your-ec2-ip:8100/api/v1/face/users"