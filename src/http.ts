import {
  AgentNetError,
  AuthenticationError,
  AuthorizationError,
  InsufficientFundsError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
} from "./errors.js"

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
}

export class HttpClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeout: number
  private readonly defaultHeaders: Record<string, string>

  constructor(options: {
    baseUrl: string
    apiKey: string
    timeout: number
    headers?: Record<string, string>
  }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.apiKey = options.apiKey
    this.timeout = options.timeout
    this.defaultHeaders = options.headers ?? {}
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, options)
  }

  async post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, options)
  }

  async put<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, options)
  }

  async patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, options)
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, options)
  }

  /** Raw fetch for streaming (SSE) -- returns the Response directly */
  async stream(path: string, options?: RequestOptions): Promise<Response> {
    const url = this.buildUrl(path, options?.query)
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.defaultHeaders,
      ...options?.headers,
    }
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      this.throwForStatus(res.status, body, "GET", path)
    }
    return res
  }

  private async request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query)
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.defaultHeaders,
      ...options.headers,
    }

    const init: RequestInit = { method, headers }

    if (options.body !== undefined && method !== "GET") {
      headers["Content-Type"] = "application/json"
      init.body = JSON.stringify(options.body)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)
    init.signal = controller.signal

    let response: Response
    try {
      response = await fetch(url, init)
    } catch (err: unknown) {
      clearTimeout(timer)
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new TimeoutError(`Request to ${method} ${path} timed out after ${this.timeout}ms`)
      }
      throw new NetworkError(`Request to ${method} ${path} failed: ${err instanceof Error ? err.message : "Unknown"}`, err)
    } finally {
      clearTimeout(timer)
    }

    let body: unknown
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      body = await response.json()
    } else {
      const text = await response.text()
      body = text.length > 0 ? text : undefined
    }

    if (!response.ok) {
      this.throwForStatus(response.status, body, method, path)
    }

    return this.unwrapResponse<T>(body)
  }

  private unwrapResponse<T>(body: unknown): T {
    if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
      const obj = body as Record<string, unknown>
      const data = obj["data"]
      const pagination = (obj["pagination"] ?? obj["meta"]) as Record<string, unknown> | undefined

      if (Array.isArray(data) && pagination) {
        return { items: data, total: pagination["total"] ?? data.length, page: pagination["page"], limit: pagination["limit"] } as T
      }
      if (Array.isArray(data)) {
        return { items: data } as T
      }
      return data as T
    }
    return body as T
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
      }
    }
    return url.toString()
  }

  private throwForStatus(status: number, body: unknown, method: string, path: string): never {
    const parsed = this.parseErrorBody(body)
    const prefix = `${method} ${path}`

    switch (status) {
      case 401:
        throw new AuthenticationError(parsed.message ?? `${prefix}: Authentication failed`, parsed.details)
      case 402:
        throw new InsufficientFundsError(
          parsed.message ?? `${prefix}: Insufficient funds`,
          (parsed.details as any)?.balanceCents ?? 0,
          (parsed.details as any)?.holdAmountCents ?? 0,
          parsed.details,
        )
      case 403:
        throw new AuthorizationError(parsed.message ?? `${prefix}: Forbidden`, parsed.details)
      case 404:
        throw new NotFoundError(parsed.message ?? `${prefix}: Not found`, parsed.details)
      case 429:
        throw new RateLimitError(parsed.message ?? `${prefix}: Rate limit exceeded`, parsed.retryAfter, parsed.details)
      default:
        throw new AgentNetError(parsed.message ?? `${prefix}: Request failed with status ${status}`, status, parsed.code, parsed.details)
    }
  }

  private parseErrorBody(body: unknown): { message?: string; code?: string; details?: unknown; retryAfter?: number } {
    if (body && typeof body === "object") {
      let obj = body as Record<string, unknown>
      if (obj["error"] && typeof obj["error"] === "object") obj = obj["error"] as Record<string, unknown>
      return {
        message: typeof obj["message"] === "string" ? obj["message"] : undefined,
        code: typeof obj["code"] === "string" ? obj["code"] : undefined,
        details: obj["details"] ?? obj,
        retryAfter: typeof obj["retryAfter"] === "number" ? obj["retryAfter"] : undefined,
      }
    }
    return typeof body === "string" ? { message: body } : {}
  }
}
