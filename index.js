const fs = require("fs");
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require("@whiskeysockets/baileys");

// === Load Commands Automatically ===
const commands = {};
fs.readdirSync("./commands").forEach((file) => {
  if (file.endsWith(".js")) {
    const cmd = require(`./commands/${file}`);
    commands[cmd.name] = cmd;
    console.log(`✅ Command Loaded: ${cmd.name}`);
  }
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || !m.key.remoteJid) return;

    const from = m.key.remoteJid;
    const type = Object.keys(m.message)[0];
    const body =
      (type === "conversation" && m.message.conversation) ||
      (type === "extendedTextMessage" && m.message.extendedTextMessage.text) ||
      "";

    if (!body.startsWith(".")) return;
    const args = body.trim().split(/ +/).slice(1);
    const commandName = body.slice(1).trim().split(/ +/)[0].toLowerCase();

    if (commands[commandName]) {
      console.log(`📥 Executing command: ${commandName}`);
      try {
        await commands[commandName].execute(sock, m, args);
      } catch (err) {
        console.error(err);
        await sock.sendMessage(from, { text: "❌ Error running command." });
      }
    }
  });
}

startBot();
