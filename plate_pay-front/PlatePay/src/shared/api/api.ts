const API_DOMAIN = 'https://j13c108.p.ssafy.io';

// OAuth 인증 시에는 '/api/v1'이 붙지 않은 도메인을 사용합니다.
export const OAUTH_BASE_URL = API_DOMAIN;

// 일반적인 API 요청 시에는 '/api/v1'을 포함한 URL을 사용합니다.
export const API_BASE_URL = `${API_DOMAIN}/api/v1`;