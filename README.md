# @kappela/sdk

Official TypeScript SDK for the Kappela API — build bots and personal automations with full type safety and IDE autocomplete.

## Prerequisites — Create your bot and get a token

Before using the SDK you need a bot token. Tokens are issued by **BotMother**, the official Kappela bot manager.

1. Open Kappela and go to **https://kappelas.com/bot/botmother_bot**
2. Start a conversation with BotMother and follow the instructions to create a new bot
3. BotMother will give you a token that looks like: `834707b273efc64edaa115102680d7e6a9eed389...`

Keep this token secret — it gives full control over your bot.

For personal automation (sending messages as yourself), generate an API key from your account settings. It will look like `sk_...`.

---

## Install

```bash
npm install @kappela/sdk
```

Requires **Node.js ≥ 18**.

---

## Quick start — Bot

```ts
import { KappelaBot } from '@kappela/sdk'

const bot = new KappelaBot({ token: 'YOUR_BOT_TOKEN' })

bot.on('message', async (msg) => {
  await bot.messages.send({ chat_id: msg.chat_id, text: `Echo: ${msg.text}` })
})

bot.start()   // connect via WebSocket (development)
```

## Quick start — Personal automation

```ts
import { KappelaUser } from '@kappela/sdk'

const me = new KappelaUser({ apiKey: 'sk_...' })

me.on('message', (msg) => {
  console.log(`[${msg.chat_id}] ${msg.sender_name}: ${msg.text}`)
})

me.start()
```

---

## TypeScript & autocomplete

The SDK is written entirely in TypeScript and ships `.d.ts` declarations for every type, parameter, and return value. Type your client variable as `KappelaBot` / `KappelaUser` once, and your IDE will show every available method, its required and optional parameters, and what it returns — no docs tab needed.

```ts
const bot = new KappelaBot({ token: '...' })

bot.messages.          // → send, sendPhoto, sendVideo, sendDocument, sendAudio, sendCarousel, sendTyping, delete
bot.chats.             // → list, iterate
bot.webhooks.          // → set, getInfo, delete
bot.profile.           // → get
```

All events are typed too:

```ts
bot.on('message', (msg) => {
  msg.text          // string | null
  msg.chat_id       // number
  msg.sender_name   // string | null
  msg.created_at    // number (Unix seconds)
})
```

---

## Events (WebSocket vs Webhook)

| Mode | How | When to use |
|------|-----|-------------|
| **WebSocket** (`start()`) | Persistent connection, auto-reconnect | Development, local scripts |
| **Webhook** (`webhooks.set()`) | HTTP POST to your server | **Production** (recommended) |

### Development (WebSocket)

```ts
const bot = new KappelaBot({ token: '...' })

bot.on('message', async (msg) => { /* ... */ })

bot.start()   // opens WS, auto-reconnects
```

### Production (Webhook)

Register the webhook once, then call `handleWebhook()` in your route handler.
**The same `on('message')` handlers fire — no code change required.**

```ts
import express from 'express'
import { KappelaBot } from '@kappela/sdk'

const bot = new KappelaBot({ token: 'YOUR_BOT_TOKEN' })

// register once (keep the URL stable)
await bot.webhooks.set({ url: 'https://your-server.com/kappela-webhook' })

// same handler as in WS mode
bot.on('message', async (msg) => {
  await bot.messages.send({ chat_id: msg.chat_id, text: `Echo: ${msg.text}` })
})

// wire it up in your server
const app = express()
app.use(express.json())

app.post('/kappela-webhook', (req, res) => {
  bot.handleWebhook(req.body)   // dispatches to bot.on('message') etc.
  res.sendStatus(200)           // respond fast — Kappela expects 200
})

app.listen(3000)
```

> Do **not** call `bot.start()` in webhook mode — the WebSocket is not needed.

The `start()` / `stop()` methods control the WebSocket. Events fired:

| Event | Listener signature | Description |
|-------|--------------------|-------------|
| `message` | `(msg: Message) => void \| Promise<void>` | Incoming message |
| `callback_query` | `(cb: CallbackQuery) => void \| Promise<void>` | Inline button clicked |
| `connected` | `() => void` | WS opened |
| `disconnected` | `(code: number, reason: string) => void` | WS closed |
| `error` | `(err: Error) => void` | Transport error |

### Handling inline button clicks (`callback_query`)

When a user clicks an inline button (`callback_data`), a `callback_query` event fires — via **WebSocket** and via **webhook** alike, with no code change needed.

```ts
bot.on('callback_query', async (cb) => {
  console.log(cb.chat_id)          // number — which chat
  console.log(cb.sender_id)        // string — UUID of the user who clicked
  console.log(cb.sender_nom)       // string | null — display name (e.g. "Arnel LAWSON")
  console.log(cb.sender_username)  // string | null — username (e.g. "arnell")
  console.log(cb.callback_data)    // string — value set on the button
  console.log(cb.sent_at)          // number — Unix timestamp (seconds)

  await bot.messages.send({ chat_id: cb.chat_id, text: `You clicked: ${cb.callback_data}` })
})
```

> Each button click is deduplicated server-side — your handler fires exactly once per click, even if the client retransmits.

---

## API reference

### `new KappelaBot(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `token` | `string` | — | Bot token (required) |
| `baseUrl` | `string` | `https://api.kappelas.com` | Override API base URL |
| `maxRetries` | `number` | `2` | HTTP retry count on 429/5xx |
| `timeoutMs` | `number` | `30000` | Per-request timeout |
| `wsMaxRetries` | `number` | `12` | Max WebSocket reconnect attempts |

### `new KappelaUser(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Personal API key `sk_...` (required) |
| `baseUrl` | `string` | `https://api.kappelas.com` | Override API base URL |
| `maxRetries` | `number` | `2` | HTTP retry count |
| `timeoutMs` | `number` | `30000` | Per-request timeout |
| `wsMaxRetries` | `number` | `12` | Max WebSocket reconnect attempts |

---

### `messages`

#### `messages.send(params)` → `Promise<SendResult>`

Send a text message.

```ts
const result = await bot.messages.send({
  chat_id:  42,
  text:     'Hello!',
  // optional:
  reply_to_id:     123,
  delete_previous: false,
  reply_markup: {
    inline_keyboard: [[
      { text: 'Click me', callback_data: 'btn_1' }
    ]]
  }
})
// result: { message_id: number, created_at: number }
```

> **Note:** `send()` returns a lightweight receipt (`message_id` + `created_at`), not the full `Message` object. This matches how most messaging APIs work — the server confirms delivery without echoing the full object. To build an echo bot, use the `message` event where the full `Message` is always available.

#### `messages.sendPhoto(params)` → `Promise<SendMediaResult>`

```ts
await bot.messages.sendPhoto({
  chat_id: 42,
  photo:   fs.readFileSync('./banner.png'),  // Buffer, Uint8Array, Blob, or { data, filename, contentType }
  caption: 'Check this out',
})
// result: { message_id, created_at, media_id }
```

#### `messages.sendVideo(params)` → `Promise<SendMediaResult>`
#### `messages.sendDocument(params)` → `Promise<SendMediaResult>`
#### `messages.sendAudio(params)` → `Promise<SendMediaResult>`

All media methods accept the same shape — replace the field name (`video`, `document`, `audio`) and pass the file as `Buffer | Uint8Array | Blob | { data, filename, contentType }`.

#### `messages.sendCarousel(params)` → `Promise<SendCarouselResult>`

```ts
await bot.messages.sendCarousel({
  chat_id: 42,
  text:    'Pick a product:',
  carousel: [
    { id: 'p1', title: 'Widget A', subtitle: '$9.99', button_text: 'Buy' },
    { id: 'p2', title: 'Widget B', subtitle: '$19.99', button_text: 'Buy' },
  ],
  quick_reply_buttons: ['See more', 'Cancel'],
})
```

#### `messages.sendTyping(params)` → `Promise<TypingResult>`

```ts
await bot.messages.sendTyping({ chat_id: 42 })            // show indicator
await bot.messages.sendTyping({ chat_id: 42, is_typing: false })  // hide
```

#### `messages.edit(params)` → `Promise<EditMessageResult>`

Edit the text or inline keyboard of an existing message.

```ts
// Edit text
await bot.messages.edit({
  chat_id:    42,
  message_id: 123,
  new_text:   'Updated content',
})
// { edited: true, message_id: 123 }

// Edit inline keyboard only (keep existing text)
await bot.messages.edit({
  chat_id:        42,
  message_id:     123,
  new_extra_data: {
    inline_keyboard: [[{ text: 'Confirmed ✅', callback_data: 'confirmed' }]]
  },
})
```

> Either `new_text` or `new_extra_data` must be provided (or both).

#### `messages.delete(params)` → `Promise<DeleteResult>`

```ts
await bot.messages.delete({ chat_id: 42, message_id: 123 })
// { deleted: true }
```

---

### `chats`

#### `chats.list(params?)` → `Promise<ChatsResult>`

```ts
const { chats, has_more } = await bot.chats.list({ limit: 20, offset: 0 })
```

#### `chats.iterate(pageSize?)` → `AsyncGenerator<Chat>`

Automatically handles pagination — yields every chat one at a time:

```ts
for await (const chat of bot.chats.iterate()) {
  console.log(chat.chat_id, chat.title, chat.type)
}
```

---

### `webhooks`

#### `webhooks.set(params)` → `Promise<WebhookSetResult>`

```ts
await bot.webhooks.set({
  url:    'https://your-server.com/kappela',
  secret: 'optional-validation-secret',
})
```

#### `webhooks.getInfo()` → `Promise<WebhookInfo>`

```ts
const info = await bot.webhooks.getInfo()
// { active: boolean, url: string | null, created_at: number | null }
```

#### `webhooks.delete()` → `Promise<WebhookDeleteResult>`

```ts
await bot.webhooks.delete()
// { active: false }
```

---

### `profile`

#### `profile.get()` → `Promise<BotProfile | UserProfile>`

```ts
const me = await bot.profile.get()
// BotProfile: { user_id, username, is_bot: true, about, description, avatar_url }

const me = await user.profile.get()
// UserProfile: { id, username, nom, is_bot: false, is_premium, avatar_url, allow_group_add, allow_calls }
```

---

## Keyboards / reply markup

Three keyboard types are available and can be passed as `reply_markup` on any `send*` call:

```ts
// Inline buttons (attached to the message)
const inline: InlineKeyboard = {
  inline_keyboard: [
    [{ text: 'Yes', callback_data: 'yes' }, { text: 'No', callback_data: 'no' }]
  ]
}

// Reply keyboard (shown below the input bar)
const reply: ReplyKeyboard = {
  keyboard: [['Option A', 'Option B'], ['Cancel']]
}

// Scroll keyboard (horizontal chip list)
const scroll: ScrollKeyboard = {
  scroll_keyboard: ['Small', 'Medium', 'Large']
}
```

---

## Error handling

All API errors throw a `KappelaError`. It carries structured information so you can handle failures precisely:

```ts
import { KappelaError } from '@kappela/sdk'

try {
  await bot.messages.send({ chat_id: 999, text: 'Hi' })
} catch (err) {
  if (err instanceof KappelaError) {
    console.error(err.error_code)   // 'NOT_FOUND'
    console.error(err.status)       // 404
    console.error(err.message)      // server error message
    console.error(err.hint)         // 'The requested resource does not exist.'
    console.error(err.solutions)    // ['Check the ID is correct', ...]
    console.error(err.request_id)   // 'req_abc123' — mention this to support
    console.error(String(err))      // full human-readable block with docs link
  }
}
```

`console.error(String(err))` prints a rich block:

```
KappelaError: chat not found
  Code:   NOT_FOUND
  Status: 404

  The requested resource does not exist.

  Possible solutions:
  - Check the ID is correct
  - Make sure your bot has access to this resource
  - List available chats with: bot.chats.list()

  Docs: https://docs.kappelas.com/errors/not_found
  Request ID: req_abc123  (mention this when contacting support)
```

### All error codes

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
| `INTERNAL_ERROR` | 500 | Unexpected server error (usually transient) |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |
| `UPSTREAM_ERROR` | 502 | Upstream service returned unexpected response |

---

## File input

Media methods accept files in several forms:

```ts
// Node.js Buffer
await bot.messages.sendPhoto({ chat_id: 42, photo: fs.readFileSync('./img.png') })

// Uint8Array (works in any runtime)
await bot.messages.sendPhoto({ chat_id: 42, photo: new Uint8Array(bytes) })

// Web Blob / File
await bot.messages.sendPhoto({ chat_id: 42, photo: new Blob([data], { type: 'image/png' }) })

// Explicit metadata (filename, MIME type)
await bot.messages.sendDocument({
  chat_id:  42,
  document: { data: pdfBuffer, filename: 'report.pdf', contentType: 'application/pdf' },
})
```

---

## Build

```bash
npm run build       # → dist/ (ESM + CJS + .d.ts)
npm run typecheck   # tsc --noEmit
npm run dev         # watch mode
```

---

## License

MIT
