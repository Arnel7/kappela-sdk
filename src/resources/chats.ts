import type { HttpClient } from '../http.js'
import type { Chat, ChatsResult, GetChatsParams } from '../types.js'

export class ChatsResource {
  constructor(private http: HttpClient, private base: string) {}

  /** Return all chats accessible to this bot/user. */
  async list(params: GetChatsParams = {}): Promise<ChatsResult> {
    const qs = new URLSearchParams()
    if (params.limit  !== undefined) qs.set('limit',  String(params.limit))
    if (params.offset !== undefined) qs.set('offset', String(params.offset))
    const query = qs.toString() !== '' ? `?${qs}` : ''
    return this.http.get(`${this.base}/getChats${query}`)
  }

  /** Iterate over every chat, handling pagination automatically. */
  async *iterate(pageSize = 50): AsyncGenerator<Chat> {
    let offset = 0
    while (true) {
      const page = await this.list({ limit: pageSize, offset })
      yield* page.chats
      if (!page.has_more) break
      offset += page.chats.length
    }
  }
}
