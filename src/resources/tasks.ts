import type { HttpClient } from "../http.js"
import type {
  Task,
  TaskSubmitParams,
  TaskResult,
  TaskWaitOptions,
  TaskEvent,
  TaskEventAction,
  TaskStatus,
  BatchOptions,
  BatchResult,
  PaginatedList,
  PaginationParams,
  Deliverable,
} from "../types.js"
import { TaskError, TimeoutError, NoWorkersError, InsufficientFundsError } from "../errors.js"

const DEFAULT_POLL_INTERVAL_MS = 3_000
const DEFAULT_TIMEOUT_MS = 300_000 // 5 minutes

export class TasksResource {
  constructor(private readonly http: HttpClient) {}

  /** Submit a task for execution. Returns immediately with task ID and status. */
  async submit(params: TaskSubmitParams): Promise<Task> {
    const body: Record<string, unknown> = {
      skillId: params.skill,
      inputEncrypted: params.input,
      description: params.description,
      slaTier: params.priority,
      region: params.region,
      minTrustScore: params.minTrustScore,
      quoteId: params.quoteId,
    }
    return this.http.post<Task>("/tasks", { body })
  }

  /** Get a task by ID. */
  async get(taskId: string): Promise<Task> {
    return this.http.get<Task>(`/tasks/${taskId}`)
  }

  /** Get task status with customer events. */
  async status(taskId: string): Promise<Task & { needsAttention: boolean; customerEvents: any[] }> {
    return this.http.get(`/tasks/${taskId}/status`)
  }

  /** List tasks with optional pagination. */
  async list(params?: PaginationParams): Promise<PaginatedList<Task>> {
    return this.http.get<PaginatedList<Task>>("/tasks", { query: params as any })
  }

  /** Cancel a task. Full refund if hold was placed. */
  async cancel(taskId: string): Promise<void> {
    await this.http.post(`/tasks/${taskId}/cancel`)
  }

  /** Retry a failed/completed task. Creates a new task. */
  async retry(taskId: string): Promise<Task> {
    return this.http.post<Task>(`/tasks/${taskId}/retry`)
  }

  /** Acknowledge an action_required event (proceed). */
  async acknowledge(taskId: string): Promise<void> {
    await this.http.post(`/tasks/${taskId}/acknowledge`)
  }

  /**
   * Submit a task and wait for completion.
   * Polls the status endpoint until the task reaches a terminal state.
   */
  async submitAndWait(params: TaskSubmitParams, options?: TaskWaitOptions): Promise<TaskResult> {
    const task = await this.submit(params)
    return this.wait(task.id, options)
  }

  /**
   * Wait for a task to complete.
   * Polls every `pollIntervalMs` (default 3s) until completion or timeout.
   */
  async wait(taskId: string, options?: TaskWaitOptions): Promise<TaskResult> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const pollMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const task = await this.get(taskId)

      if (task.status === "completed") {
        return this.buildResult(task)
      }
      if (task.status === "failed" || task.status === "cancelled") {
        throw new TaskError(`Task ${taskId} ${task.status}`, taskId, task.status)
      }

      await sleep(pollMs)
    }

    throw new TimeoutError(`Task ${taskId} did not complete within ${timeoutMs}ms`)
  }

  /**
   * Stream task events in real-time.
   * Returns an async iterator that yields TaskEvent objects.
   * Handles HITL: each action_required event has .acknowledge() and .cancel() methods.
   */
  async *stream(taskId: string): AsyncGenerator<TaskEvent, void, unknown> {
    const pollMs = 2_000
    let lastEventCount = 0

    while (true) {
      const statusData = await this.status(taskId)

      // Yield new customer events
      const events = statusData.customerEvents || []
      for (let i = lastEventCount; i < events.length; i++) {
        const raw = events[i]
        yield this.buildEvent(taskId, raw)
      }
      lastEventCount = events.length

      // Check terminal states
      if (statusData.status === "completed") {
        const result = await this.buildResult(statusData as any)
        yield {
          type: "completed",
          message: "Task completed",
          timestamp: new Date().toISOString(),
          output: result.output,
          cost: result.cost,
          deliverables: result.deliverables,
          acknowledge: async () => {},
          cancel: async () => {},
        }
        return
      }

      if (statusData.status === "failed" || statusData.status === "cancelled") {
        yield {
          type: "failed",
          message: `Task ${statusData.status}`,
          timestamp: new Date().toISOString(),
          acknowledge: async () => {},
          cancel: async () => {},
        }
        return
      }

      await sleep(pollMs)
    }
  }

  /**
   * Submit multiple tasks concurrently with controlled parallelism.
   * Handles partial failures -- returns both successes and errors.
   */
  async submitBatch(tasks: TaskSubmitParams[], options?: BatchOptions): Promise<BatchResult> {
    const concurrency = options?.concurrency ?? 5
    const retryFailed = options?.retryFailed ?? false
    const startTime = Date.now()

    const results: TaskResult[] = []
    const failed: Array<{ params: TaskSubmitParams; error: Error }> = []
    let completed = 0

    // Process in chunks of `concurrency`
    for (let i = 0; i < tasks.length; i += concurrency) {
      const chunk = tasks.slice(i, i + concurrency)
      const promises = chunk.map(async (params) => {
        try {
          const result = await this.submitAndWait(params)
          results.push(result)
        } catch (err) {
          if (retryFailed) {
            try {
              const result = await this.submitAndWait(params)
              results.push(result)
              return
            } catch (retryErr) {
              failed.push({ params, error: retryErr as Error })
              return
            }
          }
          failed.push({ params, error: err as Error })
        } finally {
          completed++
          options?.onProgress?.(completed, tasks.length, results[results.length - 1] ?? null)
        }
      })
      await Promise.all(promises)
    }

    return { results, failed, totalDurationMs: Date.now() - startTime }
  }

  private buildEvent(taskId: string, raw: any): TaskEvent {
    return {
      type: raw.type === "action_required" ? "action_required" : raw.type === "error" ? "failed" : "info",
      message: raw.message || "",
      timestamp: raw.timestamp || new Date().toISOString(),
      actions: raw.actions,
      acknowledge: () => this.acknowledge(taskId),
      cancel: () => this.cancel(taskId),
    }
  }

  private async buildResult(task: Task): Promise<TaskResult> {
    // Fetch full task data with decrypted output
    const full = await this.http.get<any>(`/tasks/${task.id}`)

    // Fetch deliverables
    let deliverables: Deliverable[] = []
    try {
      const artData = await this.http.get<any>(`/tasks/${task.id}/artifacts`)
      deliverables = artData.artifacts || []
    } catch {}

    const estimateUsdc = Number(full.priceEstimateUsdc || task.priceEstimateUsdc || 0)
    const actualUsdc = Number(full.actualCostUsdc || task.actualCostUsdc || 0)

    return {
      id: task.id,
      status: (task.status as "completed" | "failed") || "completed",
      output: full.outputEncrypted || "",
      cost: {
        estimateUsdc,
        actualUsdc,
        refundedUsdc: Math.max(0, estimateUsdc * 2 - actualUsdc),
      },
      durationSeconds: full.durationSeconds || task.durationSeconds || 0,
      model: full.model,
      deliverables,
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
