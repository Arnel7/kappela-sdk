import { EventEmitter } from 'events'
import { HttpClient } from './http.js'
import { WSClient } from './ws-client.js'
import { MessagesResource } from './resources/messages.js'
import { ChatsResource }    from './resources/chats.js'
import { WebhooksResource } from './resources/webhooks.js'
import { UserProfileResource } from './resources/profile.js'
import type { Message, CallbackQuery, KappelaWireEvent } from './types.js'
import { dispatchWireEvent } from './bot.js'
import { toWsUrl } from './util.js'

export interface KappelaUserOptions {
  apiKey:         string
  baseUrl?:       string
  maxRetries?:    number
  timeoutMs?:     number
  wsMaxRetries?:  number
}

// ─── Typed overloads ─────────────────────────────────────────────────────────
export declare interface KappelaUser {
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

/**
 * KappelaUser — Personal automation SDK.
 * Authenticate with a personal API key (`sk_...`) to send messages
 * and receive events as yourself.
 *
 * @example
 * ```ts
 * const me = new KappelaUser({ apiKey: 'sk_...' })
 *
 * me.on('message', (msg) => {
 *   console.log('New message from', msg.sender_name, ':', msg.text)
 * })
 *
 * me.start()
 * ```
 */
export class KappelaUser extends EventEmitter {
  /** Send and manage messages. */
  readonly messages: MessagesResource

  /** Access and iterate over chats. */
  readonly chats: ChatsResource

  /**
   * Manage webhooks.
   *
   * @remarks
   * In development use `start()` (WebSocket).
   * **In production, prefer setting a webhook** — it is more reliable and
   * does not require a persistent connection:
   * ```ts
   * await me.webhooks.set({ url: 'https://your-server.com/kappela-webhook' })
   * ```
   */
  readonly webhooks: WebhooksResource

  /** Read your profile. */
  readonly profile: UserProfileResource

  private http: HttpClient
  private ws:   WSClient
  private base  = '/v1/me'

  constructor(opts: KappelaUserOptions) {
    super()

    // Guard: EventEmitter throws if 'error' is emitted with no listener.
    // We attach a default that can be overridden.
    super.on('error', () => undefined)

    const baseUrl = opts.baseUrl ?? 'https://api.kappelas.com'

    this.http = new HttpClient({ baseUrl, maxRetries: opts.maxRetries, timeoutMs: opts.timeoutMs })
    this.http.setAuth({ 'X-Api-Key': opts.apiKey })

    const wsPath = `${this.base}/ws?api_key=${opts.apiKey}`
    this.ws = new WSClient(toWsUrl(baseUrl, wsPath), opts.wsMaxRetries)

    this.messages = new MessagesResource(this.http, this.base)
    this.chats    = new ChatsResource(this.http, this.base)
    this.webhooks = new WebhooksResource(this.http, this.base)
    this.profile  = new UserProfileResource(this.http, this.base)

    // Forward WS events to this emitter
    this.ws.on('raw',          (e)              => dispatchWireEvent(this, e))
    this.ws.on('connected',    ()               => this.emit('connected'))
    this.ws.on('disconnected', (code, reason)   => this.emit('disconnected', code, reason))
    this.ws.on('error',        (err)            => this.emit('error', err))
  }

  /**
   * Connect via WebSocket and start receiving events.
   *
   * @remarks
   * Use this **only in development / local scripts**.
   * In production, configure a webhook instead:
   * ```ts
   * await me.webhooks.set({ url: 'https://your-server.com/webhook' })
   * ```
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
   *
   * @example
   * ```ts
   * app.post('/kappela-webhook', express.json(), (req, res) => {
   *   me.handleWebhook(req.body)
   *   res.sendStatus(200)
   * })
   * ```
   */
  handleWebhook(body: unknown): void {
    dispatchWireEvent(this, body)
  }
}
