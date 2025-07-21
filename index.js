const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");
const Pino = require("pino");
const fs = require("fs-extra");
const qrcode = require("qrcode-terminal"); // to show QR in console

async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const sock = makeWASocket({
    auth: state,
    logger: Pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  // ✅ Handle QR code properly
  sock.ev.on("connection.update", ({ qr, connection, lastDisconnect }) => {
    if (qr) {
      console.clear();
      console.log("Scan this QR to connect:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") console.log("✅ Bot connected!");
    if (connection === "close") console.log("❌ Bot disconnected!");
  });

  // ✅ Status (.vv) command
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;

    if (m.message.conversation === ".vv") {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return;

      let type = Object.keys(quoted)[0];
      let stream = await downloadContentFromMessage(
        quoted[type],
        type.includes("image") ? "image" : "video"
      );
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      await sock.sendMessage(
        m.key.remoteJid,
        { [type.includes("image") ? "image" : "video"]: buffer },
        { quoted: m }
      );
    }
  });
}

connectBot();
