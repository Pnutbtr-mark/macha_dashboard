/**
 * 이미지 URL 처리 유틸리티
 *
 * 현재는 프록시 없이 원본 URL을 그대로 반환
 * Instagram CDN 이미지는 일부 로드되지 않을 수 있음
 *
 * TODO: 장기적으로 Apify 수집 시 이미지를 S3/Cloudinary에 저장하는 방식으로 전환 필요
 */

/**
 * 이미지 URL 반환 (현재는 원본 URL 그대로 반환)
 *
 * @param url - 원본 이미지 URL
 * @returns 이미지 URL
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url;
}
