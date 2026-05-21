import { useState, useEffect } from 'react'

/**
 * Debounces a value — delays updating the returned value until
 * `delay` ms have passed without the input changing.
 * Prevents excessive filtering/API calls on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
