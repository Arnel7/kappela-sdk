# @kappelas/sdk

[![npm](https://img.shields.io/npm/v/@kappelas/sdk?color=crimson&label=npm)](https://www.npmjs.com/package/@kappelas/sdk)
[![license](https://img.shields.io/npm/l/@kappelas/sdk)](LICENSE)
[![node](https://img.shields.io/node/v/@kappelas/sdk?label=node)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**Official SDK for the [Kappela](https://kappelas.com) messaging platform.**  
Build bots and personal automations with full type safety and IDE autocomplete — works with TypeScript and plain JavaScript.

---

## Table of contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Quick start](#quick-start)
- [JavaScript support & autocomplete](#javascript-support--autocomplete)
- [Events — WebSocket vs Webhook](#events--websocket-vs-webhook)
  - [Message fields](#message-fields)
  - [CallbackQuery fields](#callbackquery-fields)
- [API reference](#api-reference)
  - [messages](#messages)
    - [delete\_previous](#delete_previous--replace-the-last-bot-message)
  - [chats](#chats)
    - [Chat member management](#chat-member-management-admin-only)
    - [Invite links (admin only)](#invite-links-admin-only)
    - [getMyGroups](#chatsgetmygroups--promisegetmygroupsresult)
  - [webhooks](#webhooks)
  - [profile](#profile)
- [Groups & channels](#groups--channels)
  - [Receiving group messages](#receiving-group-messages)
  - [Replying to a message](#replying-to-a-message)
  - [Getting member IDs in a group](#getting-member-ids-in-a-group)
  - [Detecting conversation type](#detecting-conversation-type)
  - [Full group bot example](#full-group-bot-example)
- [Text formatting](#text-formatting)
  - [Inline styles](#inline-styles)
  - [Block code](#block-code)
  - [Blockquote / citation](#blockquote--citation)
  - [Mentions and commands](#mentions-and-commands)
  - [Auto-detected links](#auto-detected-links)
- [Keyboards](#keyboards)
  - [Comparison](#comparison)
  - [Inline keyboard](#inline-keyboard)
  - [Reply keyboard](#reply-keyboard)
  - [Scroll keyboard](#scroll-keyboard)
  - [Full example](#full-example--all-three-in-one-bot)
- [Error handling](#error-handling)
- [File input](#file-input)

---

## Prerequisites

You need a bot token from **BotMother**, the official Kappela bot manager.

1. Open Kappela and start a conversation with **BotMother** at `kappelas.com/bot/botmother_bot`
2. Follow the instructions to create a bot
3. BotMother gives you a token — keep it secret, it gives full control over your bot

For personal automation (sending messages as yourself), generate an API key from your Kappela account settings (`sk_...`).

---

## Install

```bash
npm install @kappelas/sdk
```

Requires **Node.js ≥ 18**.

---

## Quick start

### Bot

```ts
import { KappelaBot } from '@kappelas/sdk'

const bot = new KappelaBot({ token: 'YOUR_BOT_TOKEN' })

bot.on('message', async (msg) => {
  await bot.messages.send({ chat_id: msg.chat_id, text: `Echo: ${msg.text}` })
})

bot.on('callback_query', async (cb) => {
  await bot.messages.send({ chat_id: cb.chat_id, text: `You clicked: ${cb.callback_data}` })
})

bot.start()
```

### Personal automation

```ts
import { KappelaUser } from '@kappelas/sdk'

const me = new KappelaUser({ apiKey: 'sk_...' })

me.on('message', (msg) => {
  console.log(`[${msg.chat_id}] ${msg.sender_name}: ${msg.text}`)
})

me.start()
```

---

## JavaScript support & autocomplete

The SDK works with **TypeScript and plain JavaScript** — same install, same import.

```js
// CommonJS
const { KappelaBot } = require('@kappelas/sdk')

// ESM
import { KappelaBot } from '@kappelas/sdk'
```

**Full autocomplete in JavaScript:** add `// @ts-check` at the top of your file. VS Code reads the bundled `.d.ts` declarations automatically — no TypeScript required.

```js
// @ts-check
const { KappelaBot } = require('@kappelas/sdk')

const bot = new KappelaBot({ token: '...' })

bot.messages.   // → send, sendPhoto, sendVideo, sendAudio, sendDocument, sendCarousel, edit, sendTyping, delete
bot.chats.      // → list, iterate, getMyGroups, addMember, banMember, leaveChat, promoteMember, getAdministrators, getMember, createInviteLink, createSingleUseInviteLink, getInviteLinks, revokeInviteLink
bot.webhooks.   // → set, getInfo, delete
bot.profile.    // → get

// msg.chat_type → "private" | "group" | "channel"  (available on every message event)
```

---

## Events — WebSocket vs Webhook

| Mode | Method | Best for |
|------|--------|----------|
| **WebSocket** | `bot.start()` | Development, local scripts |
| **Webhook** | `bot.webhooks.set()` + `bot.handleWebhook()` | Production servers |

The same `on('message')` and `on('callback_query')` handlers work in both modes — no code change needed when switching.

### WebSocket (development)

```ts
const bot = new KappelaBot({ token: '...' })

bot.on('message', async (msg) => { /* ... */ })
bot.on('callback_query', async (cb) => { /* ... */ })

bot.start()   // auto-reconnects on disconnect
```

### Webhook (production)

```ts
import express from 'express'
import { KappelaBot } from '@kappelas/sdk'

const bot = new KappelaBot({ token: 'YOUR_BOT_TOKEN' })

// register once
await bot.webhooks.set({ url: 'https://your-server.com/kappela-webhook' })

bot.on('message', async (msg) => {
  await bot.messages.send({ chat_id: msg.chat_id, text: `Echo: ${msg.text}` })
})

bot.on('callback_query', async (cb) => {
  await bot.messages.send({ chat_id: cb.chat_id, text: `Clicked: ${cb.callback_data}` })
})

const app = express()
app.use(express.json())

app.post('/kappela-webhook', (req, res) => {
  bot.handleWebhook(req.body)
  res.sendStatus(200)
})

app.listen(3000)
```

> Do **not** call `bot.start()` in webhook mode.

### Event reference

| Event | Signature | Description |
|-------|-----------|-------------|
| `message` | `(msg: Message) => void \| Promise<void>` | Incoming message |
| `callback_query` | `(cb: CallbackQuery) => void \| Promise<void>` | Inline button clicked |
| `connected` | `() => void` | WebSocket opened |
| `disconnected` | `(code: number, reason: string) => void` | WebSocket closed |
| `error` | `(err: Error) => void` | Transport error |
| `raw` | `(event: KappelaWireEvent) => void` | Unprocessed wire event, before dispatch — useful for debugging or handling future event types not yet modelled by the SDK |

### `Message` fields

```ts
bot.on('message', (msg) => {
  msg.id               // number  — unique message ID; use as reply_to_id to quote this message
  msg.chat_id          // number  — chat this message belongs to
  msg.chat_type        // "private" | "group" | "channel"  (always set on events)
  msg.sender_id        // string | null — UUID of the sender
  msg.sender_name      // string | null — display name of the sender
  msg.type             // MessageType — see below
  msg.text             // string | null
  msg.media_id         // string | null — set on image/video/audio/document messages
  msg.status           // "sent" | "delivered" | "read"
  msg.edited_at        // number | null — Unix timestamp if the message was edited
  msg.deleted_at       // number | null — Unix timestamp if the message was deleted
  msg.reply_to_id      // number | null — ID of the message this one replies to
  msg.reply_to_snapshot  // ReplySnapshot | null — snapshot of the quoted message (see below)
  msg.mentions         // string[] — UUIDs of @mentioned users
  msg.created_at       // number — Unix timestamp (seconds)
})
```

**`MessageType` values** — `msg.type` is one of:

| Value | Description |
|-------|-------------|
| `'text'` | Plain text message |
| `'image'` | Photo |
| `'video'` | Video |
| `'audio'` | Voice or music |
| `'document'` | File attachment |
| `'sticker'` | Sticker |
| `'location'` | Shared location |
| `'contact'` | Shared contact |
| `'poll'` | Poll |
| `'system'` | System event (member joined, etc.) — `text` may be null |

**`ReplySnapshot`** — when `msg.reply_to_snapshot` is not null, it contains a preview of the quoted message:

```ts
bot.on('message', (msg) => {
  if (msg.reply_to_snapshot) {
    const snap = msg.reply_to_snapshot
    snap.message_id  // number  — ID of the original message
    snap.sender_id   // string | null — UUID of the original sender
    snap.type        // MessageType — type of the original message
    snap.text        // string | null — text of the original message
    snap.media_id    // string | null — media ID if the original was a photo/video/…
  }
})
```

> **`sender_name` vs `sender_nom`** — on `Message` the display-name field is `sender_name` (may be `null`). On `CallbackQuery` it is `sender_nom`. Different names — copy-pasting between the two handlers gives `undefined` silently.

### `CallbackQuery` fields

```ts
bot.on('callback_query', (cb) => {
  cb.chat_id          // number  — chat where the button was clicked
  cb.sender_id        // string  — UUID of the user who clicked
  cb.sender_nom       // string | null — display name (e.g. "Arnel LAWSON")
  cb.sender_username  // string | null — username (e.g. "arnell")
  cb.callback_data    // string  — value set on the button
  cb.sent_at          // number  — Unix timestamp (seconds)
})
```

> Clicks are deduplicated server-side — your handler fires exactly once per click.

---

## API reference

### Constructor options

#### `new KappelaBot(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `token` | `string` | — | Bot token (required) |
| `baseUrl` | `string` | `https://api.kappelas.com` | Override API base URL |
| `maxRetries` | `number` | `2` | HTTP retry count on 429 / 5xx |
| `timeoutMs` | `number` | `30000` | Per-request timeout (ms) |
| `wsMaxRetries` | `number` | `12` | Max WebSocket reconnect attempts |

> **When `wsMaxRetries` is exhausted** — the bot stops reconnecting and emits an `error` event: `"WebSocket: max reconnect attempts (N) reached"`. Call `bot.start()` again to resume. The reconnect delay is exponential, capped at 30 seconds: `min(1000 × 2ⁿ, 30000)` ms.

#### `new KappelaUser(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Personal API key `sk_...` (required) |
| `baseUrl` | `string` | `https://api.kappelas.com` | Override API base URL |
| `maxRetries` | `number` | `2` | HTTP retry count |
| `timeoutMs` | `number` | `30000` | Per-request timeout (ms) |
| `wsMaxRetries` | `number` | `12` | Max WebSocket reconnect attempts |

#### Instance methods & properties

Both `KappelaBot` and `KappelaUser` expose:

| Member | Description |
|--------|-------------|
| `.start()` | Open the WebSocket and start receiving events. Returns `this`. |
| `.stop()` | Close the WebSocket gracefully. Returns `this`. |
| `.connected` | `true` if the WebSocket is currently open. |
| `.handleWebhook(body)` | Process a parsed webhook payload. Use in your HTTP route handler instead of `.start()`. |
| `.on(event, handler)` | Subscribe to `'message'`, `'callback_query'`, `'connected'`, `'disconnected'`, `'error'`. |
| `.once(event, handler)` | Same as `.on()` but fires only once. |
| `.off(event, handler)` | Remove a previously registered handler. Pass the same function reference used in `.on()`. |

```ts
bot.start()
console.log(bot.connected)   // true once WebSocket is open

bot.once('connected', () => {
  console.log('Ready!')
})

// Check connection state before sending
if (bot.connected) {
  await bot.messages.send({ chat_id: 42, text: 'Still here!' })
}
```

---

### `messages`

#### `messages.send(params)` → `Promise<SendResult>`

```ts
const result = await bot.messages.send({
  chat_id:          42,
  text:             'Hello!',
  reply_to_id:      123,        // optional — reply to a message
  delete_previous:  false,      // optional
  reply_markup: {               // optional
    inline_keyboard: [[
      { text: 'Yes', callback_data: 'yes' },
      { text: 'No',  callback_data: 'no'  },
    ]]
  }
})
// → { message_id: number, created_at: number }
```

#### `messages.sendPhoto(params)` → `Promise<SendMediaResult>`

The `photo` field (and `video`, `document`, `audio` on the equivalent methods) accepts:

| Form | Example |
|------|---------|
| **HTTP/HTTPS URL** | `'https://example.com/banner.jpg'` |
| `Buffer` / `Uint8Array` | `fs.readFileSync('./banner.png')` |
| `Blob` | `new Blob([data], { type: 'image/png' })` |
| Object with metadata | `{ data: buf, filename: 'banner.png', contentType: 'image/png' }` |

```ts
// Simplest — pass a URL, the SDK fetches it automatically
await bot.messages.sendPhoto({
  chat_id: 42,
  photo:   'https://example.com/banner.jpg',
  caption: 'Check this out',
})

// Or with a local buffer
await bot.messages.sendPhoto({
  chat_id: 42,
  photo:   fs.readFileSync('./banner.png'),
  caption: 'Check this out',
})
// → { message_id, created_at, media_id }
```

#### `messages.sendVideo` / `sendDocument` / `sendAudio` → `Promise<SendMediaResult>`

Same shape — replace the field name (`video`, `document`, `audio`) with your file or URL.

#### `messages.sendCarousel(params)` → `Promise<SendCarouselResult>`

```ts
await bot.messages.sendCarousel({
  chat_id: 42,
  text:    'Pick a product:',
  carousel: [
    {
      id:          'p1',
      title:       'Widget A',
      subtitle:    '$9.99',
      image_url:   'https://example.com/widget-a.jpg',  // optional cover image
      button_text: 'Buy',
    },
    {
      id:          'p2',
      title:       'Widget B',
      subtitle:    '$19.99',
      image_url:   'https://example.com/widget-b.jpg',
      button_text: 'Buy',
    },
  ],
  quick_reply_buttons: ['See more', 'Cancel'],
})
```

`quick_reply_buttons` also accepts the long form — separate display label from callback value:

```ts
quick_reply_buttons: [
  { text: '📦 See more', callback_data: 'show_more' },
  { text: '✖ Cancel',   callback_data: 'cancel'    },
]
```

**Handling carousel button clicks** — when a user taps a carousel card's button, the bot receives a `callback_query` event. `callback_data` equals the `id` of the card that was clicked:

```ts
bot.on('callback_query', async (cb) => {
  // cb.callback_data === 'p1'  (the id of the clicked card)
  if (cb.callback_data === 'p1') {
    await bot.messages.send({ chat_id: cb.chat_id, text: 'You picked Widget A!' })
  }
})
```

> Quick-reply button clicks also fire `callback_query` — `callback_data` is either the button string or the explicit `callback_data` field.

#### `messages.edit(params)` → `Promise<EditMessageResult>`

```ts
// Edit text
await bot.messages.edit({ chat_id: 42, message_id: 123, new_text: 'Updated!' })

// Edit inline keyboard only
await bot.messages.edit({
  chat_id:        42,
  message_id:     123,
  new_extra_data: {
    inline_keyboard: [[{ text: 'Done ✅', callback_data: 'done' }]]
  },
})

// Remove keyboard entirely — pass null
await bot.messages.edit({
  chat_id:        42,
  message_id:     123,
  new_extra_data: null,
})
// → { edited: true, message_id: number }
```

#### `messages.sendTyping(params)` → `Promise<TypingResult>`

```ts
await bot.messages.sendTyping({ chat_id: 42 })                        // show
await bot.messages.sendTyping({ chat_id: 42, is_typing: false })      // hide
```

#### `messages.delete(params)` → `Promise<DeleteResult>`

```ts
await bot.messages.delete({ chat_id: 42, message_id: 123 })
// → { deleted: true }
```

#### `delete_previous` — replace the last bot message

All `send*` methods accept an optional `delete_previous: true` flag. When set, the bot's **last message in that chat** is silently deleted before the new one is sent — no visual stacking.

```ts
// Step-by-step flow — each message replaces the previous one
await bot.messages.send({
  chat_id:          msg.chat_id,
  text:             'Step 1 of 3 — enter your name:',
  delete_previous:  true,
})

// Later, after the user replies:
await bot.messages.send({
  chat_id:          msg.chat_id,
  text:             'Step 2 of 3 — confirm your email:',
  delete_previous:  true,   // removes "Step 1" before sending "Step 2"
})
```

Works on all send methods — `sendPhoto`, `sendVideo`, `sendDocument`, `sendAudio`, `sendCarousel`.

---

### `chats`

#### `chats.list(params?)` → `Promise<ChatsResult>`

```ts
const { chats, has_more } = await bot.chats.list({ limit: 20, offset: 0 })
```

#### `chats.iterate(pageSize?)` → `AsyncGenerator<Chat>`

Iterates over all chats, handling pagination automatically. Default page size: **50**.

```ts
for await (const chat of bot.chats.iterate()) {
  console.log(chat.chat_id, chat.title, chat.type)
}

// Custom page size — fewer requests for small accounts, larger batches for large ones
for await (const chat of bot.chats.iterate(100)) {
  console.log(chat.chat_id, chat.title)
}
```

**`Chat` fields** — each chat object exposes:

```ts
chat.chat_id                // number  — use this as chat_id in all API calls
chat.type                   // "private" | "group" | "channel"
chat.title                  // string | null
chat.description            // string | null
chat.avatar_url             // string | null
chat.is_public              // boolean — publicly listed group/channel
chat.only_admins_can_write  // boolean — true on broadcast channels / locked groups
chat.is_pinned              // boolean
chat.is_premium             // boolean
chat.labels                 // string[] — custom labels set by the creator
chat.participants           // Participant[] — member list (see "Getting member IDs")
chat.last_message_at        // string | null — ISO 8601
chat.created_at             // string — ISO 8601
chat.created_by             // string — UUID of the creator
```

```ts
// Example: find all public groups where only admins can write (broadcast mode)
for await (const chat of bot.chats.iterate()) {
  if (chat.type === 'group' && chat.only_admins_can_write) {
    console.log(chat.chat_id, chat.title, '— broadcast group')
  }
}

// Filter by label
for await (const chat of bot.chats.iterate()) {
  if (chat.labels.includes('vip')) {
    console.log(chat.chat_id, chat.title)
  }
}
```

### Chat member management (admin only)

> All write operations require the bot to be **admin** of the group or channel.

#### `chats.addMember(params)` → `Promise<AddChatMemberResult>`

Add a user to a group or channel.

```ts
await bot.chats.addMember({ chat_id: 42, user_id: 'user-uuid' })
// → { description: "member added" }
```

Throws `FORBIDDEN (403)` if the bot is not admin, `CONFLICT (409)` if the user is already a member.

#### `chats.banMember(params)` → `Promise<BanChatMemberResult>`

Remove (kick) a user from a group or channel. Cannot be used on the bot itself — use `leaveChat()` instead.

```ts
await bot.chats.banMember({ chat_id: 42, user_id: 'user-uuid' })
// → { description: "member removed" }
```

Throws `FORBIDDEN (403)` if the bot is not admin, `NOT_FOUND (404)` if the user is not a member.

#### `chats.leaveChat(params)` → `Promise<LeaveChatResult>`

Make the bot leave a group or channel.

```ts
await bot.chats.leaveChat({ chat_id: 42 })
// → { description: "bot left the chat" }
```

#### `chats.promoteMember(params)` → `Promise<PromoteChatMemberResult>`

Promote or demote a member. `role: "admin"` grants admin rights; `role: "member"` revokes them.

```ts
// Promote
await bot.chats.promoteMember({ chat_id: 42, user_id: 'user-uuid', role: 'admin' })

// Demote
await bot.chats.promoteMember({ chat_id: 42, user_id: 'user-uuid', role: 'member' })
// → { user_id, role }
```

#### `chats.getAdministrators(params)` → `Promise<GetChatAdministratorsResult>`

Return all admins of a group or channel. The bot must be a member.

```ts
const { admins } = await bot.chats.getAdministrators({ chat_id: 42 })
for (const a of admins) {
  console.log(a.user_id, a.role)  // role is always "admin"
}
```

#### `chats.getMember(params)` → `Promise<ChatMemberInfo>`

Return info for a specific member. Throws `NOT_FOUND (404)` if the user is not in the conversation.

```ts
const member = await bot.chats.getMember({ chat_id: 42, user_id: 'user-uuid' })
console.log(member.role)  // "admin" | "member"
```

---

### Invite links (admin only)

> The bot must be **admin** of the group or channel. Calls made by a non-admin bot return `FORBIDDEN (403)`.

#### `chats.createInviteLink(params)` → `Promise<ChatInviteLink>`

Creates an invite link for a group or channel.

```ts
// Permanent link — unlimited uses
const link = await bot.chats.createInviteLink({ chat_id: 42 })
console.log(link.url)   // "https://kappelas.com/invite/aBcD123xyz"

// Capped link — 5 uses, expires in 24 h
const link = await bot.chats.createInviteLink({
  chat_id:    42,
  max_uses:   5,
  expires_in: '24h',   // '1h' | '24h' | '7d' | '30d' | 'never'
})
// → { code, url, max_uses, use_count, expires_at, created_at }
```

| Field | Type | Description |
|-------|------|-------------|
| `chat_id` | `number` | Target group or channel |
| `max_uses` | `number?` | Max times the link can be used (`0` = unlimited, default) |
| `expires_in` | `string?` | `'1h'` · `'24h'` · `'7d'` · `'30d'` · `'never'` (default) |

#### `chats.createSingleUseInviteLink(params)` → `Promise<ChatInviteLink>`

Shorthand for `createInviteLink({ ..., max_uses: 1 })`. The link becomes invalid after the first use.

```ts
const link = await bot.chats.createSingleUseInviteLink({ chat_id: 42 })
// link.max_uses === 1

// Single-use + time limit
const link = await bot.chats.createSingleUseInviteLink({
  chat_id:    42,
  expires_in: '1h',
})
```

#### `chats.getInviteLinks(params)` → `Promise<GetChatInviteLinksResult>`

Returns all active (non-revoked) invite links for a group or channel.

```ts
const { invite_links } = await bot.chats.getInviteLinks({ chat_id: 42 })

for (const link of invite_links) {
  console.log(link.url, `${link.use_count}/${link.max_uses || '∞'} uses`)
}
// → { invite_links: ChatInviteLink[] }
```

#### `chats.revokeInviteLink(params)` → `Promise<RevokeChatInviteLinkResult>`

Revokes an active invite link so it can no longer be used to join.

```ts
await bot.chats.revokeInviteLink({ chat_id: 42, code: 'aBcD123xyz' })
// → { revoked: true, code: 'aBcD123xyz' }
```

Use the `code` field (not the full URL) returned by `createInviteLink` or `getInviteLinks`.

#### `ChatInviteLink` shape

```ts
interface ChatInviteLink {
  code:       string         // short code used in the URL
  url:        string         // full join URL
  max_uses:   number         // 0 = unlimited
  use_count:  number         // times already used
  expires_at: number | null  // Unix timestamp (seconds), null if permanent
  created_at: number         // Unix timestamp (seconds)
}
```

---

### `chats.getMyGroups()` → `Promise<GetMyGroupsResult>`

Returns every group and channel the bot is a member of, with the bot's own role in each.
Useful to discover which conversations the bot can manage (e.g. create invite links).

```ts
const { groups } = await bot.chats.getMyGroups()

// Filter to admin-only groups
const adminGroups = groups.filter(g => g.bot_role === 'admin')
console.log(`Admin in ${adminGroups.length} group(s)`)

for (const g of groups) {
  console.log(g.chat_id, g.type, g.title, '→', g.bot_role)
}
```

`BotGroupEntry` shape:

```ts
interface BotGroupEntry {
  chat_id:           number                  // use as chat_id in all API calls
  type:              'group' | 'channel'     // never 'private'
  title:             string | null
  participant_count: number                  // total members (including the bot)
  bot_role:          'member' | 'admin'
}
```

> Only groups and channels are returned — private chats never appear.

---

### `webhooks`

#### `webhooks.set(params)` → `Promise<WebhookSetResult>`

```ts
const result = await bot.webhooks.set({ url: 'https://your-server.com/kappela' })
// → { url: 'https://your-server.com/kappela', active: true }

// With a secret — Kappela will send this value in the X-Webhook-Secret header
// so you can verify that the request really comes from Kappela.
await bot.webhooks.set({
  url:    'https://your-server.com/kappela',
  secret: 'my-shared-secret',
})
// → { url: 'https://your-server.com/kappela', active: true }
```

| Param | Type | Description |
|-------|------|-------------|
| `url` | `string` | Public HTTPS URL Kappela will POST events to |
| `secret` | `string?` | Optional shared secret sent in `X-Webhook-Secret` on every delivery |

#### `webhooks.getInfo()` → `Promise<WebhookInfo>`

```ts
const info = await bot.webhooks.getInfo()
// → { active: boolean, url: string | null, created_at: number | null }
```

#### `webhooks.delete()` → `Promise<WebhookDeleteResult>`

```ts
await bot.webhooks.delete()
// → { active: false }
```

---

### `profile`

#### `profile.get()` → `Promise<BotProfile | UserProfile>`

```ts
const me = await bot.profile.get()
// BotProfile  → { user_id, username, is_bot: true, about, description, avatar_url }
// UserProfile → { id, username, nom, is_bot: false, is_premium, avatar_url, ... }
```

---

## Groups & channels

Bots work identically in private chats, groups, and channels — same API, same events. The only requirement is that **the bot must be a member** of the conversation.

### Receiving group messages

When a bot is added to a group or channel, it automatically receives every message posted there via the same `message` event used for DMs.

```ts
bot.on('message', (msg) => {
  msg.chat_id    // the group's id
  msg.chat_type  // "private" | "group" | "channel"
  msg.sender_id  // UUID of the user who sent the message
  msg.text       // message content
})
```

> The `chat_type` field lets you distinguish where a message came from without an extra API call.

### Replying to a message

`reply_to_id` attaches a quote banner to your message. It works identically in private chats, groups, and channels.

```ts
bot.on('message', async (msg) => {
  await bot.messages.send({
    chat_id:     msg.chat_id,
    text:        `Got it, ${msg.sender_name ?? 'friend'} 👋`,
    reply_to_id: msg.id,   // quotes the original message
  })
})
```

**Quoting any historical message** — `reply_to_id` accepts any `message_id`, not just the one that triggered the event:

```ts
// Quote a specific message by its ID (e.g. stored earlier)
await bot.messages.send({
  chat_id:     msg.chat_id,
  text:        'Here is the answer to your earlier question:',
  reply_to_id: 456,   // any message_id in the same chat
})
```

**Works on all send* methods** — photo, video, document, audio, and carousel all accept `reply_to_id`:

```ts
await bot.messages.sendPhoto({
  chat_id:     msg.chat_id,
  photo:       'https://example.com/img.png',
  caption:     'See attached',
  reply_to_id: msg.id,
})

await bot.messages.sendCarousel({
  chat_id:     msg.chat_id,
  text:        'Here are our products:',
  carousel:    [...],
  reply_to_id: msg.id,   // banner shows above the carousel
})
```

> In groups, always use `reply_to_id` when responding to a specific user — it makes the context clear to all members.

### Getting member IDs in a group

There are three ways to obtain the `user_id` of members in a group or channel:

**1. From incoming messages** — the simplest and most common. `msg.sender_id` is always set on every message event:

```ts
bot.on('message', (msg) => {
  if (msg.chat_type === 'group') {
    console.log(msg.sender_id)    // UUID of the user who sent this message
    console.log(msg.sender_name)  // display name (if available)
  }
})
```

**2. From the participants list** — `chats.list()` returns the full member list for each chat. Each `Participant` has an `id` field:

```ts
const { chats } = await bot.chats.list({ limit: 50 })

const group = chats.find(c => c.chat_id === TARGET_CHAT_ID)
if (group) {
  for (const member of group.participants) {
    console.log(member.id)       // UUID
    console.log(member.nom)      // display name
    console.log(member.role)     // "admin" | "member" (absent on private chats)
    console.log(member.is_bot)   // true if this participant is a bot
  }
}
```

`Participant` shape:

```ts
interface Participant {
  id:         string           // UUID — use as user_id in member management calls
  nom:        string           // display name
  is_bot:     boolean
  is_premium: boolean
  avatar_url: string | null
  role?:      'member' | 'admin'   // present on groups/channels, absent on private chats
}
```

**3. From `chats.getAdministrators()`** — when you only need admin IDs:

```ts
const { admins } = await bot.chats.getAdministrators({ chat_id: 42 })
const adminIds = admins.map(a => a.user_id)
```

> `chats.getMember({ chat_id, user_id })` lets you check whether a specific user is still in the group and what their current role is — useful after a `banMember` or `promoteMember` call to confirm the change.

### Detecting conversation type

`msg.chat_type` is available on every incoming message. Use it to adapt bot behaviour per context:

```ts
bot.on('message', async (msg) => {
  switch (msg.chat_type) {
    case 'private':
      // 1-on-1 chat — show full keyboard, personalise replies
      await bot.messages.send({
        chat_id:      msg.chat_id,
        text:         'What do you need?',
        reply_markup: { scroll_keyboard: ['📦 Orders', '❓ Help', '⚙️ Settings'] },
      })
      break

    case 'group':
      // Multi-user — reply with a quote so context is clear
      await bot.messages.send({
        chat_id:     msg.chat_id,
        text:        '✅ Noted!',
        reply_to_id: msg.id,
      })
      break

    case 'channel':
      // Bot-only posting — no user interaction expected
      break
  }
})
```

### Full group bot example

A bot that works across private chats, groups, and channels:

```ts
import { KappelaBot } from '@kappelas/sdk'

const bot = new KappelaBot({ token: 'YOUR_BOT_TOKEN' })

bot.on('message', async (msg) => {
  if (!msg.text) return

  const isGroup   = msg.chat_type === 'group'
  const isPrivate = msg.chat_type === 'private'

  // /status command — works anywhere
  if (msg.text === '/status') {
    await bot.messages.send({
      chat_id:     msg.chat_id,
      text:        '🟢 Bot is online',
      reply_to_id: isGroup ? msg.id : undefined, // quote in groups
    })
    return
  }

  // /invite command — admin-only, group/channel only
  if (msg.text === '/invite' && !isPrivate) {
    try {
      const link = await bot.chats.createInviteLink({ chat_id: msg.chat_id })
      await bot.messages.send({
        chat_id:     msg.chat_id,
        text:        `🔗 Invite link: ${link.url}`,
        reply_to_id: isGroup ? msg.id : undefined,
      })
    } catch {
      await bot.messages.send({
        chat_id: msg.chat_id,
        text:    '❌ I need admin rights to create invite links.',
      })
    }
    return
  }

  // Private only — interactive keyboard
  if (isPrivate) {
    await bot.messages.send({
      chat_id:      msg.chat_id,
      text:         'What do you need?',
      reply_markup: {
        inline_keyboard: [[
          { text: '📦 Orders', callback_data: 'orders' },
          { text: '❓ Help',   callback_data: 'help'   },
        ]],
      },
    })
  }
})

bot.on('callback_query', async (cb) => {
  await bot.messages.send({ chat_id: cb.chat_id, text: `You chose: ${cb.callback_data}` })
})

bot.start()
```

---

## Text formatting

Kappela renders a **WhatsApp/Telegram-style subset of Markdown** in every message bubble — bot messages, group messages, and private chat messages. All formatting is applied client-side by the Android app; you only need to send the correct markup in the `text` or `caption` field.

### Inline styles

| Syntax | Result |
|--------|--------|
| `**bold**` or `*bold*` | **Bold** |
| `__italic__` or `_italic_` | *Italic* |
| `~strikethrough~` | ~~Strikethrough~~ |
| `` `inline code` `` | Monospace with a tinted background |

```ts
await bot.messages.send({
  chat_id: 42,
  text: 'Order *confirmed* ✅\nTotal: **24,99 €**\nRef: `ORD-2024-001`',
})
```

### Block code

Wrap in triple backticks. The app renders it as a card with a one-tap **copy** button:

````ts
await bot.messages.send({
  chat_id: 42,
  text: 'Your API key:\n```\nsk_live_abc123xyz\n```',
})
````

> The code card is displayed as a separate block below the message text. It collapses to a single line with an ellipsis if too long.

### Blockquote / citation

Prefix a line with `>` to render it as a citation banner (a `┃` bar on the left, italic, slightly faded):

```ts
await bot.messages.send({
  chat_id: 42,
  text: '> Original question goes here\n\nHere is your answer.',
})
```

> You can combine blockquotes with `reply_to_id` — use `reply_to_id` when you want to quote a specific existing message (the app shows a reply banner); use `>` when you want to render a quote inline within the text itself.

### Mentions and commands

`@username` and `/command` are auto-detected and rendered as tappable blue links:

```ts
// Mention a user by their username
await bot.messages.send({
  chat_id: 42,
  text: 'Thanks @arnell, your order is ready!',
})

// Send a command hint
await bot.messages.send({
  chat_id: 42,
  text: 'Type /help to see all available commands.',
})
```

> **Protection rule:** `@` and `/` inside URLs are never formatted. `@buy_something_bot` is treated as a mention, not as `buy` + `_something_bot` (italic).

### Auto-detected links

The renderer automatically makes the following clickable without any markup:

| Pattern | Behaviour |
|---------|-----------|
| `https://…` or `http://…` | Opens in the in-app browser |
| `domain.com`, `domain.io`, `domain.fr` … | Prefixed with `https://` and opened |
| `email@example.com` | Opens the mail app |
| `+22901 62 86 15 71`, `+229 0162861571` | Opens the dialler |

```ts
await bot.messages.send({
  chat_id: 42,
  text: 'Visit kappelas.com or contact us at support@kappelas.com',
})
```

### Combining formats

All inline styles can be combined freely:

```ts
await bot.messages.send({
  chat_id: 42,
  text: [
    '🛒 *Order summary*',
    '',
    '> Widget A × 2',
    '',
    'Total: **49,98 €**',
    'Status: `CONFIRMED`',
    '',
    'Questions? Contact support@kappelas.com or type /help',
  ].join('\n'),
})
```

Renders as:

```
🛒 Order summary     ← bold

┃ Widget A × 2       ← blockquote (italic, faded)

Total: 49,98 €       ← bold amount
Status: CONFIRMED    ← monospace badge

Questions? Contact support@kappelas.com or type /help
                     ← email and /help are tappable
```

---

## Keyboards

Three types of keyboard can be passed as `reply_markup` on any `send*` call.

### Comparison

| | Inline | Reply | Scroll |
|---|---|---|---|
| Position | Attached to the message | Below the input bar | Horizontal chips above input |
| Stays after tap | ✅ Yes | ❌ Dismissed | ✅ Yes |
| Separate `callback_data` | ✅ Always | ✅ Yes (see below) | ✅ Yes (see below) |
| URL button | ✅ Yes | ❌ No | ❌ No |
| Layout | 2-D grid `[][]` | 2-D grid `[][]` | 1-D list `[]` |

---

### Inline keyboard

Buttons are attached to the message itself. They stay visible after being tapped.

```ts
import type { InlineKeyboard } from '@kappelas/sdk'

const markup: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '✅ Confirm', callback_data: 'confirm' },
      { text: '❌ Cancel',  callback_data: 'cancel'  },
    ],
    [
      { text: '🌐 Open website', url: 'https://kappelas.com' },
    ],
  ],
}

await bot.messages.send({ chat_id: 42, text: 'Confirm your order?', reply_markup: markup })
```

Each button can have either `callback_data` (fires `callback_query` event) or `url` (opens a link).

---

### Reply keyboard

A virtual keyboard shown below the input bar. It is dismissed after the user taps a button.

**Short form** — the label is also the callback value (backwards-compatible):

```ts
import type { ReplyKeyboard } from '@kappelas/sdk'

const markup: ReplyKeyboard = {
  keyboard: [
    ['📦 My orders', '❓ Help'],
    ['🔙 Back'],
  ],
}
```

**Long form** — display a label while sending a different `callback_data` to your webhook:

```ts
const markup: ReplyKeyboard = {
  keyboard: [
    [
      { text: '✅ Yes', callback_data: 'confirm_yes' },
      { text: '❌ No',  callback_data: 'confirm_no'  },
    ],
    [
      { text: '↩ Cancel', callback_data: 'cancel' },
    ],
  ],
}
```

You can **mix** short and long buttons in the same grid:

```ts
const markup: ReplyKeyboard = {
  keyboard: [
    [{ text: '✅ Confirm', callback_data: 'confirm' }, '❓ Help'],
  ],
}
```

---

### Scroll keyboard

A single row of horizontal chips, always visible above the input bar.

**Short form:**

```ts
import type { ScrollKeyboard } from '@kappelas/sdk'

const markup: ScrollKeyboard = {
  scroll_keyboard: ['📦 Orders', '❓ Help', '⚙️ Settings'],
}
```

**Long form** — separate label and callback:

```ts
const markup: ScrollKeyboard = {
  scroll_keyboard: [
    { text: '📦 Orders',   callback_data: 'menu_orders'   },
    { text: '❓ Help',     callback_data: 'menu_help'     },
    { text: '⚙️ Settings', callback_data: 'menu_settings' },
  ],
}
```

---

### Full example — all three in one bot

```ts
import { KappelaBot } from '@kappelas/sdk'
import type { ReplyKeyboard, InlineKeyboard, ScrollKeyboard } from '@kappelas/sdk'

const bot = new KappelaBot({ token: 'YOUR_BOT_TOKEN' })

bot.on('message', async (msg) => {
  if (msg.text === '/start') {
    // Persistent chips for navigation
    const nav: ScrollKeyboard = {
      scroll_keyboard: [
        { text: '📦 Orders',  callback_data: 'menu_orders' },
        { text: '❓ Help',    callback_data: 'menu_help'   },
      ],
    }
    await bot.messages.send({
      chat_id:      msg.chat_id,
      text:         'Welcome! What do you need?',
      reply_markup: nav,
    })
  }
})

bot.on('callback_query', async (cb) => {
  if (cb.callback_data === 'menu_orders') {
    // Inline confirm/cancel buttons
    const confirm: InlineKeyboard = {
      inline_keyboard: [[
        { text: '✅ Confirm', callback_data: 'order_confirm' },
        { text: '❌ Cancel',  callback_data: 'order_cancel'  },
      ]],
    }
    await bot.messages.send({
      chat_id:      cb.chat_id,
      text:         'Confirm your latest order?',
      reply_markup: confirm,
    })
  }

  if (cb.callback_data === 'menu_help') {
    // Reply keyboard for topic selection
    const topics: ReplyKeyboard = {
      keyboard: [
        [{ text: '💳 Billing', callback_data: 'help_billing' },
         { text: '🚚 Delivery', callback_data: 'help_delivery' }],
        ['↩ Back to menu'],
      ],
    }
    await bot.messages.send({
      chat_id:      cb.chat_id,
      text:         'Which topic?',
      reply_markup: topics,
    })
  }
})

bot.start()
```

---

## Error handling

All API errors throw a `KappelaError` with structured fields:

```ts
import { KappelaError } from '@kappelas/sdk'

try {
  await bot.messages.send({ chat_id: 999, text: 'Hi' })
} catch (err) {
  if (err instanceof KappelaError) {
    err.error_code   // 'NOT_FOUND'
    err.status       // 404
    err.message      // server error message
    err.hint         // 'The requested resource does not exist.'
    err.solutions    // ['Check the ID is correct', ...]
    err.request_id   // mention this when contacting support

    console.error(String(err))   // full human-readable block
  }
}
```

### Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Token or API key invalid / expired |
| `FORBIDDEN` | 403 | Missing permission or role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `MISSING_FIELD` | 400 | Required parameter missing |
| `INVALID_FIELD` | 400 | Parameter has wrong type or format |
| `CONFLICT` | 409 | Resource already exists |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method |
| `INVALID_PATH` | 404 | API path does not exist |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |
| `UPSTREAM_ERROR` | 502 | Upstream service error |

---

## File input

Media methods (`sendPhoto`, `sendVideo`, `sendDocument`, `sendAudio`) accept files in several forms:

```ts
// HTTP/HTTPS URL — the SDK fetches the file automatically (like Telegram)
bot.messages.sendPhoto({ chat_id: 42, photo: 'https://example.com/banner.jpg' })

// Node.js Buffer
bot.messages.sendPhoto({ chat_id: 42, photo: fs.readFileSync('./img.png') })

// Uint8Array
bot.messages.sendPhoto({ chat_id: 42, photo: new Uint8Array(bytes) })

// Web Blob
bot.messages.sendPhoto({ chat_id: 42, photo: new Blob([data], { type: 'image/png' }) })

// Explicit metadata (recommended when MIME type cannot be inferred)
bot.messages.sendDocument({
  chat_id:  42,
  document: { data: pdfBuffer, filename: 'report.pdf', contentType: 'application/pdf' },
})
```

When a URL is provided, the filename and content-type are inferred automatically
from the URL path and the `Content-Type` response header.

---

## License

MIT
