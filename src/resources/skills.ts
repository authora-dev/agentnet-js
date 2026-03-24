import type { HttpClient } from "../http.js"
import type { Skill, PaginatedList } from "../types.js"

export class SkillsResource {
  constructor(private readonly http: HttpClient) {}

  /** List all available skills. */
  async list(): Promise<Skill[]> {
    const result = await this.http.get<Skill[] | PaginatedList<Skill>>("/registry/skills")
    return Array.isArray(result) ? result : (result as PaginatedList<Skill>).items || []
  }

  /** Get a specific skill by ID. */
  async get(skillId: string): Promise<Skill> {
    return this.http.get<Skill>(`/registry/skills/${skillId}`)
  }
}
