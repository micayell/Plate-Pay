const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('🔧 setupProxy.js 로드됨!');

  // 도커 API 프록시 (번호판 좌표 감지)
  app.use(
    '/infer',
    createProxyMiddleware({
      target: 'http://localhost:9001',
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('📡 도커 API 프록시 요청:', req.url);
      }
    })
  );

  // Spring API 프록시 (번호판 스캔)
  app.use(
    '/api/v1/plates',
    createProxyMiddleware({
      target: 'http://j13c108.p.ssafy.io:8080',
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🌸 Spring API 프록시 요청:', req.url);
      }
    })
  );

  console.log('✅ 프록시 설정 완료!');
};