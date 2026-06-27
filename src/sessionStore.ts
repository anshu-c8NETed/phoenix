// Phoenix session persistence
// Saves the full recovery session to localStorage so users can return to their plan

export interface PhoenixSession {
  version: number;
  savedAt: number;
  goal: string;
  availableHours: number | "";
  requiredHours: number | "";
  progress: number;
  featuresText: string;
  result: any | null;
  survivalResult: any | null;
  rescueResult: any | null;
  simResult: any | null;
}

const SESSION_KEY = "phoenix-session-v1";
const SESSION_VERSION = 1;

export function saveSession(partial: Omit<PhoenixSession, "version" | "savedAt">): void {
  try {
    const session: PhoenixSession = {
      ...partial,
      version: SESSION_VERSION,
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function loadSession(): PhoenixSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PhoenixSession;
    if (session.version !== SESSION_VERSION) return null;
    // Expire sessions older than 48 hours
    if (Date.now() - session.savedAt > 48 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function getSessionAge(session: PhoenixSession): string {
  const ms = Date.now() - session.savedAt;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}