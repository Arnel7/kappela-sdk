# Changelog — @kappelas/sdk

All notable changes to this package are documented here.

---

## [Unreleased]

### Added

#### 🖼️ Media from URL

`sendPhoto`, `sendVideo`, `sendDocument`, and `sendAudio` now accept an HTTP/HTTPS
URL string in addition to binary data. The SDK fetches the file automatically
before uploading — mirrors Telegram's URL support.

```ts
// Before — had to download manually
const res  = await fetch('https://example.com/banner.jpg')
const data = Buffer.from(await res.arrayBuffer())
await bot.messages.sendPhoto({ chat_id, photo: { data, filename: 'banner.jpg', contentType: 'image/jpeg' } })

// After — pass the URL directly
await bot.messages.sendPhoto({ chat_id, photo: 'https://example.com/banner.jpg' })
await bot.messages.sendVideo({ chat_id, video: 'https://cdn.example.com/clip.mp4', caption: 'Watch this!' })
```

The filename and content-type are inferred from the URL path and the `Content-Type`
response header. The file is fetched **once** before the upload, so retries
re-upload the cached buffer instead of re-fetching the URL.

---

#### 🎹 Keyboard buttons — dual format

`ReplyKeyboard` and `ScrollKeyboard` buttons now accept either a plain string
(short form, backwards-compatible) **or** an object `{ text, callback_data }`
(long form) that lets you display a label while sending a different value to
your webhook.

```ts
// Short form — unchanged
{ keyboard: [['Option A', 'Option B'], ['Cancel']] }

// Long form — separate label and callback value
{ keyboard: [[
  { text: '✅ Yes', callback_data: 'confirm_yes' },
  { text: '❌ No',  callback_data: 'confirm_no'  },
]] }

// Mixed — string and object in the same grid
{ keyboard: [[
  { text: '✅ Confirm', callback_data: 'confirm' },
  'Help',
]] }
```

New types exported: `ReplyKeyboardButton`, `ScrollKeyboardButton`

---

#### 🔗 Invite links (admin only)

Four new methods on `bot.chats` for managing invite links to groups and channels.
The bot must be **admin** of the target conversation.

| Method | Description |
|--------|-------------|
| `chats.createInviteLink(params)` | Create a permanent or capped/expiring link |
| `chats.createSingleUseInviteLink(params)` | Shorthand for `max_uses: 1` |
| `chats.getInviteLinks(params)` | List all active links |
| `chats.revokeInviteLink(params)` | Revoke a link by its code |

```ts
// Permanent link
const link = await bot.chats.createInviteLink({ chat_id: 42 })
console.log(link.url)  // "https://kappelas.com/invite/aBcD123xyz"

// Single-use link
const once = await bot.chats.createSingleUseInviteLink({ chat_id: 42 })

// Capped + expiring
const tmp = await bot.chats.createInviteLink({
  chat_id:    42,
  max_uses:   5,
  expires_in: '24h',  // '1h' | '24h' | '7d' | '30d' | 'never'
})

// List active links
const { invite_links } = await bot.chats.getInviteLinks({ chat_id: 42 })

// Revoke
await bot.chats.revokeInviteLink({ chat_id: 42, code: link.code })
```

New types exported: `ChatInviteLink`, `CreateChatInviteLinkParams`,
`GetChatInviteLinksParams`, `GetChatInviteLinksResult`,
`RevokeChatInviteLinkParams`, `RevokeChatInviteLinkResult`

---

#### 👥 Groups & channels — full support

Bots now receive messages from **groups and channels** in addition to private chats,
and can reply using the same `messages.send()` API.

**`msg.chat_type`** — new field on every incoming `Message`:

```ts
bot.on('message', async (msg) => {
  switch (msg.chat_type) {
    case 'private':
      // 1-on-1 — show keyboards, personalise
      break
    case 'group':
      // Multi-user — reply with a quote so context is clear
      await bot.messages.send({
        chat_id:     msg.chat_id,
        text:        '✅ Got it!',
        reply_to_id: msg.id,   // quotes the original message
      })
      break
    case 'channel':
      // Admin-only broadcast — no user replies expected
      break
  }
})
```

`reply_to_id` (already supported) works identically in groups and private chats.

New field added to `Message`: `chat_type?: ChatType`

---

#### 🗂️ `chats.getMyGroups()`

Returns every group and channel the bot is a member of, together with the
bot's own **role** (`"admin"` or `"member"`) in each. Useful to discover which
groups the bot can manage (e.g. create invite links).

```ts
const { groups } = await bot.chats.getMyGroups()
// [{ chat_id: 138, type: "group", title: "My Team", participant_count: 12, bot_role: "admin" }]

const adminGroups = groups.filter(g => g.bot_role === 'admin')
console.log(`Bot is admin in ${adminGroups.length} group(s)`)

for (const g of groups) {
  if (g.bot_role === 'admin') {
    const link = await bot.chats.createInviteLink({ chat_id: g.chat_id })
    console.log(`${g.title}: ${link.url}`)
  }
}
```

New types exported: `BotGroupEntry`, `GetMyGroupsResult`, `ParticipantRole`

---

#### 🏷️ `Participant.role`

The `role` field (`"member" | "admin"`) is now present on participants returned
by `chats.list()` for groups and channels. It is absent on private chat participants.

```ts
const { chats } = await bot.chats.list()
const group = chats.find(c => c.type === 'group')
const me = group?.participants.find(p => p.is_bot)
console.log(me?.role)  // "admin" | "member"
```

---

### Fixed

- `EditMessageParams.new_extra_data` is now typed `ReplyMarkup | null` instead of
  `unknown` — full autocomplete when replacing an inline keyboard.

---

### Backend (internal, affects all SDK consumers)

> These changes are transparent to SDK users but document what was fixed
> server-side as part of this release.

- **`chat_type` dispatched to bots** — the bot-service consumer now enriches every
  outgoing message event (webhook and WebSocket) with the conversation type
  (`private | group | channel`). Previously, bots could not distinguish message
  origin without an extra API call.

- **Duplicate webhook dispatch fixed** — a copy-paste bug caused user webhooks to
  fire **twice** per message. Removed the redundant loop in the Kafka consumer.

- **`isBotAdmin` decode fixed** — the participants endpoint returns a bare JSON array;
  the previous wrapper-struct decode silently yielded 0 participants, making every
  admin check fail with 503.

- **Invite link timestamps** — `created_at` and `expires_at` on `ChatInviteLink`
  were returned as ISO 8601 strings by the backend; they are now Unix timestamps
  (seconds, `number`) matching the SDK type declaration.

- **New internal endpoint** `GET /internal/conversations/{id}/members` — returns
  `[{ user_id, role }]` for service-to-service role checks without exposing the
  public API.
