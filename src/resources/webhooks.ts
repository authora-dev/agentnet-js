import type { HttpClient } from "../http.js"
import type { Webhook, WebhookCreateParams, PaginatedList } from "../types.js"

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  /** Register a webhook for task events. */
  async register(params: WebhookCreateParams): Promise<Webhook> {
    return this.http.post<Webhook>("/webhooks", { body: params })
  }

  /** List registered webhooks. */
  async list(): Promise<Webhook[]> {
    const result = await this.http.get<Webhook[] | PaginatedList<Webhook>>("/webhooks")
    return Array.isArray(result) ? result : (result as PaginatedList<Webhook>).items || []
  }

  /** Delete a webhook. */
  async delete(webhookId: string): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`)
  }
}
