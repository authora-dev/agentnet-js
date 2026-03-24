import type { HttpClient } from "../http.js"
import type { Balance, CreditPackage, Purchase } from "../types.js"

export class BillingResource {
  constructor(private readonly http: HttpClient) {}

  /** Get current account balance, held amount, and total charged. */
  async balance(): Promise<Balance> {
    return this.http.get<Balance>("/account/credits")
  }

  /** List available credit packages for purchase. */
  async packages(): Promise<CreditPackage[]> {
    const data = await this.http.get<any>("/account/credits")
    return data.packages || []
  }

  /**
   * Purchase a credit package.
   * In dev mode (no Stripe), credits are added immediately.
   * In production, returns a Stripe checkout URL.
   */
  async purchase(packageId: string): Promise<Purchase> {
    return this.http.post<Purchase>("/account/credits/purchase", {
      body: { packageId },
    })
  }
}
