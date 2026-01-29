/**
 * 날짜 포맷팅 유틸리티
 */

/**
 * 로컬 시간 기준 날짜 문자열 반환
 * @param date - Date 객체
 * @returns YYYY-MM-DD 형식 문자열
 * @example
 * getLocalDateString(new Date('2024-01-22T15:30:00')) // "2024-01-22"
 */
export const getLocalDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * ISO 날짜를 M/D 형식으로 변환
 * @param isoDate - ISO 8601 형식 날짜 문자열
 * @returns "M/D" 형식 (예: "1/22")
 * @example
 * formatDateToMMDD('2024-01-22T00:00:00') // "1/22"
 * formatDateToMMDD('2024-12-05T00:00:00') // "12/5"
 */
export const formatDateToMMDD = (isoDate: string): string => {
  const date = new Date(isoDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

/**
 * 기간(period)에 따른 날짜 범위 계산
 * @param period - 기간 타입 (daily, weekly, monthly)
 * @param baseDate - 기준 날짜 (기본: 오늘)
 * @returns 현재 기간과 이전 기간의 시작/종료 날짜
 */
export interface DateRange {
  startDate: string;   // 현재 기간 시작 (YYYY-MM-DD)
  endDate: string;     // 현재 기간 종료 (YYYY-MM-DD)
  prevStartDate: string; // 이전 기간 시작
  prevEndDate: string;   // 이전 기간 종료
}

export const getDateRangeForPeriod = (
  period: 'daily' | 'weekly' | 'monthly' | 'custom',
  baseDate?: Date,
  customRange?: { start: string; end: string }
): DateRange => {
  const end = baseDate || new Date();
  const endDate = getLocalDateString(end);

  let startDate: string;
  let prevStartDate: string;
  let prevEndDate: string;

  switch (period) {
    case 'daily': {
      // 일간: 기준일 하루
      startDate = endDate;
      // 이전 기간: 전날
      const prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEndDate = getLocalDateString(prevEnd);
      prevStartDate = prevEndDate;
      break;
    }
    case 'weekly': {
      // 주간: 최근 7일
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      startDate = getLocalDateString(start);
      // 이전 기간: 그 전 7일
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEndDate = getLocalDateString(prevEnd);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 6);
      prevStartDate = getLocalDateString(prevStart);
      break;
    }
    case 'monthly': {
      // 월간: 최근 30일
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      startDate = getLocalDateString(start);
      // 이전 기간: 그 전 30일
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEndDate = getLocalDateString(prevEnd);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 29);
      prevStartDate = getLocalDateString(prevStart);
      break;
    }
    case 'custom': {
      // 사용자 지정 범위
      if (customRange) {
        startDate = customRange.start;
        // endDate는 customRange.end 사용
        const customEnd = customRange.end;
        const startD = new Date(customRange.start);
        const endD = new Date(customRange.end);
        const diffDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
        // 이전 기간: 동일한 기간만큼 이전
        const prevEnd = new Date(startD);
        prevEnd.setDate(prevEnd.getDate() - 1);
        prevEndDate = getLocalDateString(prevEnd);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - diffDays);
        prevStartDate = getLocalDateString(prevStart);
        return { startDate, endDate: customEnd, prevStartDate, prevEndDate };
      }
      // custom인데 범위가 없으면 daily로 폴백
      startDate = endDate;
      const prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEndDate = getLocalDateString(prevEnd);
      prevStartDate = prevEndDate;
      break;
    }
    default:
      startDate = endDate;
      prevEndDate = endDate;
      prevStartDate = endDate;
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
};

/**
 * 데이터에서 가장 최근 날짜 추출
 * @param dates - 날짜 문자열 배열 (YYYY-MM-DD 형식)
 * @returns 가장 최근 날짜 문자열 또는 null
 */
export const getLatestDateFromData = (dates: string[]): string | null => {
  if (dates.length === 0) return null;
  return dates.sort((a, b) => b.localeCompare(a))[0];
};
