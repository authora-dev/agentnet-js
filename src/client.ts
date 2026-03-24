import { HttpClient } from "./http.js"
import type { AgentNetClientOptions } from "./types.js"
import { TasksResource } from "./resources/tasks.js"
import { QuotesResource } from "./resources/quotes.js"
import { SkillsResource } from "./resources/skills.js"
import { BillingResource } from "./resources/billing.js"
import { DeliverablesResource } from "./resources/deliverables.js"
import { WebhooksResource } from "./resources/webhooks.js"

const DEFAULT_BASE_URL = "https://net.authora.dev/api/v1"
const DEFAULT_TIMEOUT = 30_000

/**
 * AgentNet client for submitting tasks, managing billing, and streaming results.
 *
 * @example
 * ```typescript
 * import { AgentNetClient } from '@authora/agentnet-sdk';
 *
 * const agentnet = new AgentNetClient({ apiKey: 'ank_live_...' });
 *
 * const result = await agentnet.tasks.submitAndWait({
 *   skill: 'code-review',
 *   input: 'function auth(u,p) { return db.query("SELECT * WHERE user="+u); }',
 * });
 * console.log(result.output);
 * ```
 */
export class AgentNetClient {
  /** Submit, wait, stream, cancel, retry tasks. */
  public readonly tasks: TasksResource
  /** Get price quotes and worker availability before submitting. */
  public readonly quotes: QuotesResource
  /** List available skills. */
  public readonly skills: SkillsResource
  /** Check balance, purchase credits. */
  public readonly billing: BillingResource
  /** Get deliverables from completed tasks. */
  public readonly deliverables: DeliverablesResource
  /** Register webhook endpoints for task event callbacks. */
  public readonly webhooks: WebhooksResource

  constructor(options: AgentNetClientOptions) {
    if (!options.apiKey) throw new Error("AgentNetClient requires an apiKey")

    const http = new HttpClient({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      apiKey: options.apiKey,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      headers: options.headers,
    })

    this.tasks = new TasksResource(http)
    this.quotes = new QuotesResource(http)
    this.skills = new SkillsResource(http)
    this.billing = new BillingResource(http)
    this.deliverables = new DeliverablesResource(http)
    this.webhooks = new WebhooksResource(http)
  }
}
