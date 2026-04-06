// =====================================================
// localStorage 자동 저장 훅 (Zustand persist와 별도로
// 추가적인 저장 시점 제어가 필요할 때 사용)
// =====================================================

import { useEffect, useRef } from 'react'

/** 디바운스된 자동 저장 훅 */
export function useAutoSave<T>(
  key: string,
  value: T,
  delay = 500
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        console.warn('localStorage 저장 실패:', e)
      }
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, value, delay])
}
