export interface ApiLogEntry {
  id: number;
  timestamp: number;
  method: string;
  url: string;
  requestBody: string | null;
  responseStatus: number | null;
  responseBody: string | null;
  durationMs: number | null;
  error: string | null;
}

const MAX_ENTRIES = 30;
const MAX_BODY_LENGTH = 2048;

let entries: ApiLogEntry[] = [];
let nextId = 1;

function truncate(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.length > MAX_BODY_LENGTH ? s.substring(0, MAX_BODY_LENGTH) + '…' : s;
}

export const apiActivityLog = {
  start(method: string, url: string, body?: string | null): ApiLogEntry {
    const entry: ApiLogEntry = {
      id: nextId++,
      timestamp: Date.now(),
      method,
      url,
      requestBody: truncate(body),
      responseStatus: null,
      responseBody: null,
      durationMs: null,
      error: null,
    };
    entries.unshift(entry);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    return entry;
  },

  end(entry: ApiLogEntry, status: number, body: string | null) {
    entry.responseStatus = status;
    entry.responseBody = truncate(body);
    entry.durationMs = Date.now() - entry.timestamp;
  },

  fail(entry: ApiLogEntry, error: string) {
    entry.error = error;
    entry.durationMs = Date.now() - entry.timestamp;
  },

  getEntries(): ApiLogEntry[] {
    return [...entries];
  },

  clear() {
    entries = [];
  },
};
