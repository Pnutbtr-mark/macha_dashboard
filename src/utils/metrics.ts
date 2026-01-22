/**
 * 광고 성능 지표 계산 유틸리티
 */

/**
 * CTR (클릭률) 계산
 * @param clicks - 클릭 수
 * @param impressions - 노출 수
 * @returns CTR 백분율 (예: 2.5)
 */
export const calculateCtr = (clicks: number, impressions: number): number => {
  return impressions > 0 ? (clicks / impressions) * 100 : 0;
};

/**
 * CPC (클릭당 비용) 계산
 * @param spend - 지출 금액
 * @param clicks - 클릭 수
 * @returns CPC (예: 150.5)
 */
export const calculateCpc = (spend: number, clicks: number): number => {
  return clicks > 0 ? spend / clicks : 0;
};

/**
 * Frequency (빈도) 계산
 * @param impressions - 노출 수
 * @param reach - 도달 수
 * @returns Frequency (예: 2.3)
 */
export const calculateFrequency = (impressions: number, reach: number): number => {
  return reach > 0 ? impressions / reach : 1;
};

/**
 * 성장률 계산 (전일 대비)
 * @param today - 오늘 값
 * @param yesterday - 어제 값
 * @returns 성장률 백분율 (예: 15.5)
 */
export const calculateGrowth = (today: number, yesterday: number): number => {
  if (yesterday === 0) return 0;
  return parseFloat((((today - yesterday) / yesterday) * 100).toFixed(1));
};
