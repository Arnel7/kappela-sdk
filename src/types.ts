// ─── API envelope ────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_FIELD'
  | 'MISSING_FIELD'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'CONFLICT'
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_PATH'
  | 'UPSTREAM_ERROR'

export interface ApiOk<T> { ok: true;  result: T }
export interface ApiErr   { ok: false; error: string; error_code: ErrorCode }
export type ApiResponse<T> = ApiOk<T> | ApiErr

// ─── Message ─────────────────────────────────────────────────────────────────

export type MessageType =
  | 'text' | 'image' | 'video' | 'audio' | 'document'
  | 'system' | 'poll' | 'sticker' | 'location' | 'contact'

export type MessageStatus = 'sent' | 'delivered' | 'read'

export interface ReplySnapshot {
  message_id: number
  sender_id:  string | null
  type:       MessageType
  text:       string | null
  media_id:   string | null
}

export interface Message {
  id:                 number
  chat_id:            number
  /**
   * Type of conversation this message belongs to.
   * - `"private"` — direct message between two users
   * - `"group"`   — group chat (multiple members)
   * - `"channel"` — broadcast channel (admin-only posting)
   *
   * Use this to adapt bot behaviour per context — e.g. reply with a quote
   * in groups, stay silent in channels, send a keyboard only in private.
   *
   * This field is always present on messages received via WebSocket or webhook.
   * It may be absent on messages fetched from the history API.
   */
  chat_type?:         ChatType
  sender_id:          string | null
  type:               MessageType
  text:               string | null
  media_id:           string | null
  extra_data:         unknown
  status:             MessageStatus
  edited_at:          number | null
  deleted_at:         number | null
  /** Unix timestamp (seconds) */
  created_at:         number
  reply_to_id:        number | null
  reply_to_snapshot:  ReplySnapshot | null
  mentions:           string[]
  forwarded_from:     unknown
  expires_at:         number | null
  sender_name?:       string | null
  sender_avatar_url?: string | null
  client_msg_id?:     string
  width?:             number | null
  height?:            number | null
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type ChatType = 'private' | 'group' | 'channel'

export type ParticipantRole = 'member' | 'admin'

export interface Participant {
  id:         string
  /** Display name — mirrors the API field `nom`. */
  nom:        string
  is_bot:     boolean
  is_premium: boolean
  avatar_url: string | null
  /** Role in the conversation. Present on groups and channels; absent on private chats. */
  role?:      ParticipantRole
}

export interface Chat {
  chat_id:                number
  id:                     number
  type:                   ChatType
  title:                  string | null
  participants:           Participant[]
  /** ISO 8601 string */
  last_message_at:        string | null
  /** ISO 8601 string */
  created_at:             string
  created_by:             string
  is_pinned:              boolean
  is_premium:             boolean
  is_public:              boolean
  only_admins_can_write:  boolean
  labels:                 string[]
  description:            string | null
  avatar_url:             string | null
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export interface BotProfile {
  user_id:     string
  username:    string
  is_bot:      true
  about:       string
  description: string
  avatar_url:  string | null
}

export type PrivacySetting = 'everyone' | 'contacts' | 'nobody'

export interface UserProfile {
  id:              string
  username:        string
  /** Display name — mirrors the API field `nom`. */
  nom:             string
  is_bot:          false
  is_premium:      boolean
  avatar_url:      string | null
  allow_group_add: PrivacySetting
  allow_calls:     PrivacySetting
}

// ─── Keyboards / markup ──────────────────────────────────────────────────────

export interface InlineKeyboardButton {
  text:           string
  callback_data?: string
  url?:           string
}

/**
 * A reply-keyboard button.
 * - Plain string: the label is both the displayed text and the callback value.
 * - Object form:  `text` is displayed; `callback_data` is sent to the webhook
 *   (falls back to `text` if omitted). Mirrors the behaviour of inline buttons.
 *
 * @example
 * // Short form (backwards-compatible)
 * keyboard: [["Option A", "Option B"], ["Annuler"]]
 *
 * // Long form — separate label and callback value
 * keyboard: [
 *   [{ text: "✅ Oui", callback_data: "confirm_yes" },
 *    { text: "❌ Non", callback_data: "confirm_no"  }],
 *   [{ text: "Annuler", callback_data: "cancel"     }],
 * ]
 */
export type ReplyKeyboardButton =
  | string
  | { text: string; callback_data?: string }

/**
 * A scroll-keyboard (horizontal chips) button.
 * Same dual format as {@link ReplyKeyboardButton}.
 *
 * @example
 * scroll_keyboard: ["📦 Commandes", "❓ Aide"]
 * // or with explicit callback data:
 * scroll_keyboard: [
 *   { text: "📦 Commandes", callback_data: "menu_orders" },
 *   { text: "❓ Aide",      callback_data: "menu_help"   },
 * ]
 */
export type ScrollKeyboardButton =
  | string
  | { text: string; callback_data?: string }

export interface InlineKeyboard   { inline_keyboard:   InlineKeyboardButton[][] }
export interface ReplyKeyboard    { keyboard:          ReplyKeyboardButton[][] }
export interface ScrollKeyboard   { scroll_keyboard:   ScrollKeyboardButton[] }

export type ReplyMarkup = InlineKeyboard | ReplyKeyboard | ScrollKeyboard

// ─── Carousel ────────────────────────────────────────────────────────────────

export interface CarouselCard {
  id:           string
  title:        string
  subtitle?:    string
  image_url?:   string
  button_text?: string
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export interface WebhookInfo {
  active:     boolean
  url:        string | null
  /** Unix timestamp (seconds) */
  created_at: number | null
}

// ─── Results ─────────────────────────────────────────────────────────────────

export interface SendResult {
  message_id: number
  created_at: number
}

export interface SendMediaResult extends SendResult {
  media_id: string
}

export interface SendCarouselResult extends SendResult {
  type: 'carousel'
}

export interface ChatsResult {
  chats:    Chat[]
  has_more: boolean
}

export interface TypingResult {
  typing: boolean
}

export interface DeleteResult {
  deleted: boolean
}

export interface WebhookSetResult {
  url:    string
  active: true
}

export interface WebhookDeleteResult {
  active: false
}

// ─── Method params ───────────────────────────────────────────────────────────

export interface SendMessageParams {
  chat_id:         number
  text:            string
  reply_markup?:   ReplyMarkup
  reply_to_id?:    number
  delete_previous?: boolean
}

/**
 * File input accepted by all `send*` media methods.
 *
 * - **`string`** — an HTTP/HTTPS URL; the SDK fetches the file automatically
 *   (mirroring Telegram's `file_id` / URL support).
 * - **`Buffer` / `Uint8Array` / `Blob`** — raw binary data.
 * - **object wrapper** — binary data with explicit `filename` and `contentType`
 *   metadata (recommended when the MIME type cannot be inferred).
 *
 * @example
 * // URL — simplest form
 * await bot.messages.sendPhoto({ chat_id, photo: 'https://example.com/banner.jpg' })
 *
 * // Buffer with metadata
 * await bot.messages.sendPhoto({ chat_id, photo: { data: buf, filename: 'photo.png', contentType: 'image/png' } })
 */
export type FileInput =
  | string
  | Buffer
  | Uint8Array
  | Blob
  | { data: Buffer | Uint8Array | Blob; filename?: string; contentType?: string }

export interface SendPhotoParams {
  chat_id:          number
  photo:            FileInput
  caption?:         string
  reply_to_id?:     number
  delete_previous?: boolean
  reply_markup?:    ReplyMarkup
}

export interface SendVideoParams {
  chat_id:          number
  video:            FileInput
  caption?:         string
  reply_to_id?:     number
  delete_previous?: boolean
  reply_markup?:    ReplyMarkup
}

export interface SendDocumentParams {
  chat_id:          number
  document:         FileInput
  caption?:         string
  reply_to_id?:     number
  delete_previous?: boolean
  reply_markup?:    ReplyMarkup
}

export interface SendAudioParams {
  chat_id:          number
  audio:            FileInput
  caption?:         string
  reply_to_id?:     number
  delete_previous?: boolean
  reply_markup?:    ReplyMarkup
}

export interface SendCarouselParams {
  chat_id:               number
  text?:                 string
  carousel:              CarouselCard[]
  /**
   * Boutons de réponse rapide sous le carousel.
   * Accepte la forme courte (string) ou longue ({ text, callback_data }).
   * Identique à {@link ScrollKeyboardButton} — le label affiché peut différer
   * de la valeur envoyée au webhook.
   *
   * @example
   * // Forme courte
   * quick_reply_buttons: ['Voir plus', 'Annuler']
   *
   * // Forme longue — label ≠ callback
   * quick_reply_buttons: [
   *   { text: '📦 Voir plus', callback_data: 'show_more' },
   *   { text: '✖ Annuler',    callback_data: 'cancel'    },
   * ]
   */
  quick_reply_buttons?:  ScrollKeyboardButton[]
  /** Quote un message existant — affiche la bannière de citation dans les groupes. */
  reply_to_id?:          number
  /** Supprime le dernier message du bot dans ce chat avant d'envoyer. */
  delete_previous?:      boolean
}

export interface SendTypingParams {
  chat_id:    number
  is_typing?: boolean
}

export interface DeleteMessageParams {
  chat_id:    number
  message_id: number
}

export interface SetWebhookParams {
  url:     string
  secret?: string
}

export interface GetChatsParams {
  limit?:  number
  offset?: number
}

// ─── Chat member management ──────────────────────────────────────────────────

/** Minimal member info returned by `getChatMember` and `getChatAdministrators`. */
export interface ChatMemberInfo {
  /** UUID of the member. */
  user_id: string
  /** Role in the conversation. */
  role:    ParticipantRole
}

export interface AddChatMemberParams {
  chat_id: number
  /** UUID of the user to add. **Bot must be admin.** */
  user_id: string
}

export interface AddChatMemberResult {
  description: string
}

export interface BanChatMemberParams {
  chat_id: number
  /**
   * UUID of the user to remove.
   * Cannot be the bot itself — use `leaveChat` instead.
   * **Bot must be admin.**
   */
  user_id: string
}

export interface BanChatMemberResult {
  description: string
}

export interface LeaveChatParams {
  chat_id: number
}

export interface LeaveChatResult {
  description: string
}

export interface PromoteChatMemberParams {
  chat_id: number
  /** UUID of the member whose role to change. **Bot must be admin.** */
  user_id: string
  /** New role: `"admin"` promotes, `"member"` demotes. */
  role:    ParticipantRole
}

export interface PromoteChatMemberResult {
  user_id: string
  role:    ParticipantRole
}

export interface GetChatAdministratorsParams {
  chat_id: number
}

export interface GetChatAdministratorsResult {
  /** All members whose role is `"admin"` (includes the bot if it is admin). */
  admins: ChatMemberInfo[]
}

export interface GetChatMemberParams {
  chat_id: number
  /** UUID of the member to look up. */
  user_id: string
}

// ─── Invite links ────────────────────────────────────────────────────────────

/** An active invite link for a group or channel. */
export interface ChatInviteLink {
  /** Short code used in the URL (e.g. `"aBcD123xyz"`). */
  code:            string
  /** Full invite URL (e.g. `"https://kappelas.com/invite/aBcD123xyz"`). */
  url:             string
  /** Number of allowed uses. `0` = unlimited. */
  max_uses:        number
  /** Current number of times this link has been used. */
  use_count:       number
  /** Expiry as Unix timestamp (seconds), or `null` if permanent. */
  expires_at:      number | null
  /** Creation time as Unix timestamp (seconds). */
  created_at:      number
}

export interface CreateChatInviteLinkParams {
  chat_id:     number
  /** `0` = unlimited (default), `1`+ = capped. */
  max_uses?:   number
  /** `"1h"` | `"24h"` | `"7d"` | `"30d"` | `"never"` (default). */
  expires_in?: '1h' | '24h' | '7d' | '30d' | 'never'
}

export interface GetChatInviteLinksParams {
  chat_id: number
}

export interface GetChatInviteLinksResult {
  invite_links: ChatInviteLink[]
}

export interface RevokeChatInviteLinkParams {
  chat_id: number
  /** The `code` field of the link to revoke. */
  code:    string
}

export interface RevokeChatInviteLinkResult {
  revoked: boolean
  code:    string
}

// ─── getMyGroups ─────────────────────────────────────────────────────────────

/**
 * A group or channel the bot is a member of, enriched with the bot's own role.
 */
export interface BotGroupEntry {
  /** Conversation ID — use this as `chat_id` in all API calls. */
  chat_id:           number
  /** `"group"` or `"channel"`. Never `"private"`. */
  type:              Exclude<ChatType, 'private'>
  /** Group or channel title. */
  title:             string | null
  /** Total number of participants (including the bot). */
  participant_count: number
  /** The bot's role in this conversation. */
  bot_role:          ParticipantRole
}

export interface GetMyGroupsResult {
  groups: BotGroupEntry[]
}

// ─── Edit message ────────────────────────────────────────────────────────────

export interface EditMessageParams {
  chat_id:        number
  message_id:     number
  /** New text. Required unless new_extra_data is set (inline keyboard edit). */
  new_text?:      string
  /** Replace the inline keyboard without changing the text. */
  new_extra_data?: ReplyMarkup | null
}

export interface EditMessageResult {
  edited:     boolean
  message_id: number
}

// ─── Callback query ──────────────────────────────────────────────────────────

/** Fired when a user clicks an inline button. */
export interface CallbackQuery {
  chat_id:          number
  /** UUID of the user who clicked the button. */
  sender_id:        string
  /** Display name of the user who clicked (e.g. "Arnel LAWSON"). Null if unresolvable. */
  sender_name:      string | null
  /** Username of the user who clicked (e.g. "arnell"). Null if unresolvable. */
  sender_username:  string | null
  /** Value of `callback_data` on the button that was clicked. */
  callback_data:    string
  /** Unix timestamp (seconds). */
  sent_at:          number
}

// ─── WS events ───────────────────────────────────────────────────────────────

export interface WSMessageEvent       { type: 'message';        data: Message }
export interface WSCallbackQueryEvent { type: 'callback_query'; data: CallbackQuery }
export type KappelaWireEvent =
  | WSMessageEvent
  | WSCallbackQueryEvent
  | { type: string; data: unknown }
