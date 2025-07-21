const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "vv",
  description: "Download WhatsApp status (image or video)",
  execute: async (sock, m, args) => {
    try {
      if (!m.quoted) return await sock.sendMessage(m.chat, { text: "❌ Reply to a status to download it!" });

      const msg = m.quoted.message;
      const type = Object.keys(msg)[0];

      if (!["imageMessage", "videoMessage"].includes(type)) {
        return await sock.sendMessage(m.chat, { text: "❌ This is not a status image or video!" });
      }

      const stream = await downloadContentFromMessage(msg[type], type.replace("Message", ""));
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const fileName = `status_${Date.now()}.${type === "imageMessage" ? "jpg" : "mp4"}`;
      fs.writeFileSync(fileName, buffer);

      await sock.sendMessage(m.chat, {
        [type === "imageMessage" ? "image" : "video"]: { url: fileName },
        caption: "✅ Status downloaded!"
      });

      setTimeout(() => fs.unlinkSync(fileName), 10000); // Delete after 10s
    } catch (err) {
      console.error(err);
      await sock.sendMessage(m.chat, { text: "❌ Failed to download status." });
    }
  }
};
