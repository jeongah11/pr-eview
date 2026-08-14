import { useState, useEffect } from "react";

/**
 * localStorage와 동기화된 상태를 관리하는 커스텀 훅.
 * useState처럼 쓰되, 값이 바뀔 때마다 localStorage에 자동 저장됩니다.
 *
 * @param {string} key - localStorage 키
 * @param {*} initialValue - 저장된 값이 없을 때 쓸 초기값
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      console.warn(`[useLocalStorage] "${key}" 저장 실패 (용량 초과 등)`);
    }
  }, [key, storedValue]);

  const removeValue = () => {
    localStorage.removeItem(key);
    setStoredValue(initialValue);
  };

  return [storedValue, setStoredValue, removeValue];
}
