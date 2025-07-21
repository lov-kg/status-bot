import makeWASocket, { useSingleFileAuthState, downloadContentFromMessage } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import P from "pino";
import fs from "fs";
import path from "path";

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false, // deprecated, handle QR yourself
  logger: P({ level: 'silent' }),
});

sock.ev.on('connection.update', (update) => {
  const { connection, lastDisconnect, qr } = update;

  if(qr) {
    console.log("Scan this QR code with your WhatsApp:");
    console.log(qr);  // You might want to use some QR terminal library to print it nicely
  }

  if(connection === 'close') {
    const shouldReconnect = (lastDisconnect.error instanceof Boom) && lastDisconnect.error.output.statusCode !== 401;
    console.log('Connection closed due to', lastDisconnect.error, ', reconnecting:', shouldReconnect);
    if(shouldReconnect) {
      startSock();
    } else {
      console.log('Connection closed. Exiting.');
      process.exit();
    }
  }

  if(connection === 'open') {
    console.log('✅ Bot Connected Successfully!');
  }
});

sock.ev.on('creds.update', saveState);

sock.ev.on('messages.upsert', async ({ messages, type }) => {
  const msg = messages[0];
  if(!msg.message) return;

  // Detect if it's a status message (statuses are on 'status@broadcast')
  msg.isStatus = msg.key.remoteJid === 'status@broadcast';

  // Get message text
  let text = '';
  if(msg.message.conversation) text = msg.message.conversation;
  else if(msg.message.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
  else if(msg.message.imageMessage?.caption) text = msg.message.imageMessage.caption;
  else if(msg.message.videoMessage?.caption) text = msg.message.videoMessage.caption;

  if(!text) return;

  // Check if message starts with .vv command
  if(text.startsWith('.vv')) {
    try {
      const command = await import('./commands/vv.js');
      await command.default(sock, msg);
    } catch (e) {
      console.log('Error running .vv command:', e);
    }
  }
});

console.log("Starting bot...");
