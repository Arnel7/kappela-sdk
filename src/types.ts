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

export interface Participant {
  id:         string
  /** Display name — mirrors the API field `nom`. */
  nom:        string
  is_bot:     boolean
  is_premium: boolean
  avatar_url: string | null
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
  text:          string
  callback_data?: string
  url?:          string
}

export interface InlineKeyboard   { inline_keyboard:   InlineKeyboardButton[][] }
export interface ReplyKeyboard    { keyboard:          string[][] }
export interface ScrollKeyboard   { scroll_keyboard:   string[] }

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

/** File input: a Buffer/Uint8Array/Blob, or an object with metadata. */
export type FileInput =
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
  quick_reply_buttons?:  string[]
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

// ─── Edit message ────────────────────────────────────────────────────────────

export interface EditMessageParams {
  chat_id:        number
  message_id:     number
  /** New text. Required unless new_extra_data is set (inline keyboard edit). */
  new_text?:      string
  /** Replace the inline keyboard without changing the text. */
  new_extra_data?: unknown
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
  sender_nom:       string | null
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
