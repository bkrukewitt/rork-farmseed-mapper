let logs: string[] = [];
let advancedLoggingEnabled = false;

const MAX_LOGS = 200;

export function setAdvancedLoggingEnabled(enabled: boolean): void {
  advancedLoggingEnabled = enabled;
}

export function isAdvancedLoggingEnabled(): boolean {
  return advancedLoggingEnabled;
}

export function logDebug(tag: string, message: string): void {
  const line = `${new Date().toISOString()} [${tag}] ${message}`;
  logs.push(line);
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }
}

export function logUserAction(message: string): void {
  if (!advancedLoggingEnabled) return;
  const line = `${new Date().toISOString()} [user] ${message}`;
  logs.push(line);
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }
}

export function getLogs(): string {
  return logs.slice().reverse().join('\n');
}

export function clearLogs(): void {
  logs = [];
}

