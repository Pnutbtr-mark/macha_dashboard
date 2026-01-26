/**
 * 이미지 URL 처리 유틸리티
 *
 * S3/CloudFront 상대 경로를 완전한 URL로 변환
 */

// CloudFront 베이스 URL
const CLOUDFRONT_BASE_URL = 'https://d2xwq3y8g7dpg3.cloudfront.net';

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

  return url;
}
