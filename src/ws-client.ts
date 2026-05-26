import { EventEmitter } from 'events'
import WebSocket from 'ws'
import type { KappelaWireEvent } from './types.js'

// ─── Typed EventEmitter overloads ────────────────────────────────────────────
export declare interface WSClient {
  on(event: 'raw',          listener: (event: KappelaWireEvent)               => void): this
  on(event: 'error',        listener: (err: Error)                            => void): this
  on(event: 'connected',    listener: ()                                      => void): this
  on(event: 'disconnected', listener: (code: number, reason: string)          => void): this

  once(event: 'raw',          listener: (event: KappelaWireEvent)            => void): this
  once(event: 'error',        listener: (err: Error)                         => void): this
  once(event: 'connected',    listener: ()                                   => void): this
  once(event: 'disconnected', listener: (code: number, reason: string)       => void): this

  emit(event: 'raw',          wireEvent: KappelaWireEvent):          boolean
  emit(event: 'error',        err:    Error):                        boolean
  emit(event: 'connected'):                                           boolean
  emit(event: 'disconnected', code:   number, reason: string):       boolean
}

export class WSClient extends EventEmitter {
  private url:            string
  private displayUrl:     string
  private ws:             WebSocket | null = null
  private stopped         = false
  private attempts        = 0
  private maxRetries      = 12
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(url: string, maxRetries = 12) {
    super()
    this.maxRetries = maxRetries
    this.url        = url
    this.displayUrl = url.replace(/([?&]api_key=)[^&]+/, '$1***')
  }

  connect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopped  = false
    this.attempts = 0
    this._connect()
  }

  private _connect(): void {
    if (this.stopped) return

    this.ws = new WebSocket(this.url)

    this.ws.on('open', () => {
      this.attempts = 0
      this.emit('connected')
    })

    this.ws.on('message', (raw: Buffer | string) => {
      let event: KappelaWireEvent
      try {
        event = JSON.parse(raw.toString()) as KappelaWireEvent
      } catch {
        return
      }

      // dispatchWireEvent in bot/user handles typed routing — WSClient only emits raw
      this.emit('raw', event)
    })

    this.ws.on('close', (code, reason) => {
      const reasonStr = reason?.toString() ?? ''
      this.emit('disconnected', code, reasonStr)
      if (!this.stopped) this._scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      this.emit('error', new Error(`WebSocket error (${this.displayUrl}): ${err.message}`))
    })

    // The ws library auto-responds to server PingFrames with PongFrames.
    // The Kappela server sends a ping every 30s and expects pong within 60s.
  }

  private _scheduleReconnect(): void {
    if (this.attempts >= this.maxRetries) {
      this.emit('error', new Error(`WebSocket: max reconnect attempts (${this.maxRetries}) reached`))
      return
    }
    const delay = Math.min(1000 * 2 ** this.attempts, 30_000)
    this.attempts++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this._connect()
    }, delay)
  }

  disconnect(): void {
    this.stopped = true
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
