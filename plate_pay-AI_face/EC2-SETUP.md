# EC2 Face Recognition API 배포 가이드

## 🔧 EC2 보안 그룹 설정

### 1. AWS Console에서 보안 그룹 수정
```
- 포트 8100: HTTP (0.0.0.0/0 또는 필요한 IP만)
- 포트 22: SSH (관리용)
- 포트 80: HTTP (선택사항)
- 포트 443: HTTPS (선택사항)
```

## 🚀 배포 단계

### 1. EC2에 파일 업로드
```bash
# 로컬에서 EC2로 파일 복사
scp -i your-key.pem docker-compose.prod.yml ubuntu@your-ec2-ip:~/
scp -i your-key.pem deploy-ec2.sh ubuntu@your-ec2-ip:~/
```

### 2. EC2에서 배포 실행
```bash
# EC2에 SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 배포 스크립트 실행 권한 부여
chmod +x deploy-ec2.sh

# 배포 실행
./deploy-ec2.sh
```

### 3. Docker Hub 이미지명 수정
`docker-compose.prod.yml`과 `deploy-ec2.sh`에서 다음 부분을 실제 Docker Hub 계정으로 변경:
```yaml
image: your-dockerhub-username/face-recognition-api:latest
```

## 🌐 API 엔드포인트 (EC2 배포 후)

### 기본 정보
- **Health Check**: `http://your-ec2-ip:8100/health`
- **API Base**: `http://your-ec2-ip:8100/api/v1/face/`

### 주요 엔드포인트
```bash
# 얼굴 등록
curl -X POST "http://your-ec2-ip:8100/api/v1/face/register" \
  -F "user_id=alice" \
  -F "file=@face.jpg"

# 얼굴 검증
curl -X POST "http://your-ec2-ip:8100/api/v1/face/verify" \
  -F "user_id=alice" \
  -F "file=@verify.jpg"

# 등록된 사용자 목록
curl "http://your-ec2-ip:8100/api/v1/face/users"
```

## 🔍 문제 해결

### 로그 확인
```bash
# 컨테이너 로그 확인
docker logs face-recognition-api

# 실시간 로그 모니터링
docker logs -f face-recognition-api
```

### 컨테이너 상태 확인
```bash
# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 재시작
docker restart face-recognition-api
```

### 포트 확인
```bash
# 포트 사용 상태 확인
sudo netstat -tlnp | grep 8100
```

## 🔒 보안 고려사항

### 1. 방화벽 설정 (선택사항)
```bash
# Ubuntu UFW 사용 시
sudo ufw allow 8100
sudo ufw reload
```

### 2. SSL/TLS 설정 (권장)
- Nginx 리버스 프록시 설정
- Let's Encrypt SSL 인증서 적용
- HTTPS로 API 접근 설정

### 3. 환경변수 보안
```bash
# 환경변수 파일 생성 (.env)
echo "HOST=0.0.0.0" > .env
echo "PORT=8100" >> .env
echo "RELOAD=false" >> .env

# docker-compose에서 env_file 사용
# env_file:
#   - .env
```

## 📊 모니터링

### 리소스 사용량 확인
```bash
# Docker 컨테이너 리소스 사용량
docker stats face-recognition-api

# 시스템 리소스 확인
htop
df -h
free -h
```