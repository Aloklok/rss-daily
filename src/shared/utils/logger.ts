type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class DomainLogger {
  private formatMessage(domain: string, message: string): string {
    return `[${domain}] ${message}`;
  }

  log(domain: string, level: LogLevel, message: string, ...args: any[]) {
    const output = this.formatMessage(domain, message);
    switch (level) {
      case 'info':
        console.log(output, ...args);
        break;
      case 'warn':
        console.warn(output, ...args);
        break;
      case 'error':
        console.error(output, ...args);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(output, ...args);
        }
        break;
    }
  }

  info(domain: string, message: string, ...args: any[]) {
    this.log(domain, 'info', message, ...args);
  }

  warn(domain: string, message: string, ...args: any[]) {
    this.log(domain, 'warn', message, ...args);
  }

  error(domain: string, message: string, ...args: any[]) {
    this.log(domain, 'error', message, ...args);
  }

  debug(domain: string, message: string, ...args: any[]) {
    this.log(domain, 'debug', message, ...args);
  }
}

export const logger = new DomainLogger();
