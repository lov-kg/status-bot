const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const Pino = require("pino");
const fs = require("fs-extra");

async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: Pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;

    // When someone sends .vv command
    if (m.message.conversation === ".vv") {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return;

      let type = Object.keys(quoted)[0];
      let stream = await downloadContentFromMessage(quoted[type], type.includes("image") ? "image" : "video");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      fs.writeFileSync(`status.${type.includes("image") ? "jpg" : "mp4"}`, buffer);
      await sock.sendMessage(m.key.remoteJid, { [type.includes("image") ? "image" : "video"]: buffer }, { quoted: m });
    }
  });
}

connectBot();
