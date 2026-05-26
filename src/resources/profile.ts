import type { HttpClient } from '../http.js'
import type { BotProfile, UserProfile } from '../types.js'

export class BotProfileResource {
  constructor(private http: HttpClient, private base: string) {}

  /** Return the bot's own profile. */
  get(): Promise<BotProfile> {
    return this.http.post(`${this.base}/getMe`, {})
  }
}

export class UserProfileResource {
  constructor(private http: HttpClient, private base: string) {}

  /** Return your own profile. */
  get(): Promise<UserProfile> {
    return this.http.get(`${this.base}/getMe`)
  }
}
