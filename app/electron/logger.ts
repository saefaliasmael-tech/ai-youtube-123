import fs from 'fs';
import path from 'path';

/**
 * AI YouTube - Electron Application Logger
 * Stage 0: Project Foundation
 * Writes human-readable application and error logs to logs/app.log and logs/error.log.
 */

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  return `[${timestamp}] [${level}] [App]: ${message}\n`;
}

export const appLogger = {
  info(message: string): void {
    ensureLogsDir();
    const formatted = formatMessage('INFO', message);
    process.stdout.write(formatted);
    try {
      fs.appendFileSync(path.join(LOGS_DIR, 'app.log'), formatted, { encoding: 'utf-8' });
    } catch {
      // Ignore write errors to prevent crashes
    }
  },

  warn(message: string): void {
    ensureLogsDir();
    const formatted = formatMessage('WARN', message);
    process.stdout.write(formatted);
    try {
      fs.appendFileSync(path.join(LOGS_DIR, 'app.log'), formatted, { encoding: 'utf-8' });
    } catch {
      // Ignore write errors to prevent crashes
    }
  },

  error(message: string, error?: unknown): void {
    ensureLogsDir();
    const errorDetails = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error || '');
    const fullMsg = error ? `${message} | Error: ${errorDetails}` : message;
    const formatted = formatMessage('ERROR', fullMsg);
    process.stderr.write(formatted);

    try {
      fs.appendFileSync(path.join(LOGS_DIR, 'app.log'), formatted, { encoding: 'utf-8' });
      fs.appendFileSync(path.join(LOGS_DIR, 'error.log'), formatted, { encoding: 'utf-8' });
    } catch {
      // Ignore write errors to prevent crashes
    }
  }
};
