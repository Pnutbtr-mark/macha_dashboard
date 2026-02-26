/**
 * sessionStorage 기반 캐싱 유틸리티
 * - 탭 단위 캐싱 (새로고침 시 무효화)
 * - TTL(Time To Live) 기반 자동 만료
 * - QuotaExceededError 대응
 */

const KEY_PREFIX = 'macha_ad_';
const DEFAULT_TTL = 30 * 60 * 1000; // 30분

interface SessionCacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * sessionStorage에서 캐시 데이터 조회
 * 만료된 데이터는 자동 삭제 후 null 반환
 */
export function getSessionCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + key);
    if (!raw) return null;

    const entry: SessionCacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(KEY_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * sessionStorage에 캐시 데이터 저장
 * QuotaExceededError 발생 시 무시 (캐시 없이 동작)
 */
export function setSessionCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const entry: SessionCacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttl,
    };
    sessionStorage.setItem(KEY_PREFIX + key, JSON.stringify(entry));
  } catch {
    // QuotaExceededError 등 무시
  }
}

/**
 * 캐시 히트 시 fetch 스킵하는 래퍼
 * 캐시가 있으면 즉시 반환, 없으면 fetcher 실행 후 캐싱
 */
export async function cachedSessionFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cached = getSessionCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  setSessionCache(key, data, ttl);
  return data;
}

/**
 * sessionStorage 캐시 삭제
 * prefix가 없으면 macha_ad_ 프리픽스 전체 삭제
 */
export function clearSessionCache(prefix?: string): void {
  const targetPrefix = prefix ? prefix : KEY_PREFIX;
  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(targetPrefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => sessionStorage.removeItem(key));
}
