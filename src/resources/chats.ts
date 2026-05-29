import type { HttpClient } from '../http.js'
import type {
  Chat, ChatsResult, GetChatsParams,
  ChatMemberInfo,
  AddChatMemberParams, AddChatMemberResult,
  BanChatMemberParams, BanChatMemberResult,
  LeaveChatParams, LeaveChatResult,
  PromoteChatMemberParams, PromoteChatMemberResult,
  GetChatAdministratorsParams, GetChatAdministratorsResult,
  GetChatMemberParams,
  ChatInviteLink,
  CreateChatInviteLinkParams,
  GetChatInviteLinksParams,
  GetChatInviteLinksResult,
  RevokeChatInviteLinkParams,
  RevokeChatInviteLinkResult,
  GetMyGroupsResult,
} from '../types.js'

export class ChatsResource {
  constructor(private http: HttpClient, private base: string) {}

  // ── Chat listing ────────────────────────────────────────────────────────────

  /**
   * Return all chats accessible to this bot/user (paginated).
   *
   * @example
   * const { chats, has_more } = await bot.chats.list({ limit: 20, offset: 0 })
   * for (const chat of chats) {
   *   console.log(chat.chat_id, chat.type, chat.title)
   * }
   */
  async list(params: GetChatsParams = {}): Promise<ChatsResult> {
    const qs = new URLSearchParams()
    if (params.limit  !== undefined) qs.set('limit',  String(params.limit))
    if (params.offset !== undefined) qs.set('offset', String(params.offset))
    const query = qs.toString() !== '' ? `?${qs}` : ''
    return this.http.get(`${this.base}/getChats${query}`)
  }

  /**
   * Iterate over every chat, handling pagination automatically.
   *
   * @example
   * for await (const chat of bot.chats.iterate()) {
   *   console.log(chat.chat_id, chat.type, chat.title)
   * }
   */
  async *iterate(pageSize = 50): AsyncGenerator<Chat> {
    let offset = 0
    while (true) {
      const page = await this.list({ limit: pageSize, offset })
      yield* page.chats
      if (!page.has_more) break
      offset += page.chats.length
    }
  }

  // ── Chat member management ──────────────────────────────────────────────────

  /**
   * Add a user to a group or channel.
   * **The bot must be admin** of the conversation.
   *
   * @example
   * await bot.chats.addMember({ chat_id: 42, user_id: 'user-uuid' })
   */
  addMember(params: AddChatMemberParams): Promise<AddChatMemberResult> {
    return this.http.post(`${this.base}/addChatMember`, params)
  }

  /**
   * Remove (kick) a user from a group or channel.
   * **The bot must be admin.** Cannot remove itself — use `leaveChat()` instead.
   *
   * @example
   * await bot.chats.banMember({ chat_id: 42, user_id: 'user-uuid' })
   */
  banMember(params: BanChatMemberParams): Promise<BanChatMemberResult> {
    return this.http.post(`${this.base}/banChatMember`, params)
  }

  /**
   * Make the bot leave a group or channel.
   *
   * @example
   * await bot.chats.leaveChat({ chat_id: 42 })
   */
  leaveChat(params: LeaveChatParams): Promise<LeaveChatResult> {
    return this.http.post(`${this.base}/leaveChat`, params)
  }

  /**
   * Promote or demote a member.
   * **The bot must be admin.**
   * - `role: "admin"` — grants admin rights
   * - `role: "member"` — revokes admin rights
   *
   * @example
   * // Promote a user to admin
   * await bot.chats.promoteMember({ chat_id: 42, user_id: 'user-uuid', role: 'admin' })
   *
   * // Demote back to member
   * await bot.chats.promoteMember({ chat_id: 42, user_id: 'user-uuid', role: 'member' })
   */
  promoteMember(params: PromoteChatMemberParams): Promise<PromoteChatMemberResult> {
    return this.http.post(`${this.base}/promoteChatMember`, params)
  }

  /**
   * Return all admins of a group or channel.
   * The bot must be a member of the conversation.
   *
   * @example
   * const { admins } = await bot.chats.getAdministrators({ chat_id: 42 })
   * for (const a of admins) {
   *   console.log(a.user_id, a.role)  // role is always "admin"
   * }
   */
  getAdministrators(params: GetChatAdministratorsParams): Promise<GetChatAdministratorsResult> {
    return this.http.post(`${this.base}/getChatAdministrators`, params)
  }

  /**
   * Return info for a specific member (user_id + role).
   * The bot must be a member of the conversation.
   * Throws `NOT_FOUND` if the user is not in the conversation.
   *
   * @example
   * const member = await bot.chats.getMember({ chat_id: 42, user_id: 'user-uuid' })
   * console.log(member.role)  // "admin" | "member"
   */
  getMember(params: GetChatMemberParams): Promise<ChatMemberInfo> {
    return this.http.post(`${this.base}/getChatMember`, params)
  }

  // ── Invite links (admin only) ───────────────────────────────────────────────

  /**
   * Create an invite link for a group or channel.
   * **The bot must be admin** of the conversation.
   *
   * @example
   * // Permanent link, unlimited uses
   * const link = await bot.chats.createInviteLink({ chat_id: 42 })
   * console.log(link.url) // "https://kappelas.com/invite/aBcD123xyz"
   *
   * // Single-use link that expires in 24 h
   * const link = await bot.chats.createInviteLink({
   *   chat_id:    42,
   *   max_uses:   1,
   *   expires_in: '24h',
   * })
   */
  createInviteLink(params: CreateChatInviteLinkParams): Promise<ChatInviteLink> {
    return this.http.post(`${this.base}/createChatInviteLink`, params)
  }

  /**
   * Shorthand to create a **single-use** invite link.
   * Equivalent to `createInviteLink({ chat_id, max_uses: 1, expires_in })`.
   * **The bot must be admin.**
   *
   * @example
   * const link = await bot.chats.createSingleUseInviteLink({ chat_id: 42 })
   */
  createSingleUseInviteLink(params: Omit<CreateChatInviteLinkParams, 'max_uses'>): Promise<ChatInviteLink> {
    return this.createInviteLink({ ...params, max_uses: 1 })
  }

  /**
   * Return all active invite links for a group or channel.
   * **The bot must be admin.**
   *
   * @example
   * const { invite_links } = await bot.chats.getInviteLinks({ chat_id: 42 })
   * for (const link of invite_links) {
   *   console.log(link.url, link.use_count, '/', link.max_uses || '∞')
   * }
   */
  getInviteLinks(params: GetChatInviteLinksParams): Promise<GetChatInviteLinksResult> {
    return this.http.post(`${this.base}/getChatInviteLinks`, params)
  }

  /**
   * Revoke an active invite link so it can no longer be used.
   * **The bot must be admin.**
   *
   * @example
   * await bot.chats.revokeInviteLink({ chat_id: 42, code: 'aBcD123xyz' })
   */
  revokeInviteLink(params: RevokeChatInviteLinkParams): Promise<RevokeChatInviteLinkResult> {
    return this.http.post(`${this.base}/revokeChatInviteLink`, params)
  }

  // ── Bot group membership ────────────────────────────────────────────────────

  /**
   * Return every group and channel the bot is a member of,
   * together with the bot's own role (`"member"` or `"admin"`) in each.
   *
   * Useful to discover which groups the bot can manage (e.g. create invite links).
   *
   * @example
   * const { groups } = await bot.chats.getMyGroups()
   *
   * const adminGroups = groups.filter(g => g.bot_role === 'admin')
   * console.log(`Admin in ${adminGroups.length} group(s)`)
   *
   * for (const g of groups) {
   *   console.log(g.chat_id, g.type, g.title, '→', g.bot_role)
   * }
   */
  getMyGroups(): Promise<GetMyGroupsResult> {
    return this.http.post(`${this.base}/getMyGroups`, {})
  }
}
