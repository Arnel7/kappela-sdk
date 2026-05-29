/**
 * examples/echo-bot.mjs
 *
 * Bot minimaliste — renvoie chaque message reçu en écho.
 * Démontre : connexion WebSocket, réception de messages, envoi de réponse.
 *
 * Usage :
 *   KAPPELA_TOKEN=your_token node examples/echo-bot.mjs
 *
 * Install :
 *   npm install @kappelas/sdk
 */

import { KappelaBot } from '@kappelas/sdk'

const TOKEN = process.env.KAPPELA_TOKEN
if (!TOKEN) {
  console.error('Missing KAPPELA_TOKEN environment variable')
  process.exit(1)
}

const bot = new KappelaBot({ token: TOKEN })

// ── Message handler ────────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text) return   // ignore images, stickers, system events, etc.

  const sender = msg.sender_name ?? 'someone'

  await bot.messages.send({
    chat_id:     msg.chat_id,
    text:        `Echo from ${sender}: ${msg.text}`,
    reply_to_id: msg.id,   // quote the original message
  })
})

// ── Callback query handler (inline button clicks) ──────────────────────────────

bot.on('callback_query', async (cb) => {
  await bot.messages.send({
    chat_id: cb.chat_id,
    text:    `You clicked: ${cb.callback_data}`,
  })
})

// ── Lifecycle ──────────────────────────────────────────────────────────────────

bot.on('connected',    ()      => console.log('✅ Connected'))
bot.on('disconnected', (code)  => console.log(`⚠️  Disconnected (${code})`))
bot.on('error',        (err)   => console.error('❌ Error:', err.message))

bot.start()
console.log('Bot starting…')
