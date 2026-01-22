/**
 * 공통 포맷팅 유틸리티 함수
 *
 * 모든 탭에서 일관된 숫자/통화/날짜 표시를 위해 사용합니다.
 * - K/M/억/만 축약 없이 전체 숫자를 천단위 콤마로 표시합니다.
 */

/**
 * 숫자 포맷팅 (천단위 콤마)
 * @param num - 포맷팅할 숫자
 * @returns 천단위 콤마가 적용된 문자열 (예: 1,234,567)
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

/**
 * 통화 포맷팅 (원화 기호 + 천단위 콤마)
 * @param num - 포맷팅할 금액
 * @returns 원화 기호와 천단위 콤마가 적용된 문자열 (예: ₩1,234,567)
 */
export const formatCurrency = (num: number): string => {
  return '₩' + num.toLocaleString();
};

/**
 * 날짜/시간 포맷팅 (ISO 형식 → 읽기 쉬운 형식)
 * @param dateStr - ISO 날짜 문자열 (예: 2024-01-15T14:30:00)
 * @returns 포맷팅된 날짜 문자열 (예: 2024-01-15 14:30)
 */
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  // T를 공백으로 바꾸고 초(:ss) 부분 제거
  return dateStr.replace('T', ' ').slice(0, 16);
};
