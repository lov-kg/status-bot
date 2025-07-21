const { downloadContentFromMessage, writeFile } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "vv",
  description: "Download WhatsApp status",
  execute: async (sock, m) => {
    try {
      if (!m.quoted) return await sock.sendMessage(m.chat, { text: "Reply to a status with .vv" }, { quoted: m });

      let msg = m.quoted;
      let mime = (msg.msg || msg).mimetype || "";

      if (!mime) return await sock.sendMessage(m.chat, { text: "This is not a media status." }, { quoted: m });

      let messageType = mime.split("/")[0];
      let stream = await downloadContentFromMessage(msg, messageType);
      let buffer = Buffer.from([]);

      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      let fileName = `status-${Date.now()}.${mime.split("/")[1]}`;
      fs.writeFileSync(fileName, buffer);

      await sock.sendMessage(m.chat, {
        [messageType]: fs.readFileSync(fileName),
        caption: "✅ Here’s the status!"
      }, { quoted: m });

      fs.unlinkSync(fileName);
    } catch (e) {
      console.log(e);
      await sock.sendMessage(m.chat, { text: "❌ Failed to download status." }, { quoted: m });
    }
  }
};
