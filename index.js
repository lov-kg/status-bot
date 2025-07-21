const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const fs = require('fs');
const qrcode = require('qrcode');
const express = require('express');
const pino = require('pino');
const app = express();
const PORT = process.env.PORT || 3000;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // we disable terminal QR
        auth: state
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("✅ Generating QR, open in browser...");
            await qrcode.toFile('qr.png', qr); // Save as qr.png
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connection closed due to", lastDisconnect.error, "Reconnecting:", shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ Bot Connected Successfully!");
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

// Web server to show QR
app.get("/", (req, res) => {
    if (fs.existsSync("qr.png")) {
        res.send(`<h2>Scan this QR:</h2><img src="/qr" style="width:300px;height:300px;" />`);
    } else {
        res.send("No QR generated yet. Please wait...");
    }
});

app.get("/qr", (req, res) => {
    if (fs.existsSync("qr.png")) {
        res.sendFile(__dirname + "/qr.png");
    } else {
        res.send("No QR yet.");
    }
});

app.listen(PORT, () => console.log(`✅ Web QR Server Running on port ${PORT}`));

startBot();
