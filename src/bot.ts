import { EventEmitter } from 'events'
import { HttpClient } from './http.js'
import { WSClient } from './ws-client.js'
import { MessagesResource } from './resources/messages.js'
import { ChatsResource }    from './resources/chats.js'
import { WebhooksResource } from './resources/webhooks.js'
import { BotProfileResource } from './resources/profile.js'
import type { Message, MessageType, CallbackQuery, KappelaWireEvent } from './types.js'
import { toWsUrl } from './util.js'

export interface KappelaBotOptions {
  token:          string
  baseUrl?:       string
  maxRetries?:    number
  timeoutMs?:     number
  wsMaxRetries?:  number
}

// ─── Typed overloads for EventEmitter ────────────────────────────────────────
export declare interface KappelaBot {
  on(event: 'message',        listener: (msg: Message)                      => void | Promise<void>): this
  on(event: 'callback_query', listener: (cb: CallbackQuery)                 => void | Promise<void>): this
  on(event: 'raw',            listener: (event: KappelaWireEvent)           => void): this
  on(event: 'error',          listener: (err: Error)                        => void): this
  on(event: 'connected',      listener: ()                                  => void): this
  on(event: 'disconnected',   listener: (code: number, reason: string)      => void): this
  once(event: 'message',        listener: (msg: Message)                   => void | Promise<void>): this
  once(event: 'callback_query', listener: (cb: CallbackQuery)              => void | Promise<void>): this
  once(event: 'raw',            listener: (event: KappelaWireEvent)        => void): this
  once(event: 'error',          listener: (err: Error)                     => void): this
  once(event: 'connected',      listener: ()                               => void): this
  once(event: 'disconnected',   listener: (code: number, reason: string)   => void): this
  off(event: 'message',         listener: (msg: Message)                   => void | Promise<void>): this
  off(event: 'callback_query',  listener: (cb: CallbackQuery)              => void | Promise<void>): this
  off(event: 'raw',             listener: (event: KappelaWireEvent)        => void): this
  off(event: 'error',           listener: (err: Error)                     => void): this
  off(event: 'connected',       listener: ()                               => void): this
  off(event: 'disconnected',    listener: (code: number, reason: string)   => void): this
  emit(event: 'message',        msg:     Message):                   boolean
  emit(event: 'callback_query', cb:      CallbackQuery):             boolean
  emit(event: 'raw',            wire:    KappelaWireEvent):          boolean
  emit(event: 'error',          err:     Error):                     boolean
  emit(event: 'connected'):                                           boolean
  emit(event: 'disconnected',   code:    number, reason: string):    boolean
}

// ─── Internal helpers (not exported) ─────────────────────────────────────────

const MESSAGE_TYPES = new Set<string>([
  'text', 'image', 'video', 'audio', 'document',
  'system', 'poll', 'sticker', 'location', 'contact',
])

/** Dispatch a WS wire event (wrapped format: `{ type, data }`). @internal */
export function dispatchWireEvent(emitter: Pick<KappelaBot, 'emit'>, body: unknown): void {
  if (!body || typeof body !== 'object') return
  const event = body as KappelaWireEvent
  if (typeof event.type !== 'string') return

  emitter.emit('raw', event)

  if (event.type === 'message') {
    emitter.emit('message', (event as { type: 'message'; data: Message }).data)
  } else if (event.type === 'callback_query' || event.type === 'callback') {
    emitter.emit('callback_query', (event as { type: string; data: CallbackQuery }).data)
  }
}

/**
 * Dispatch a webhook payload (flat format from Kappela backend).
 * Normalises to typed objects before emitting, then re-emits `raw` in
 * `{ type, data }` shape so `raw` listeners get the same structure as WS. @internal
 */
export function dispatchWebhookEvent(emitter: Pick<KappelaBot, 'emit'>, body: unknown): void {
  if (!body || typeof body !== 'object') return
  const p = body as Record<string, unknown>
  const type = p['type']
  if (typeof type !== 'string') return

  if (type === 'callback') {
    const cb: CallbackQuery = {
      chat_id:         p['chat_id']         as number,
      sender_id:       p['sender_id']        as string,
      sender_nom:      (p['sender_nom']      as string | null) ?? null,
      sender_username: (p['sender_username'] as string | null) ?? null,
      callback_data:   p['callback_data']    as string,
      sent_at:         p['sent_at']          as number,
    }
    emitter.emit('raw', { type: 'callback_query', data: cb })
    emitter.emit('callback_query', cb)
  } else if (MESSAGE_TYPES.has(type)) {
    const msg: Message = {
      id:                p['message_id']  as number,
      chat_id:           p['chat_id']     as number,
      sender_id:         (p['sender_id']  as string | null) ?? null,
      type:              type             as MessageType,
      text:              (p['text']       as string | null) ?? null,
      media_id:          null,
      extra_data:        p['extra_data']  ?? null,
      status:            'sent',
      edited_at:         null,
      deleted_at:        null,
      created_at:        p['sent_at']     as number,
      reply_to_id:       null,
      reply_to_snapshot: null,
      mentions:          [],
      forwarded_from:    null,
      expires_at:        null,
    }
    emitter.emit('raw', { type: 'message', data: msg })
    emitter.emit('message', msg)
  } else {
    emitter.emit('raw', { type, data: p })
  }
}

/**
 * KappelaBot — Bot SDK.
 *
 * @example
 * ```ts
 * const bot = new KappelaBot({ token: 'YOUR_BOT_TOKEN' })
 *
 * bot.on('message', async (msg) => {
 *   await bot.messages.send({ chat_id: msg.chat_id, text: `Echo: ${msg.text}` })
 * })
 *
 * bot.on('callback_query', async (cb) => {
 *   await bot.messages.send({ chat_id: cb.chat_id, text: `Bouton cliqué: ${cb.callback_data}` })
 * })
 *
 * bot.start()
 * ```
 */
export class KappelaBot extends EventEmitter {
  /** Send and manage messages. */
  readonly messages: MessagesResource

  /** Access and iterate over chats. */
  readonly chats: ChatsResource

  /** Manage webhooks (production use). */
  readonly webhooks: WebhooksResource

  /** Read bot profile. */
  readonly profile: BotProfileResource

  private http: HttpClient
  private ws:   WSClient
  private base: string

  constructor(opts: KappelaBotOptions) {
    super()

    // Guard: EventEmitter throws if 'error' is emitted with no listener.
    // We attach a default that can be overridden.
    super.on('error', () => undefined)

    this.base = `/v1/${opts.token}`
    this.http = new HttpClient({ baseUrl: opts.baseUrl, maxRetries: opts.maxRetries, timeoutMs: opts.timeoutMs })
    this.ws   = new WSClient(
      toWsUrl(opts.baseUrl ?? 'https://api.kappelas.com', `${this.base}/ws`),
      opts.wsMaxRetries,
    )

    this.messages = new MessagesResource(this.http, this.base)
    this.chats    = new ChatsResource(this.http, this.base)
    this.webhooks = new WebhooksResource(this.http, this.base)
    this.profile  = new BotProfileResource(this.http, this.base)

    // Forward WS events to this emitter
    this.ws.on('raw',          (e)              => dispatchWireEvent(this, e))
    this.ws.on('connected',    ()               => this.emit('connected'))
    this.ws.on('disconnected', (code, reason)   => this.emit('disconnected', code, reason))
    this.ws.on('error',        (err)            => this.emit('error', err))
  }

  /**
   * Connect via WebSocket and start receiving events.
   * Your `on('message')` and `on('callback_query')` handlers will be called for every incoming event.
   */
  start(): this {
    this.ws.connect()
    return this
  }

  /** Close the WebSocket connection. */
  stop(): this {
    this.ws.disconnect()
    return this
  }

  /** `true` if the WebSocket is currently open. */
  get connected(): boolean {
    return this.ws.isConnected()
  }

  /**
   * Process a webhook payload sent by Kappela to your server.
   * Call this inside your HTTP route handler and respond 200 immediately.
   * The same `on('message')` and `on('callback_query')` handlers fire whether you use WS or webhooks.
   *
   * @example
   * ```ts
   * // Express
   * app.post('/kappela-webhook', express.json(), (req, res) => {
   *   bot.handleWebhook(req.body)
   *   res.sendStatus(200)
   * })
   * ```
   */
  handleWebhook(body: unknown): void {
    dispatchWebhookEvent(this, body)
  }
}
