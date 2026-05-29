/**
 * examples/menu-bot.mjs
 *
 * Bot de menu complet — démontre :
 *   - Scroll keyboard (chips persistants)
 *   - Inline keyboard avec confirmation
 *   - Carousel de produits avec gestion des clics
 *   - Formatage de texte (bold, italic, code, blockquote)
 *   - Gestion des groupes vs conversations privées
 *   - Gestion d'erreurs avec KappelaError
 *
 * Usage :
 *   KAPPELA_TOKEN=your_token node examples/menu-bot.mjs
 *
 * Install :
 *   npm install @kappelas/sdk
 */

import { KappelaBot, KappelaError } from '@kappelas/sdk'

const TOKEN = process.env.KAPPELA_TOKEN
if (!TOKEN) {
  console.error('Missing KAPPELA_TOKEN environment variable')
  process.exit(1)
}

const bot = new KappelaBot({ token: TOKEN })

// ── Produits (données statiques pour l'exemple) ────────────────────────────────

const PRODUCTS = [
  { id: 'prod_1', title: 'Widget Pro',   subtitle: '24,99 €', image_url: 'https://example.com/widget-pro.jpg',   button_text: 'Acheter' },
  { id: 'prod_2', title: 'Widget Ultra', subtitle: '49,99 €', image_url: 'https://example.com/widget-ultra.jpg', button_text: 'Acheter' },
  { id: 'prod_3', title: 'Widget Max',   subtitle: '99,99 €', image_url: 'https://example.com/widget-max.jpg',   button_text: 'Acheter' },
]

// ── Navigation principale ──────────────────────────────────────────────────────

const NAV_KEYBOARD = {
  scroll_keyboard: [
    { text: '🛒 Catalogue',  callback_data: 'menu_catalogue' },
    { text: '❓ Aide',       callback_data: 'menu_help'      },
    { text: '⚙️ Mon compte', callback_data: 'menu_account'   },
  ],
}

// ── Message handler ────────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text) return

  const isGroup   = msg.chat_type === 'group'
  const isPrivate = msg.chat_type === 'private'

  // /start — accueil + menu de navigation
  if (msg.text === '/start' && isPrivate) {
    await bot.messages.send({
      chat_id:      msg.chat_id,
      text:         [
        `👋 Bonjour **${msg.sender_name ?? 'ami'}** !`,
        '',
        'Je suis le bot exemple Kappela.',
        'Utilise les boutons ci-dessous pour naviguer.',
      ].join('\n'),
      reply_markup: NAV_KEYBOARD,
    })
    return
  }

  // /catalogue — dans un groupe, répond avec une citation
  if (msg.text === '/catalogue') {
    await bot.messages.sendCarousel({
      chat_id:             msg.chat_id,
      text:                '🛍️ Voici notre catalogue :',
      carousel:            PRODUCTS,
      quick_reply_buttons: [
        { text: '➕ Voir plus', callback_data: 'show_more'  },
        { text: '✖ Fermer',    callback_data: 'close_menu' },
      ],
      reply_to_id:    isGroup ? msg.id : undefined,
      delete_previous: true,
    })
    return
  }

  // /aide
  if (msg.text === '/aide' || msg.text === '/help') {
    await bot.messages.send({
      chat_id:      msg.chat_id,
      text:         [
        '*Commandes disponibles*',
        '',
        '`/start`     — menu principal _(privé uniquement)_',
        '`/catalogue` — afficher le catalogue',
        '`/aide`      — cette aide',
      ].join('\n'),
      reply_to_id: isGroup ? msg.id : undefined,
    })
    return
  }

  // Dans un groupe — ignorer les messages non-commandes
  if (isGroup) return

  // En privé — répondre avec le menu si le texte n'est pas une commande connue
  await bot.messages.send({
    chat_id:      msg.chat_id,
    text:         'Je ne comprends pas. Utilise `/aide` pour voir les commandes disponibles.',
    reply_markup: NAV_KEYBOARD,
  })
})

// ── Callback query handler ─────────────────────────────────────────────────────

bot.on('callback_query', async (cb) => {

  // Navigation principale
  if (cb.callback_data === 'menu_catalogue') {
    await bot.messages.sendCarousel({
      chat_id:             cb.chat_id,
      text:                '🛍️ Notre catalogue :',
      carousel:            PRODUCTS,
      quick_reply_buttons: [
        { text: '➕ Voir plus', callback_data: 'show_more'  },
        { text: '✖ Fermer',    callback_data: 'close_menu' },
      ],
      delete_previous: true,
    })
    return
  }

  if (cb.callback_data === 'menu_help') {
    await bot.messages.send({
      chat_id:         cb.chat_id,
      text:            'Type `/aide` pour voir toutes les commandes.',
      delete_previous: true,
    })
    return
  }

  if (cb.callback_data === 'menu_account') {
    await bot.messages.send({
      chat_id:         cb.chat_id,
      text:            '> Fonctionnalité à venir…\n\nTon compte sera géré ici bientôt.',
      reply_markup:    NAV_KEYBOARD,
      delete_previous: true,
    })
    return
  }

  if (cb.callback_data === 'close_menu') {
    await bot.messages.send({
      chat_id:         cb.chat_id,
      text:            '✅ Menu fermé.',
      reply_markup:    NAV_KEYBOARD,
      delete_previous: true,
    })
    return
  }

  // Clic sur un bouton de carousel — cb.callback_data === product.id
  const product = PRODUCTS.find(p => p.id === cb.callback_data)
  if (product) {
    await bot.messages.send({
      chat_id:      cb.chat_id,
      text:         [
        `🛒 *${product.title}*`,
        `Prix : **${product.subtitle}**`,
        '',
        'Confirmer l\'achat ?',
      ].join('\n'),
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Confirmer', callback_data: `confirm_${product.id}` },
          { text: '❌ Annuler',   callback_data: 'cancel_purchase'       },
        ]],
      },
    })
    return
  }

  // Confirmation d'achat
  if (cb.callback_data.startsWith('confirm_')) {
    const productId = cb.callback_data.replace('confirm_', '')
    const prod = PRODUCTS.find(p => p.id === productId)

    // Supprimer les boutons de confirmation après le clic
    await bot.messages.edit({
      chat_id:        cb.chat_id,
      message_id:     /* message_id non disponible sur callback_query — utilise delete_previous */ 0,
      new_extra_data: null,   // retire le clavier inline
    }).catch(() => {})        // ignore si le message n'est plus accessible

    await bot.messages.send({
      chat_id: cb.chat_id,
      text:    `✅ Commande confirmée pour **${prod?.title ?? productId}** !\nRéférence : \`ORD-${Date.now()}\``,
    })
    return
  }

  if (cb.callback_data === 'cancel_purchase') {
    await bot.messages.send({
      chat_id:         cb.chat_id,
      text:            '❌ Achat annulé.',
      reply_markup:    NAV_KEYBOARD,
      delete_previous: true,
    })
    return
  }
})

// ── Gestion d'erreurs ──────────────────────────────────────────────────────────

bot.on('error', (err) => {
  if (err instanceof KappelaError) {
    console.error(`[${err.error_code}] ${err.message}`)
  } else {
    console.error('Unexpected error:', err)
  }
})

// ── Lifecycle ──────────────────────────────────────────────────────────────────

bot.on('connected',    ()     => console.log('✅ Bot connecté'))
bot.on('disconnected', (code) => console.log(`⚠️  Déconnecté (code ${code})`))

bot.start()
console.log('Bot démarrage…')
