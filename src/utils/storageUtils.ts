/**
 * Safe Storage Utilities
 * Prevents "White Screen of Death" by wrapping storage access and JSON parsing in try/catch blocks.
 */

/**
 * Safely parses a JSON string.
 * @param text The string to parse.
 * @param fallback The value to return if parsing fails.
 */
export function safeJsonParse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn('[Storage Error] Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Safely retrieves an item from localStorage.
 * @param key The storage key.
 * @param fallback The value to return if retrieval or parsing fails.
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? safeJsonParse(item, fallback) : fallback;
  } catch (error) {
    console.warn(`[Storage Error] Failed to get key "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely sets an item in localStorage.
 * @param key The storage key.
 * @param value The value to store.
 */
export function safeLocalStorageSet(key: string, value: any): void {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`[Storage Error] Failed to set key "${key}":`, error);
  }
}

/**
 * Safely removes an item from localStorage.
 * @param key The storage key.
 */
export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[Storage Error] Failed to remove key "${key}":`, error);
  }
}
