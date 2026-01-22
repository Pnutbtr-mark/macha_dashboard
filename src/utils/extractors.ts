/**
 * 인사이트 데이터 추출 유틸리티
 * API 응답 배열에서 특정 값을 찾거나 추출하는 함수들
 */
import type { DashMemberInsight, DashMediaInsight } from '../types/metaDash';

/**
 * 미디어 인사이트 배열에서 가장 최신 시간 반환
 * @param insights - 미디어 인사이트 배열
 * @returns 가장 최신 시간 문자열 (없으면 빈 문자열)
 */
export function getLatestInsightTime(insights: DashMediaInsight[]): string {
  if (insights.length === 0) return '';
  return insights
    .map(i => i.time)
    .sort()
    .reverse()[0];
}

/**
 * 멤버 인사이트에서 특정 지표 값 검색
 * @param insights - 멤버 인사이트 배열
 * @param metricName - 찾을 지표명 (reach, views, profile_views 등)
 * @returns 지표 값 (없으면 undefined)
 */
export function findMetricValue(
  insights: DashMemberInsight[],
  metricName: string
): number | undefined {
  return insights.find(i => i.metricName === metricName)?.value;
}

/**
 * 미디어 인사이트에서 특정 지표 값 검색
 * @param insights - 미디어 인사이트 배열
 * @param metricName - 찾을 지표명 (reach, impressions, saved 등)
 * @returns 지표 값 (없으면 undefined)
 */
export function findInsightValue(
  insights: DashMediaInsight[],
  metricName: string
): number | undefined {
  return insights.find(i => i.name === metricName)?.value;
}
