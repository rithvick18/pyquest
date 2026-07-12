export class AIError extends Error {
  public providerId: string;
  public status?: number;
  public details?: any;

  constructor(message: string, providerId: string, status?: number, details?: any) {
    super(message);
    this.name = 'AIError';
    this.providerId = providerId;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends AIError {
  constructor(message: string, providerId: string, status?: number, details?: any) {
    super(message, providerId, status, details);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends AIError {
  constructor(message: string, providerId: string, status?: number, details?: any) {
    super(message, providerId, status, details);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends AIError {
  constructor(message: string, providerId: string, status?: number, details?: any) {
    super(message, providerId, status, details);
    this.name = 'TimeoutError';
  }
}

export class ContextLengthError extends AIError {
  constructor(message: string, providerId: string, status?: number, details?: any) {
    super(message, providerId, status, details);
    this.name = 'ContextLengthError';
  }
}

export class ValidationError extends AIError {
  constructor(message: string, providerId: string, status?: number, details?: any) {
    super(message, providerId, status, details);
    this.name = 'ValidationError';
  }
}

export class ProviderError extends AIError {
  constructor(message: string, providerId: string, status?: number, details?: any) {
    super(message, providerId, status, details);
    this.name = 'ProviderError';
  }
}
