import type { ApiResponse, FileInput } from './types.js'
import { KappelaError } from './errors.js'

export interface HttpClientOptions {
  baseUrl?:    string
  maxRetries?: number
  timeoutMs?:  number
}

const DEFAULT_BASE    = 'https://api.kappelas.com'
const RETRY_CODES     = new Set([429, 500, 502, 503, 504])
const RETRY_BACKOFF   = [500, 1000, 2000]

export class HttpClient {
  private baseUrl:    string
  private maxRetries: number
  private timeoutMs:  number
  private authHeader: Record<string, string> = {}

  constructor(opts: HttpClientOptions = {}) {
    this.baseUrl    = opts.baseUrl    ?? DEFAULT_BASE
    this.maxRetries = opts.maxRetries ?? 2
    this.timeoutMs  = opts.timeoutMs  ?? 30_000
  }

  setAuth(headers: Record<string, string>): void {
    this.authHeader = headers
  }

  private async _fetch<T>(
    path: string,
    init: RequestInit,
    extraHeaders: Record<string, string> = {},
    attempt = 0,
  ): Promise<T> {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(this.timeoutMs)
      : undefined
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), ...extraHeaders, ...this.authHeader },
      signal,
    })

    // Retry on transient server errors
    if (RETRY_CODES.has(res.status) && attempt < this.maxRetries) {
      await sleep(RETRY_BACKOFF[attempt] ?? 2000)
      return this._fetch<T>(path, init, extraHeaders, attempt + 1)
    }

    const requestId = res.headers.get('x-request-id') ?? undefined

    let body: unknown
    try {
      body = await res.json()
    } catch {
      throw new KappelaError(
        `Unexpected non-JSON response (HTTP ${res.status})`,
        'UPSTREAM_ERROR',
        res.status,
        requestId,
      )
    }

    const payload = body as ApiResponse<T>

    if (!payload.ok) {
      throw new KappelaError(payload.error, payload.error_code, res.status, requestId)
    }

    return payload.result
  }

  get<T>(path: string): Promise<T> {
    return this._fetch<T>(path, { method: 'GET' })
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this._fetch<T>(path, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  }

  postForm<T>(path: string, formFactory: () => FormData): Promise<T> {
    return this._fetchForm<T>(path, formFactory, 0)
  }

  private async _fetchForm<T>(
    path: string,
    formFactory: () => FormData,
    attempt: number,
  ): Promise<T> {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(this.timeoutMs)
      : undefined
    const res = await fetch(`${this.baseUrl}${path}`, {
      method:  'POST',
      headers: { ...this.authHeader },
      body:    formFactory(),
      signal,
    })

    if (RETRY_CODES.has(res.status) && attempt < this.maxRetries) {
      await sleep(RETRY_BACKOFF[attempt] ?? 2000)
      return this._fetchForm<T>(path, formFactory, attempt + 1)
    }

    const requestId = res.headers.get('x-request-id') ?? undefined

    let body: unknown
    try {
      body = await res.json()
    } catch {
      throw new KappelaError(
        `Unexpected non-JSON response (HTTP ${res.status})`,
        'UPSTREAM_ERROR',
        res.status,
        requestId,
      )
    }

    const payload = body as ApiResponse<T>

    if (!payload.ok) {
      throw new KappelaError(payload.error, payload.error_code, res.status, requestId)
    }

    return payload.result
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toArrayBuffer(buf: Uint8Array): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

/** Convert a FileInput to a Blob with an inferred filename. */
export function fileInputToBlob(
  input: FileInput,
  defaultFilename: string,
): [Blob, string] {
  if (input instanceof Blob) {
    return [input, (input as File).name ?? defaultFilename]
  }
  if (input instanceof Uint8Array || input instanceof Buffer) {
    return [new Blob([toArrayBuffer(input)], { type: 'application/octet-stream' }), defaultFilename]
  }
  // Named wrapper
  const { data, filename, contentType } = input
  const blob =
    data instanceof Blob
      ? data
      : new Blob([toArrayBuffer(data as Uint8Array)], { type: contentType ?? 'application/octet-stream' })
  return [blob, filename ?? defaultFilename]
}

/** Build a multipart FormData for a send-media call. */
export function buildMediaForm(
  fieldName:        string,
  chatId:           number,
  file:             FileInput,
  opts: {
    caption?:         string
    reply_to_id?:     number
    delete_previous?: boolean
    reply_markup?:    unknown
  } = {},
): FormData {
  const form     = new FormData()
  const [blob, filename] = fileInputToBlob(file, fieldName)

  form.append('chat_id', String(chatId))
  form.append(fieldName, blob, filename)

  if (opts.caption)         form.append('caption',         opts.caption)
  if (opts.reply_to_id)     form.append('reply_to_id',     String(opts.reply_to_id))
  if (opts.delete_previous) form.append('delete_previous', 'true')
  if (opts.reply_markup)    form.append('reply_markup',    JSON.stringify(opts.reply_markup))

  return form
}
