import type { HttpClient } from "../http.js"
import type { Quote, QuoteParams } from "../types.js"
import { NoWorkersError } from "../errors.js"

export class QuotesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get a price quote and worker availability before submitting a task.
   * The quote is valid for 60 seconds and includes hold amount, available workers, and ETA.
   *
   * @throws {NoWorkersError} if no workers are available and no alternatives exist
   */
  async get(params: QuoteParams): Promise<Quote> {
    const quote = await this.http.post<Quote>("/tasks/quote", {
      body: {
        skillId: params.skill,
        slaTier: params.priority,
        region: params.region,
        minTrustScore: params.minTrustScore,
      },
    })

    if (quote.availableWorkers === 0 && (!quote.alternativeRegions || quote.alternativeRegions.length === 0)) {
      throw new NoWorkersError(
        `No workers available for skill "${params.skill}"${params.region ? ` in region ${params.region}` : ""}`,
        params.region,
        quote.alternativeRegions,
      )
    }

    return quote
  }
}
