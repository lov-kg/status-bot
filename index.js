import baileysPkg from '@whiskeysockets/baileys';
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = baileysPkg;

async function startBot() {
  // Auth state - this folder will store your session files
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  // Get latest version to avoid issues
  const { version, isLatest } = await fetchLatestBaileysVersion();

  // Create the socket connection
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // prints QR code to terminal once at startup
  });

  // Listen for credentials update, save them
  sock.ev.on('creds.update', saveCreds);

  // Connection update listener (logs connection status)
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR Code received, scan it with WhatsApp!');
      // optionally: show qr in terminal or send it somewhere else
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting?', shouldReconnect);
      if (shouldReconnect) {
        startBot(); // reconnect on unexpected close
      } else {
        console.log('Connection closed. You are logged out.');
      }
    } else if (connection === 'open') {
      console.log('✅ Bot Connected Successfully!');
    }
  });

  // Message listener example (simple echo)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    console.log('Message from:', sender, 'Text:', text);

    if (text.toLowerCase() === '.ping') {
      await sock.sendMessage(sender, { text: 'pong' });
    }
  });
}

// Start the bot
startBot().catch(err => console.error('Failed to start bot:', err));
