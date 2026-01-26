/**
 * API 캐싱 유틸리티
 * - TTL(Time To Live) 기반 캐싱
 * - 중복 요청 방지 (동일 요청이 진행 중이면 해당 Promise 재사용)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// 진행 중인 요청을 추적하기 위한 Map
const pendingRequests = new Map<string, Promise<unknown>>();

// 캐시 데이터 저장소
const cache = new Map<string, CacheEntry<unknown>>();

// 캐시 설정
export const CACHE_CONFIG = {
  // 프로필 데이터 TTL (5분)
  PROFILE_TTL: 5 * 60 * 1000,
  // 광고 데이터 TTL (3분)
  AD_TTL: 3 * 60 * 1000,
  // 요청 중복 방지 윈도우 (100ms)
  DEDUP_WINDOW: 100,
};

/**
 * 캐시된 API 호출 실행
 * @param key 캐시 키
 * @param fetcher API 호출 함수
 * @param ttl 캐시 유효 시간 (ms)
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_CONFIG.PROFILE_TTL
): Promise<T> {
  // 1. 캐시 확인
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // 2. 진행 중인 동일 요청 확인 (중복 방지)
  const pending = pendingRequests.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  // 3. 새 요청 실행
  const promise = fetcher();
  pendingRequests.set(key, promise);

  try {
    const data = await promise;

    // 캐시에 저장
    cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });

    return data;
  } finally {
    // 요청 완료 후 pending에서 제거
    pendingRequests.delete(key);
  }
}

/**
 * 특정 키 패턴의 캐시 무효화
 * @param pattern 키 패턴 (부분 일치)
 */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * 특정 키의 캐시 강제 삭제
 */
export function clearCacheKey(key: string): void {
  cache.delete(key);
}

/**
 * 캐시를 무시하고 강제 새로고침
 */
export async function forceFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_CONFIG.PROFILE_TTL
): Promise<T> {
  // 기존 캐시 삭제
  cache.delete(key);

  // 새로 fetch
  return cachedFetch(key, fetcher, ttl);
}

/**
 * 캐시 키 생성 헬퍼
 */
export function createCacheKey(prefix: string, ...params: string[]): string {
  return `${prefix}:${params.join(':')}`;
}
