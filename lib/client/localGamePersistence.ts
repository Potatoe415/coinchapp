/** Persists an in-progress local (solo, offline) game to localStorage so a page
 *  reload or app restart resumes it instead of losing it. Shared by Coinche's
 *  and Bouilla's local-game hooks. */

export const LOCAL_COINCHE_STORAGE_KEY = "coinchapp:local-coinche:v1";
export const LOCAL_BOUILLA_STORAGE_KEY = "coinchapp:local-bouilla:v1";

type PersistablePhaseState = { phase: string };

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns the saved state for `key`, or null if there is nothing to resume
 *  (never saved, corrupt, or the saved match already finished). */
export function loadPersistedGame<T extends PersistablePhaseState>(key: string): T | null {
  const raw = readStorage(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed.phase === "finished" ? null : parsed;
  } catch {
    return null;
  }
}

/** Saves `state`, or clears storage once the match is finished (nothing left
 *  to resume). Silently no-ops if storage is unavailable (e.g. private mode). */
export function savePersistedGame<T extends PersistablePhaseState>(key: string, state: T): void {
  if (typeof window === "undefined") return;
  try {
    if (state.phase === "finished") {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  } catch {
    // Storage unavailable - the game still works, just without persistence.
  }
}

/** Clears any saved match for `key`. Call before deliberately starting a new
 *  game so it doesn't get resumed by mistake. */
export function clearPersistedGame(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}
