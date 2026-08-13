import { useState, useEffect, useRef, useCallback } from "react";

const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5분

function isCacheValid(key) {
  const entry = cache[key];
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * URL을 받아 데이터를 fetch하고 로딩·에러·캐시 상태를 관리하는 커스텀 훅.
 *
 * @param {string|null} url - fetch할 URL. null이면 요청하지 않음.
 * @param {object} options
 * @param {boolean} options.cache - 캐시 사용 여부 (기본 true)
 * @param {number} options.retries - 실패 시 재시도 횟수 (기본 2)
 * @param {number} options.retryDelay - 재시도 간격 ms (기본 1000)
 */
export function useFetch(url, { cache: useCache = true, retries = 2, retryDelay = 1000 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const attemptRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!url) return;

    if (useCache && isCacheValid(url)) {
      setData(cache[url].data);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    attemptRef.current = 0;

    const attempt = async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (useCache) {
          cache[url] = { data: json, timestamp: Date.now() };
        }

        setData(json);
        setLoading(false);
      } catch (err) {
        if (err.name === "AbortError") return;

        if (attemptRef.current < retries) {
          attemptRef.current += 1;
          setTimeout(attempt, retryDelay * attemptRef.current);
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    attempt();
  }, [url, useCache, retries, retryDelay]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    if (url && useCache) delete cache[url];
    fetchData();
  }, [url, useCache, fetchData]);

  return { data, loading, error, refetch };
}
