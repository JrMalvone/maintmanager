import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export function readStoredString<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[]
): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    if (allowed && !allowed.includes(raw as T)) return fallback;
    return raw as T;
  } catch {
    return fallback;
  }
}

export function writeStoredString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function readStoredStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeStoredStringArray(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function readStoredBoolean(key: string, fallback = false): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredBoolean(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function usePersistedString(
  key: string,
  fallback: string
): readonly [string, Dispatch<SetStateAction<string>>];
export function usePersistedString<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[]
): readonly [T, Dispatch<SetStateAction<T>>];
export function usePersistedString<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[]
) {
  const [value, setValue] = useState<T>(() => readStoredString(key, fallback, allowed));
  useEffect(() => {
    writeStoredString(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

export function usePersistedStringArray(key: string) {
  const [value, setValue] = useState<string[]>(() => readStoredStringArray(key));
  useEffect(() => {
    writeStoredStringArray(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

export function usePersistedBoolean(key: string, fallback = false) {
  const [value, setValue] = useState<boolean>(() => readStoredBoolean(key, fallback));
  useEffect(() => {
    writeStoredBoolean(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}