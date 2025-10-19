// 얼굴 인식 API 테스트용 스크립트
// Node.js에서 실행: node test-face-api.js

const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

const API_BASE = 'http://localhost:8000'; // 또는 http://j13c108.p.ssafy.io:8000

// 헬스체크
async function checkHealth() {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/health`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 서버 상태:', result);
          resolve(result);
        } catch (e) {
          console.log('✅ 서버 응답:', data);
          resolve({ status: 'ok' });
        }
      });
    });
    req.on('error', reject);
  });
}

// 등록된 사용자 목록 조회
async function listUsers() {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/api/v1/face/users`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('👥 등록된 사용자:', result);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  try {
    console.log('🔄 서버 상태 확인 중...');
    await checkHealth();
    
    console.log('🔄 등록된 사용자 목록 조회 중...');
    await listUsers();
    
    console.log('\n📋 테스트 완료!');
    console.log('웹 페이지에서 얼굴 등록 및 검증을 테스트해보세요:');
    console.log('- http://localhost:3000 에서 "🔐 얼굴 인식 테스트" 탭 클릭');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.log('\n확인사항:');
    console.log('1. plate_pay-AI 서버가 실행 중인지 확인 (포트 8000)');
    console.log('2. Docker 컨테이너가 실행 중인지 확인');
    console.log('3. API URL이 올바른지 확인');
  }
}

if (require.main === module) {
  main();
}