// -- Client options --

export interface AgentNetClientOptions {
  apiKey: string
  baseUrl?: string
  timeout?: number
  headers?: Record<string, string>
}

// -- Pagination --

export interface PaginatedList<T> {
  items: T[]
  total: number
  page?: number
  limit?: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

// -- Quote --

export interface QuoteParams {
  skill: string
  region?: string
  priority?: "standard" | "priority" | "urgent"
  minTrustScore?: number
}

export interface Quote {
  estimateUsdc: number
  maxChargeUsdc: number
  holdCents: number
  currency: string
  balanceCents: number
  balanceUsd: string
  canAfford: boolean
  shortfallCents: number
  availableWorkers: number
  workers: QuoteWorker[]
  noWorkersInRegion?: string
  alternativeRegions?: string[]
  estimatedDurationSeconds: number
  queueDepth: number
  quoteId: string
  expiresAt: string
}

export interface QuoteWorker {
  id: string
  region: string
  trustScore: number
  sandboxProvider: string
  activeTasks: number
  maxConcurrent: number
}

// -- Task --

export type TaskStatus =
  | "submitted"
  | "assigned"
  | "executing"
  | "handover"
  | "completed"
  | "failed"
  | "cancelled"

export interface TaskSubmitParams {
  skill: string
  /** Code, text, or description of work. For file uploads, use uploadId from tasks.upload(). */
  input: string
  /** Repo URL to clone and process (alternative to input). */
  repoUrl?: string
  description?: string
  priority?: "standard" | "priority" | "urgent"
  region?: string
  minTrustScore?: number
  quoteId?: string
  webhook?: string
  /** Idempotency key -- prevents duplicate tasks on retry. SDK auto-generates if not provided. */
  idempotencyKey?: string
  /** Maximum cost in USD. Task is rejected if quote exceeds this. */
  maxCostUsd?: number
}

export interface TaskListParams extends PaginationParams {
  status?: TaskStatus
  skill?: string
  /** ISO date string -- only tasks created after this date */
  since?: string
  /** ISO date string -- only tasks created before this date */
  until?: string
}

export interface FileUploadResult {
  uploadId: string
  filename: string
  sizeBytes: number
  r2Key: string
}

export interface Task {
  id: string
  status: TaskStatus
  skillId: string
  workerId?: string
  priceEstimateUsdc?: number
  maxChargeUsdc?: number
  holdAmountCents?: number
  meshAttempts?: number
  tokensConsumed?: number
  durationSeconds?: number
  actualCostUsdc?: number
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface TaskResult {
  id: string
  status: "completed" | "failed"
  output: string
  cost: {
    estimateUsdc: number
    actualUsdc: number
    refundedUsdc: number
  }
  durationSeconds: number
  model?: string
  deliverables: Deliverable[]
}

export interface TaskWaitOptions {
  timeoutMs?: number
  pollIntervalMs?: number
}

// -- Task Events (streaming) --

export type TaskEventType =
  | "progress"
  | "action_required"
  | "completed"
  | "failed"
  | "info"

export interface TaskEvent {
  type: TaskEventType
  message: string
  timestamp: string
  step?: number
  totalSteps?: number
  stepName?: string
  actions?: TaskEventAction[]
  output?: string
  cost?: TaskResult["cost"]
  deliverables?: Deliverable[]

  /** Acknowledge an action_required event (proceed) */
  acknowledge: () => Promise<void>
  /** Cancel the task (abort + refund) */
  cancel: () => Promise<void>
}

export interface TaskEventAction {
  label: string
  action: string
  endpoint?: string
}

// -- Batch --

export interface BatchOptions {
  concurrency?: number
  retryFailed?: boolean
  onProgress?: (completed: number, total: number, latest: TaskResult | null) => void
}

export interface BatchResult {
  results: TaskResult[]
  failed: Array<{ params: TaskSubmitParams; error: Error }>
  totalDurationMs: number
}

// -- Skills --

export interface Skill {
  skillId: string
  name: string
  description: string
  category: string
  version: string
  steps: number
  estimatedTokens: number
  tags: string[]
}

// -- Billing --

export interface Balance {
  balanceCents: number
  balanceUsd: string
  heldCents: number
  heldUsd: string
  availableCents: number
  availableUsd: string
  totalChargedCents: number
  totalChargedUsd: string
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  priceUsd: number
  bonus?: string | null
}

export interface Purchase {
  id: string
  packageId: string
  packageName: string
  credits: number
  amountUsd: number
  status: string
  createdAt: string
  checkoutUrl?: string
}

// -- Deliverables --

export interface Deliverable {
  id?: string
  filename: string
  path: string
  mimeType: string
  sizeBytes: number
  content?: string
  downloadUrl?: string
}

// -- Webhooks --

export interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  createdAt: string
}

export interface WebhookCreateParams {
  url: string
  events: string[]
  secret?: string
}
