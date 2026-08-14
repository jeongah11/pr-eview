import { useState, useEffect } from "react";

/**
 * 값이 변할 때마다 delay ms 후에 반영되는 디바운스 훅.
 * 검색창처럼 빠르게 바뀌는 입력값을 API 요청에 넘기기 전에 안정화할 때 씁니다.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
