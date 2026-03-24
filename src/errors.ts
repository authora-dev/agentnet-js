export class AgentNetError extends Error {
  public readonly statusCode: number
  public readonly code?: string
  public readonly details?: unknown

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message)
    this.name = "AgentNetError"
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, AgentNetError.prototype)
  }
}

export class NetworkError extends AgentNetError {
  constructor(message: string, details?: unknown) {
    super(message, 0, "NETWORK_ERROR", details)
    this.name = "NetworkError"
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

export class TimeoutError extends AgentNetError {
  constructor(message = "Request timed out") {
    super(message, 408, "TIMEOUT")
    this.name = "TimeoutError"
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

export class AuthenticationError extends AgentNetError {
  constructor(message = "Authentication failed", details?: unknown) {
    super(message, 401, "AUTHENTICATION_ERROR", details)
    this.name = "AuthenticationError"
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

export class AuthorizationError extends AgentNetError {
  constructor(message = "Forbidden", details?: unknown) {
    super(message, 403, "AUTHORIZATION_ERROR", details)
    this.name = "AuthorizationError"
    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

export class NotFoundError extends AgentNetError {
  constructor(message = "Resource not found", details?: unknown) {
    super(message, 404, "NOT_FOUND", details)
    this.name = "NotFoundError"
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class RateLimitError extends AgentNetError {
  public readonly retryAfter?: number

  constructor(message = "Rate limit exceeded", retryAfter?: number, details?: unknown) {
    super(message, 429, "RATE_LIMIT", details)
    this.name = "RateLimitError"
    this.retryAfter = retryAfter
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

export class InsufficientFundsError extends AgentNetError {
  public readonly balanceCents: number
  public readonly requiredCents: number

  constructor(message: string, balanceCents: number, requiredCents: number, details?: unknown) {
    super(message, 402, "INSUFFICIENT_FUNDS", details)
    this.name = "InsufficientFundsError"
    this.balanceCents = balanceCents
    this.requiredCents = requiredCents
    Object.setPrototypeOf(this, InsufficientFundsError.prototype)
  }
}

export class NoWorkersError extends AgentNetError {
  public readonly region?: string
  public readonly alternativeRegions?: string[]

  constructor(message: string, region?: string, alternativeRegions?: string[], details?: unknown) {
    super(message, 503, "NO_WORKERS", details)
    this.name = "NoWorkersError"
    this.region = region
    this.alternativeRegions = alternativeRegions
    Object.setPrototypeOf(this, NoWorkersError.prototype)
  }
}

export class TaskError extends AgentNetError {
  public readonly taskId: string

  constructor(message: string, taskId: string, code?: string, details?: unknown) {
    super(message, 500, code || "TASK_ERROR", details)
    this.name = "TaskError"
    this.taskId = taskId
    Object.setPrototypeOf(this, TaskError.prototype)
  }
}
