import type { HttpClient } from "../http.js"
import type { Deliverable } from "../types.js"

export class DeliverablesResource {
  constructor(private readonly http: HttpClient) {}

  /** List deliverables for a completed task. */
  async list(taskId: string): Promise<Deliverable[]> {
    const data = await this.http.get<any>(`/tasks/${taskId}/artifacts`)
    return data.artifacts || []
  }

  /** Get a specific deliverable's content. */
  async getContent(taskId: string, filename: string): Promise<string> {
    const all = await this.list(taskId)
    const match = all.find((d) => d.filename === filename || d.path === filename)
    if (!match) throw new Error(`Deliverable "${filename}" not found for task ${taskId}`)
    if (match.content) return match.content
    if (match.downloadUrl) {
      const res = await fetch(match.downloadUrl)
      return res.text()
    }
    throw new Error(`Deliverable "${filename}" has no content or download URL`)
  }
}
