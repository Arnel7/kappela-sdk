import type { HttpClient } from '../http.js'
import type {
  SetWebhookParams,
  WebhookInfo,
  WebhookSetResult,
  WebhookDeleteResult,
} from '../types.js'

export class WebhooksResource {
  constructor(private http: HttpClient, private base: string) {}

  /** Register a webhook URL. Use this for production deployments. */
  set(params: SetWebhookParams): Promise<WebhookSetResult> {
    return this.http.post(`${this.base}/setWebhook`, params)
  }

  /** Get current webhook status and URL. */
  getInfo(): Promise<WebhookInfo> {
    return this.http.get(`${this.base}/getWebhookInfo`)
  }

  /** Remove the webhook. Events will no longer be delivered via HTTP POST. */
  delete(): Promise<WebhookDeleteResult> {
    return this.http.post(`${this.base}/deleteWebhook`, {})
  }
}
