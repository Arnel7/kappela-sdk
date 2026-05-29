/**
 * test-bot.mjs — suite de tests complète du SDK Kappela (bots)
 *
 * Usage :
 *   node test-bot.mjs <TOKEN> [PRIVATE_CHAT_ID]
 *   KAPPELA_TOKEN=xxx CHAT_ID=130 node test-bot.mjs
 *
 * Ce fichier teste :
 *   - Connexion WebSocket
 *   - Profil bot
 *   - Chats : list, iterate, getMyGroups
 *   - Messages : texte, formatage riche, photo, vidéo, document, audio, carousel
 *   - Keyboards : inline, reply, scroll (formes courte + longue + mixte)
 *   - reply_to_id (citation)
 *   - delete_previous
 *   - Edit / Delete
 *   - Typing indicator
 *   - Webhooks : getInfo, set (skippé si pas de domaine public), delete
 *   - Invite links (admin only — skippé si pas de groupe admin)
 *   - Gestion membres : getAdministrators, getMember (lecture seule — les writes
 *     restent en section optionnelle pour ne pas perturber un vrai groupe)
 *   - Gestion groupes : envoi dans le groupe, reply_to_id, carousel dans groupe
 */

import { KappelaBot, KappelaError } from '@kappelas/sdk'

// ─── Config ──────────────────────────────────────────────────────────────────

const TOKEN   = process.env.KAPPELA_TOKEN || process.argv[2]
const CHAT_ID = Number(process.env.CHAT_ID   || process.argv[3] || 130)

if (!TOKEN) {
  console.error('Usage: node test-bot.mjs <TOKEN> [CHAT_ID]')
  process.exit(1)
}

// ─── Fichiers binaires de test ────────────────────────────────────────────────

// PNG 1×1 transparent (68 bytes)
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

// WAV silence PCM 16bit 44100Hz mono
const WAV = Buffer.from(
  '52494646' + '26000000' + '57415645' +
  '666d7420' + '10000000' + '01000100' + '44ac0000' + '88580100' + '02001000' +
  '64617461' + '02000000' + '0000',
  'hex',
)

// PDF minimal valide
const PDF = Buffer.from(
  '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj ' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
  '3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
  '0000000058 00000 n\n0000000115 00000 n\n' +
  'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF',
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PASS = '✓'
const FAIL = '✗'
const SKIP = '⊘'
const INFO = 'ℹ'

let passed = 0, failed = 0, skipped = 0

function ok(label, data)  {
  passed++
  console.log(`  [${PASS}] ${label}`, data != null ? JSON.stringify(data).slice(0, 120) : '')
}
function fail(label, e) {
  failed++
  if (e instanceof KappelaError) {
    console.error(`  [${FAIL}] ${label} → KappelaError ${e.error_code} (${e.status}): ${e.message}`)
  } else {
    console.error(`  [${FAIL}] ${label} →`, e?.message ?? e)
  }
}
function skip(label, reason) {
  skipped++
  console.log(`  [${SKIP}] ${label} — ${reason}`)
}

async function run(label, fn) {
  process.stdout.write(`\n→ ${label}\n`)
  try {
    const result = await fn()
    ok('OK', result)
    return result
  } catch (e) {
    fail('FAIL', e)
    return null
  }
}

async function runExpectError(label, code, fn) {
  process.stdout.write(`\n→ ${label} (attendu : ${code})\n`)
  try {
    await fn()
    fail('FAIL — aurait dû lancer une erreur', null)
    return false
  } catch (e) {
    if (e instanceof KappelaError && e.error_code === code) {
      ok(`KappelaError ${e.error_code} reçue comme attendu`)
      return true
    }
    fail('FAIL — mauvaise erreur', e)
    return false
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

// ─── Connexion ────────────────────────────────────────────────────────────────

const bot = new KappelaBot({ token: TOKEN })

await new Promise((resolve, reject) => {
  bot.once('connected', resolve)
  bot.once('error', reject)
  bot.start()
  setTimeout(() => reject(new Error('Timeout connexion (10s)')), 10_000)
})

console.log(`\n[${PASS}] Connecté — chat_id cible : ${CHAT_ID}`)
console.log(`[${INFO}] bot.connected = ${bot.connected}`)

// ═════════════════════════════════════════════════════════════════════════════
section('1. PROFIL')
// ═════════════════════════════════════════════════════════════════════════════

const profile = await run('profile.get()', () => bot.profile.get())

// ═════════════════════════════════════════════════════════════════════════════
section('2. CHATS')
// ═════════════════════════════════════════════════════════════════════════════

await run('chats.list({ limit: 5 })', () => bot.chats.list({ limit: 5 }))

await run('chats.list() — avec offset', () => bot.chats.list({ limit: 3, offset: 1 }))

// iterate() — on vérifie juste le premier item
await run('chats.iterate() — premier chat', async () => {
  for await (const chat of bot.chats.iterate(1)) {
    return { chat_id: chat.chat_id, type: chat.type, title: chat.title }
  }
  throw new Error('aucun chat retourné')
})

// getMyGroups
const myGroups = await run('chats.getMyGroups()', () => bot.chats.getMyGroups())
const adminGroup = myGroups?.groups?.find(g => g.bot_role === 'admin')
const anyGroup   = myGroups?.groups?.[0]

if (adminGroup) {
  console.log(`\n  [${INFO}] Groupe admin trouvé : chat_id=${adminGroup.chat_id} "${adminGroup.title}"`)
} else {
  console.log(`\n  [${INFO}] Aucun groupe admin — certains tests seront ignorés`)
}

// ═════════════════════════════════════════════════════════════════════════════
section('3. TEXTE SIMPLE + FORMATAGE')
// ═════════════════════════════════════════════════════════════════════════════

// Texte nu
const sentPlain = await run('messages.send() — texte simple', () =>
  bot.messages.send({ chat_id: CHAT_ID, text: '👋 Test SDK — texte simple' }),
)

// Gras / italique / barré / code inline
await run('messages.send() — gras, italique, barré', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text: '*gras*  __italique__  ~barré~  `code inline`',
  }),
)

// Bloc code (carte + bouton copier)
await run('messages.send() — bloc code', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text: 'Votre clé API :\n```\nsk_live_test_abc123xyz\n```',
  }),
)

// Citation blockquote
await run('messages.send() — citation (>)', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text: '> Question originale de l\'utilisateur\n\nVoici la réponse détaillée.',
  }),
)

// Mention + commande
await run('messages.send() — mention + commande', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text: 'Merci @test ! Tape /help pour voir les commandes disponibles.',
  }),
)

// Lien auto-détecté
await run('messages.send() — lien auto-détecté', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text: 'Visitez kappelas.com ou https://kappelas.com/docs',
  }),
)

// Combinaison complète
await run('messages.send() — formatage combiné', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text: [
      '🛒 *Récapitulatif commande*',
      '',
      '> Widget A × 2',
      '',
      'Total : **49,98 €**',
      'Statut : `CONFIRMÉ`',
      '',
      'Questions ? contact@example.com ou /help',
    ].join('\n'),
  }),
)

// ═════════════════════════════════════════════════════════════════════════════
section('4. REPLY_TO_ID (CITATION DE MESSAGE)')
// ═════════════════════════════════════════════════════════════════════════════

if (sentPlain?.message_id) {
  await run('messages.send() — reply_to_id cite le message précédent', () =>
    bot.messages.send({
      chat_id:     CHAT_ID,
      text:        '↩️ Réponse avec citation du message précédent',
      reply_to_id: sentPlain.message_id,
    }),
  )
} else {
  skip('messages.send() — reply_to_id', 'message de référence absent')
}

// ═════════════════════════════════════════════════════════════════════════════
section('4B. BOT.REPLY()')
// ═════════════════════════════════════════════════════════════════════════════

// bot.reply(msg) — avec citation automatique
if (sentPlain?.message_id) {
  const fakeMsg = { id: sentPlain.message_id, chat_id: CHAT_ID }
  await run('bot.reply(msg, text) — cite le message automatiquement', () =>
    bot.reply(fakeMsg, '↩️ bot.reply(msg) — reply_to_id injecté automatiquement'),
  )

  await run('bot.reply(msg, text, opts) — avec reply_markup', () =>
    bot.reply(fakeMsg, 'bot.reply() avec clavier inline :', {
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ OK',     callback_data: 'reply_ok'     },
          { text: '❌ Annuler', callback_data: 'reply_cancel' },
        ]],
      },
    }),
  )
} else {
  skip('bot.reply(msg)', 'message de référence absent')
}

// bot.reply(cb) — callback_query, pas de citation
const fakeCb = {
  chat_id:         CHAT_ID,
  sender_id:       'test-uuid',
  sender_nom:      'Test User',
  sender_username: 'testuser',
  callback_data:   'test_cb',
  sent_at:         Math.floor(Date.now() / 1000),
}
await run('bot.reply(cb, text) — callback_query, sans reply_to_id', () =>
  bot.reply(fakeCb, '↩️ bot.reply(cb) — envoyé sans citation (callback_query)'),
)

// ═════════════════════════════════════════════════════════════════════════════
section('5. KEYBOARDS')
// ═════════════════════════════════════════════════════════════════════════════

// Inline keyboard
const sentInline = await run('messages.send() — inline keyboard', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text:    'Test inline keyboard :',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Oui', callback_data: 'yes' },
        { text: '❌ Non', callback_data: 'no'  },
      ], [
        { text: '🌐 Site', url: 'https://kappelas.com' },
      ]],
    },
  }),
)

// Reply keyboard — forme courte (string)
await run('messages.send() — reply keyboard (strings)', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text:    'Test reply keyboard (forme courte) :',
    reply_markup: {
      keyboard: [['Option A', 'Option B'], ['Annuler']],
    },
  }),
)

// Reply keyboard — forme longue (objet {text, callback_data})
await run('messages.send() — reply keyboard (objets)', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text:    'Test reply keyboard (forme longue) :',
    reply_markup: {
      keyboard: [[
        { text: '✅ Oui', callback_data: 'confirm_yes' },
        { text: '❌ Non', callback_data: 'confirm_no'  },
      ], [
        { text: '↩ Annuler', callback_data: 'cancel' },
      ]],
    },
  }),
)

// Reply keyboard — forme mixte (string + objet)
await run('messages.send() — reply keyboard (mixte)', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text:    'Test reply keyboard (mixte) :',
    reply_markup: {
      keyboard: [[
        { text: '✅ Confirmer', callback_data: 'confirm' },
        'Aide',
      ]],
    },
  }),
)

// Scroll keyboard — forme courte
await run('messages.send() — scroll keyboard (strings)', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text:    'Test scroll keyboard (forme courte) :',
    reply_markup: {
      scroll_keyboard: ['📦 Commandes', '❓ Aide', '⚙️ Paramètres'],
    },
  }),
)

// Scroll keyboard — forme longue (objet {text, callback_data})
await run('messages.send() — scroll keyboard (objets)', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text:    'Test scroll keyboard (forme longue) :',
    reply_markup: {
      scroll_keyboard: [
        { text: '📦 Commandes',  callback_data: 'menu_orders'   },
        { text: '❓ Aide',       callback_data: 'menu_help'     },
        { text: '⚙️ Paramètres', callback_data: 'menu_settings' },
      ],
    },
  }),
)

// Scroll keyboard — forme mixte
await run('messages.send() — scroll keyboard (mixte)', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text:    'Test scroll keyboard (mixte) :',
    reply_markup: {
      scroll_keyboard: [
        { text: '📦 Commandes', callback_data: 'menu_orders' },
        '❓ Aide',
      ],
    },
  }),
)

// ═════════════════════════════════════════════════════════════════════════════
section('6. MÉDIAS')
// ═════════════════════════════════════════════════════════════════════════════

await run('messages.sendTyping() — show', () =>
  bot.messages.sendTyping({ chat_id: CHAT_ID, is_typing: true }),
)
await run('messages.sendTyping() — hide', () =>
  bot.messages.sendTyping({ chat_id: CHAT_ID, is_typing: false }),
)

await run('messages.sendPhoto()', () =>
  bot.messages.sendPhoto({
    chat_id: CHAT_ID,
    photo:   { data: PNG, filename: 'test.png', contentType: 'image/png' },
    caption: '🖼 Photo test depuis le SDK',
  }),
)

await run('messages.sendDocument()', () =>
  bot.messages.sendDocument({
    chat_id:  CHAT_ID,
    document: { data: PDF, filename: 'test.pdf', contentType: 'application/pdf' },
    caption:  '📄 Document PDF test',
  }),
)

await run('messages.sendAudio()', () =>
  bot.messages.sendAudio({
    chat_id: CHAT_ID,
    audio:   { data: WAV, filename: 'test.wav', contentType: 'audio/wav' },
    caption: '🔊 Audio test',
  }),
)

// sendVideo — avec Buffer wrapper (même structure que sendPhoto)
await run('messages.sendVideo()', () =>
  bot.messages.sendVideo({
    chat_id: CHAT_ID,
    video:   { data: PNG, filename: 'test.mp4', contentType: 'video/mp4' },
    caption: '🎬 Vidéo test (PNG utilisé comme placeholder)',
  }),
)

// FileInput forme URL string — une seule méthode suffit à valider le chemin SDK
await run('messages.sendPhoto() — FileInput forme URL string', () =>
  bot.messages.sendPhoto({
    chat_id: CHAT_ID,
    photo:   'https://httpbin.org/image/jpeg',
    caption: '🖼 Photo via URL (SDK fetch automatique)',
  }),
)

// Photo avec reply_to_id
if (sentPlain?.message_id) {
  await run('messages.sendPhoto() — avec reply_to_id', () =>
    bot.messages.sendPhoto({
      chat_id:     CHAT_ID,
      photo:       { data: PNG, filename: 'test.png', contentType: 'image/png' },
      caption:     '🖼 Photo en réponse',
      reply_to_id: sentPlain.message_id,
    }),
  )
}

// ═════════════════════════════════════════════════════════════════════════════
section('7. CAROUSEL')
// ═════════════════════════════════════════════════════════════════════════════

await run('messages.sendCarousel() — quick_reply strings', () =>
  bot.messages.sendCarousel({
    chat_id: CHAT_ID,
    text:    '🛍 Nos produits :',
    carousel: [
      { id: 'p1', title: 'Widget A', subtitle: '9,99 €',  button_text: 'Acheter' },
      { id: 'p2', title: 'Widget B', subtitle: '19,99 €', button_text: 'Acheter' },
    ],
    quick_reply_buttons: ['Voir plus', 'Annuler'],
  }),
)

await run('messages.sendCarousel() — quick_reply objets {text, callback_data}', () =>
  bot.messages.sendCarousel({
    chat_id: CHAT_ID,
    text:    '🛍 Sélection :',
    carousel: [
      { id: 'p3', title: 'Widget C', subtitle: '4,99 €', button_text: 'Commander' },
    ],
    quick_reply_buttons: [
      { text: '✅ Confirmer', callback_data: 'confirm' },
      { text: '❌ Annuler',  callback_data: 'cancel'  },
    ],
  }),
)

// Carousel avec reply_to_id
if (sentPlain?.message_id) {
  await run('messages.sendCarousel() — avec reply_to_id', () =>
    bot.messages.sendCarousel({
      chat_id:     CHAT_ID,
      text:        '↩️ Voici les produits en lien avec ta question :',
      carousel: [
        { id: 'p4', title: 'Offre spéciale', subtitle: '2,99 €', button_text: 'Commander' },
      ],
      reply_to_id: sentPlain.message_id,
    }),
  )
}

// ═════════════════════════════════════════════════════════════════════════════
section('8. EDIT / DELETE')
// ═════════════════════════════════════════════════════════════════════════════

// Envoyer un message à éditer
const toEdit = await run('messages.send() — message à éditer', () =>
  bot.messages.send({
    chat_id: CHAT_ID,
    text:    '📝 Message original (sera modifié)',
    reply_markup: {
      inline_keyboard: [[{ text: '🔴 Avant', callback_data: 'before' }]],
    },
  }),
)

if (toEdit?.message_id) {
  await run('messages.edit() — nouveau texte', () =>
    bot.messages.edit({
      chat_id:    CHAT_ID,
      message_id: toEdit.message_id,
      new_text:   '✅ Message modifié avec succès',
    }),
  )

  await run('messages.edit() — inline keyboard uniquement', () =>
    bot.messages.edit({
      chat_id:        CHAT_ID,
      message_id:     toEdit.message_id,
      new_extra_data: {
        inline_keyboard: [[{ text: '🟢 Après', callback_data: 'after' }]],
      },
    }),
  )
}

// Supprimer le message texte simple du début
if (sentPlain?.message_id) {
  await run(`messages.delete() — message_id=${sentPlain.message_id}`, () =>
    bot.messages.delete({ chat_id: CHAT_ID, message_id: sentPlain.message_id }),
  )
}

// ═════════════════════════════════════════════════════════════════════════════
section('9. DELETE_PREVIOUS')
// ═════════════════════════════════════════════════════════════════════════════

const dp1 = await run('messages.send() — message 1 (sera remplacé)', () =>
  bot.messages.send({ chat_id: CHAT_ID, text: '⏳ Message temporaire 1' }),
)

if (dp1?.message_id) {
  await run('messages.send() — delete_previous=true efface le précédent', () =>
    bot.messages.send({
      chat_id:         CHAT_ID,
      text:            '✅ Remplace le message précédent (delete_previous)',
      delete_previous: true,
    }),
  )
}

// ═════════════════════════════════════════════════════════════════════════════
section('10. WEBHOOKS')
// ═════════════════════════════════════════════════════════════════════════════

await run('webhooks.getInfo()', () => bot.webhooks.getInfo())

// set/delete : on skip en l'absence d'un serveur public réel
skip('webhooks.set()', 'nécessite un serveur HTTPS public — skippé en local')
skip('webhooks.delete()', 'skippé (aucun webhook actif à supprimer)')

// ═════════════════════════════════════════════════════════════════════════════
section('11. MEMBRES DU GROUPE (lecture seule)')
// ═════════════════════════════════════════════════════════════════════════════

if (!anyGroup) {
  skip('chats.getAdministrators()', 'aucun groupe trouvé')
  skip('chats.getMember()',          'aucun groupe trouvé')
} else {
  const gid = anyGroup.chat_id

  const adminsResult = await run(`chats.getAdministrators({ chat_id: ${gid} })`, () =>
    bot.chats.getAdministrators({ chat_id: gid }),
  )

  // getMember sur l'un des admins trouvés
  const firstAdmin = adminsResult?.admins?.[0]
  if (firstAdmin?.user_id) {
    await run(`chats.getMember({ chat_id: ${gid}, user_id: ${firstAdmin.user_id.slice(0,8)}… })`, () =>
      bot.chats.getMember({ chat_id: gid, user_id: firstAdmin.user_id }),
    )
  } else {
    skip('chats.getMember()', 'aucun admin trouvé pour tester')
  }

  // getMember sur un user_id inexistant → doit lever NOT_FOUND
  await runExpectError(
    'chats.getMember() — user inexistant → NOT_FOUND',
    'NOT_FOUND',
    () => bot.chats.getMember({ chat_id: gid, user_id: '00000000-0000-0000-0000-000000000000' }),
  )
}

// ═════════════════════════════════════════════════════════════════════════════
section('12. INVITE LINKS (admin requis)')
// ═════════════════════════════════════════════════════════════════════════════

if (!adminGroup) {
  skip('chats.createInviteLink()',          'aucun groupe admin')
  skip('chats.createSingleUseInviteLink()', 'aucun groupe admin')
  skip('chats.getInviteLinks()',            'aucun groupe admin')
  skip('chats.revokeInviteLink()',          'aucun groupe admin')
} else {
  const gid = adminGroup.chat_id

  const perm = await run('chats.createInviteLink() — permanent illimité', () =>
    bot.chats.createInviteLink({ chat_id: gid }),
  )

  const single = await run('chats.createSingleUseInviteLink() — usage unique', () =>
    bot.chats.createSingleUseInviteLink({ chat_id: gid }),
  )

  await run('chats.createInviteLink() — max_uses=5, expires_in=24h', () =>
    bot.chats.createInviteLink({ chat_id: gid, max_uses: 5, expires_in: '24h' }),
  )

  await run('chats.getInviteLinks() — liste les liens actifs', () =>
    bot.chats.getInviteLinks({ chat_id: gid }),
  )

  if (perm?.code) {
    await run(`chats.revokeInviteLink() — permanent code=${perm.code}`, () =>
      bot.chats.revokeInviteLink({ chat_id: gid, code: perm.code }),
    )
  }

  if (single?.code) {
    await run(`chats.revokeInviteLink() — single-use code=${single.code}`, () =>
      bot.chats.revokeInviteLink({ chat_id: gid, code: single.code }),
    )
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('13. MESSAGES DANS LE GROUPE')
// ═════════════════════════════════════════════════════════════════════════════

if (!anyGroup) {
  skip('envoi dans le groupe', 'aucun groupe trouvé')
} else {
  const gid = anyGroup.chat_id
  console.log(`\n  [${INFO}] Groupe cible : chat_id=${gid} "${anyGroup.title}"`)

  // Texte simple
  const groupMsg = await run(`messages.send() — texte dans groupe ${gid}`, () =>
    bot.messages.send({ chat_id: gid, text: '👋 Test SDK — message dans le groupe' }),
  )

  if (groupMsg?.message_id) {
    // Reply avec citation
    await run('messages.send() — reply_to_id dans le groupe', () =>
      bot.messages.send({
        chat_id:     gid,
        text:        '↩️ Réponse avec citation dans le groupe',
        reply_to_id: groupMsg.message_id,
      }),
    )

    // Photo dans le groupe avec citation
    await run('messages.sendPhoto() — groupe avec reply_to_id', () =>
      bot.messages.sendPhoto({
        chat_id:     gid,
        photo:       { data: PNG, filename: 'test.png', contentType: 'image/png' },
        caption:     '🖼 Photo dans le groupe',
        reply_to_id: groupMsg.message_id,
      }),
    )

    // Carousel sans citation
    await run('messages.sendCarousel() — groupe sans reply_to_id', () =>
      bot.messages.sendCarousel({
        chat_id: gid,
        text:    '🛍 Nos produits :',
        carousel: [
          { id: 'g1', title: 'Produit A', subtitle: '9,99 €',  button_text: 'Voir' },
          { id: 'g2', title: 'Produit B', subtitle: '19,99 €', button_text: 'Voir' },
        ],
        quick_reply_buttons: ['Voir plus', 'Annuler'],
      }),
    )

    // Carousel avec citation dans le groupe
    await run('messages.sendCarousel() — groupe avec reply_to_id', () =>
      bot.messages.sendCarousel({
        chat_id:     gid,
        text:        '↩️ Voici notre sélection en réponse :',
        carousel: [
          { id: 'g3', title: 'Offre spéciale', subtitle: '4,99 €', button_text: 'Commander' },
        ],
        quick_reply_buttons: [
          { text: '✅ Confirmer', callback_data: 'confirm' },
          { text: '❌ Annuler',  callback_data: 'cancel'  },
        ],
        reply_to_id: groupMsg.message_id,
      }),
    )

    // Inline keyboard dans le groupe
    await run('messages.send() — inline keyboard dans le groupe', () =>
      bot.messages.send({
        chat_id: gid,
        text:    'Boutons inline dans le groupe :',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Oui', callback_data: 'group_yes' },
            { text: '❌ Non', callback_data: 'group_no'  },
          ]],
        },
      }),
    )
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('14. HANDLEWEBHOOK (mode production)')
// ═════════════════════════════════════════════════════════════════════════════

// Simule la réception d'un payload webhook HTTP (identique à ce qu'envoie le serveur)
await run('bot.handleWebhook() — payload message', async () => {
  const receivedEvents = []
  const handler = (msg) => receivedEvents.push(msg)
  bot.on('message', handler)

  // Format plat envoyé par le backend Kappela (différent du format WS)
  const fakePayload = {
    type:       'text',
    chat_id:    CHAT_ID,
    message_id: 999,
    sender_id:  'test-user-uuid',
    text:       'webhook test',
    sent_at:    Math.floor(Date.now() / 1000),
    extra_data: null,
  }

  bot.handleWebhook(fakePayload)
  await new Promise(r => setTimeout(r, 50))  // laisser l'event loop drainer
  bot.off('message', handler)

  if (receivedEvents.length !== 1) throw new Error(`attendu 1 event, reçu ${receivedEvents.length}`)
  if (receivedEvents[0].text !== 'webhook test') throw new Error('texte incorrect')
  return { events_received: receivedEvents.length, text: receivedEvents[0].text }
})

await run('bot.handleWebhook() — payload callback_query', async () => {
  const receivedCbs = []
  const handler = (cb) => receivedCbs.push(cb)
  bot.on('callback_query', handler)

  // Format plat envoyé par le backend (type: 'callback', pas 'callback_query')
  bot.handleWebhook({
    type:            'callback',
    chat_id:         CHAT_ID,
    sender_id:       'test-user-uuid',
    sender_nom:      'Test User',
    sender_username: 'testuser',
    callback_data:   'webhook_cb_test',
    sent_at:         Math.floor(Date.now() / 1000),
  })

  await new Promise(r => setTimeout(r, 50))
  bot.off('callback_query', handler)

  if (receivedCbs.length !== 1) throw new Error(`attendu 1 callback, reçu ${receivedCbs.length}`)
  if (receivedCbs[0].callback_data !== 'webhook_cb_test') throw new Error('callback_data incorrect')
  return { events_received: receivedCbs.length, callback_data: receivedCbs[0].callback_data }
})

// ═════════════════════════════════════════════════════════════════════════════
section('15. GESTION ERREURS')
// ═════════════════════════════════════════════════════════════════════════════

await runExpectError(
  'messages.send() vers chat_id invalide → FORBIDDEN',
  'FORBIDDEN',
  () => bot.messages.send({ chat_id: -999999, text: 'test' }),
)

// L'API retourne succès silencieux sur delete d'un message inexistant — on vérifie juste que ça ne plante pas
await run('messages.delete() message inexistant — pas d\'erreur levée', () =>
  bot.messages.delete({ chat_id: CHAT_ID, message_id: 999999999 }),
)

await runExpectError(
  'chats.createInviteLink() sans être admin → FORBIDDEN',
  'FORBIDDEN',
  () => {
    // Utiliser le chat privé — le bot n'est pas admin d'un chat privé
    return bot.chats.createInviteLink({ chat_id: CHAT_ID })
  },
)

// Inspecter les champs de KappelaError
process.stdout.write('\n→ KappelaError — vérification des champs (error_code, status, message, hint, solutions, request_id, toString)\n')
try {
  await bot.messages.send({ chat_id: -999999, text: 'err fields test' })  // → FORBIDDEN
  fail('FAIL — aurait dû lancer une erreur', null)
} catch (e) {
  if (!(e instanceof KappelaError)) {
    fail('FAIL — pas une KappelaError', e)
  } else {
    const checks = {
      error_code: typeof e.error_code === 'string',
      status:     typeof e.status     === 'number',
      message:    typeof e.message    === 'string',
      toString:   typeof e.toString() === 'string' && e.toString().includes(e.error_code),
    }
    const allOk = Object.values(checks).every(Boolean)
    if (allOk) {
      ok('KappelaError fields', { error_code: e.error_code, status: e.status, hasMessage: !!e.message })
    } else {
      fail('KappelaError fields manquants', checks)
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Résumé
// ═════════════════════════════════════════════════════════════════════════════

bot.stop()

const total = passed + failed + skipped
console.log('\n' + '═'.repeat(60))
console.log(`  Résultats : ${passed} passés  ${failed} échoués  ${skipped} ignorés  (${total} total)`)
console.log('═'.repeat(60))

if (failed > 0) process.exit(1)
