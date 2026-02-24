/**
 * Bounded rotating logger.
 * Keeps last MAX_ENTRIES log entries in memory, persisted to localStorage.
 */

const STORAGE_KEY = 'app_logs';
const MAX_ENTRIES = 500;

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

class Logger {
  private entries: LogEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.entries = JSON.parse(raw);
    } catch {
      this.entries = [];
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // Storage full — trim harder
      this.entries = this.entries.slice(-100);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries)); } catch {}
    }
  }

  private add(level: LogLevel, message: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
    this.persist();

    // Also console log
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level.toUpperCase()}] ${message}`);
  }

  info(msg: string) { this.add('info', msg); }
  warn(msg: string) { this.add('warn', msg); }
  error(msg: string) { this.add('error', msg); }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Export as downloadable text */
  exportAsText(): string {
    return this.entries
      .map(e => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}`)
      .join('\n');
  }

  /** Trigger file download */
  downloadLogs() {
    const text = this.exportAsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impact-atms-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const logger = new Logger();
