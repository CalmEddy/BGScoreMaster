import { AppState } from "../state/types";

const STORAGE_KEY = "universal-score-keeper-v1";

export const loadState = (): AppState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.sessions || !parsed.players || !parsed.entries) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveState = (state: AppState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const exportState = (state: AppState) => JSON.stringify(state, null, 2);

export const importState = (value: string): AppState | null => {
  try {
    const parsed = JSON.parse(value) as AppState;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.sessions || !parsed.players || !parsed.entries) return null;
    return parsed;
  } catch {
    return null;
  }
};

