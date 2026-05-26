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
- [API reference](#api-reference)
  - [messages](#messages)
  - [chats](#chats)
  - [webhooks](#webhooks)
  - [profile](#profile)
- [Keyboards](#keyboards)
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
bot.chats.      // → list, iterate
bot.webhooks.   // → set, getInfo, delete
bot.profile.    // → get
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

#### `new KappelaUser(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Personal API key `sk_...` (required) |
| `baseUrl` | `string` | `https://api.kappelas.com` | Override API base URL |
| `maxRetries` | `number` | `2` | HTTP retry count |
| `timeoutMs` | `number` | `30000` | Per-request timeout (ms) |
| `wsMaxRetries` | `number` | `12` | Max WebSocket reconnect attempts |

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

```ts
await bot.messages.sendPhoto({
  chat_id: 42,
  photo:   fs.readFileSync('./banner.png'),
  caption: 'Check this out',
})
// → { message_id, created_at, media_id }
```

#### `messages.sendVideo` / `sendDocument` / `sendAudio` → `Promise<SendMediaResult>`

Same shape — replace the field name (`video`, `document`, `audio`) with your file.

#### `messages.sendCarousel(params)` → `Promise<SendCarouselResult>`

```ts
await bot.messages.sendCarousel({
  chat_id: 42,
  text:    'Pick a product:',
  carousel: [
    { id: 'p1', title: 'Widget A', subtitle: '$9.99',  button_text: 'Buy' },
    { id: 'p2', title: 'Widget B', subtitle: '$19.99', button_text: 'Buy' },
  ],
  quick_reply_buttons: ['See more', 'Cancel'],
})
```

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

---

### `chats`

#### `chats.list(params?)` → `Promise<ChatsResult>`

```ts
const { chats, has_more } = await bot.chats.list({ limit: 20, offset: 0 })
```

#### `chats.iterate(pageSize?)` → `AsyncGenerator<Chat>`

```ts
for await (const chat of bot.chats.iterate()) {
  console.log(chat.chat_id, chat.title, chat.type)
}
```

---

### `webhooks`

#### `webhooks.set(params)` → `Promise<WebhookSetResult>`

```ts
await bot.webhooks.set({ url: 'https://your-server.com/kappela' })
```

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

## Keyboards

Three types of keyboard can be passed as `reply_markup` on any `send*` call:

```ts
// Inline buttons — attached to the message
const inline: InlineKeyboard = {
  inline_keyboard: [
    [{ text: 'Yes', callback_data: 'yes' }, { text: 'No', callback_data: 'no' }]
  ]
}

// Reply keyboard — shown below the input bar
const reply: ReplyKeyboard = {
  keyboard: [['Option A', 'Option B'], ['Cancel']]
}

// Scroll keyboard — horizontal chip list
const scroll: ScrollKeyboard = {
  scroll_keyboard: ['Small', 'Medium', 'Large']
}
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

Media methods accept files in several forms:

```ts
// Node.js Buffer
bot.messages.sendPhoto({ chat_id: 42, photo: fs.readFileSync('./img.png') })

// Uint8Array
bot.messages.sendPhoto({ chat_id: 42, photo: new Uint8Array(bytes) })

// Web Blob
bot.messages.sendPhoto({ chat_id: 42, photo: new Blob([data], { type: 'image/png' }) })

// Explicit metadata
bot.messages.sendDocument({
  chat_id:  42,
  document: { data: pdfBuffer, filename: 'report.pdf', contentType: 'application/pdf' },
})
```

---

## License

MIT
