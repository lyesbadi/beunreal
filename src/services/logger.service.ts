import { Capacitor } from '@capacitor/core';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class LoggerService {
  private static instance: LoggerService;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry = this.formatMessage(level, message, data);
    
    // Garder les logs en mémoire
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // En production, on ne log que les erreurs et warnings
    if (process.env.NODE_ENV === 'production' && (level === 'debug' || level === 'info')) {
      return;
    }

    // Log dans la console avec le bon format
    const logMessage = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;
    switch (level) {
      case 'debug':
        console.debug(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
    }

    // En production, on pourrait envoyer les erreurs à un service de monitoring
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      this.sendToMonitoring(entry);
    }
  }

  private async sendToMonitoring(entry: LogEntry) {
    // TODO: Implémenter l'envoi des logs à un service de monitoring
    // Par exemple: Sentry, LogRocket, etc.
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = LoggerService.getInstance(); 