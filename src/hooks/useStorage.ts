import { useState, useEffect } from "react";

/**
 * Hook that syncs state with chrome.storage.local.
 * Persists across popup opens — unlike useState which resets every time.
 */
export function useStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    browser.storage.local.get(key).then((result) => {
      if (result[key] !== undefined) {
        setValue(result[key] as T);
      }
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[key]?.newValue !== undefined) {
        setValue(changes[key].newValue as T);
      }
    };

    browser.storage.local.onChanged.addListener(listener);
    return () => browser.storage.local.onChanged.removeListener(listener);
  }, [key]);

  const setStoredValue = (newValue: T) => {
    setValue(newValue);
    browser.storage.local.set({ [key]: newValue });
  };

  return [value, setStoredValue];
}
