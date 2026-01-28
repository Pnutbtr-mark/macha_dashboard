/**
 * 이미지 URL 처리 유틸리티
 *
 * S3/CloudFront 상대 경로를 완전한 URL로 변환
 * Instagram/Facebook CDN URL은 서버 프록시를 통해 요청
 */

// CloudFront 베이스 URL
const CLOUDFRONT_BASE_URL = 'https://d2xwq3y8g7dpg3.cloudfront.net';

// API 베이스 URL (프로덕션에서는 상대 경로, 로컬에서는 localhost:3001)
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

/**
 * 이미지 URL을 적절한 형식으로 변환
 *
 * @param url - 원본 이미지 URL
 * @returns 변환된 이미지 URL
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  // S3/CloudFront 상대 경로인 경우 베이스 URL 추가
  if (url.startsWith('/matcha/')) {
    return `${CLOUDFRONT_BASE_URL}${url}`;
  }

  // Instagram/Facebook CDN → 서버 프록시를 통해 요청
  if (url.includes('instagram') || url.includes('fbcdn') || url.includes('cdninstagram')) {
    return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
}

/**
 * Instagram CDN URL인지 확인
 */
export function isInstagramCdnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('instagram') || url.includes('fbcdn') || url.includes('cdninstagram');
}

/**
 * Instagram 프로필 이미지 API URL 생성
 * @param username - Instagram 사용자명
 */
export function getInstagramProfileImageUrl(username: string | null | undefined): string {
  if (!username) return '';
  return `${API_BASE}/api/instagram-profile?username=${encodeURIComponent(username.trim())}`;
}

/**
 * Instagram 게시물 이미지 API URL 생성
 * @param shortCode - Instagram 게시물 shortCode
 */
export function getInstagramPostImageUrl(shortCode: string | null | undefined): string {
  if (!shortCode) return '';
  return `${API_BASE}/api/instagram-post?shortCode=${encodeURIComponent(shortCode.trim())}`;
}
