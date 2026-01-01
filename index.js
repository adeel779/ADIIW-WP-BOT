
const express = require('express');
const fs = require('fs');
const pino = require('pino');
const path = require('path');
const crypto = require('crypto');
const { default: makeWASocket, useMultiFileAuthState, delay, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const multer = require('multer');

const app = express();
const port = 50036;

const activeSessions = new Map();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionPath = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

const connectionStatus = new Map();

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MR KRIX - ADVANCED LOADER</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Roboto:wght@300;500&display=swap" rel="stylesheet">
  <style>
    body { min-height: 100vh; margin: 0; font-family: 'Roboto', sans-serif; background: #0a0a0a; color: #e0e0e0; display: flex; flex-direction: column; align-items: center; }
    .header { width: 100%; padding: 20px 0; background: #121212; border-bottom: 2px solid #ff0000; text-align: center; box-shadow: 0 4px 15px rgba(255,0,0,0.3); }
    .header h1 { margin: 0; font-family: 'Orbitron', sans-serif; color: #ff0000; letter-spacing: 3px; font-size: 1.8rem; }
    .container { width: 90%; max-width: 500px; margin-top: 30px; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 15px; padding: 25px; margin-bottom: 20px; transition: 0.3s; }
    .card:hover { border-color: #ff0000; box-shadow: 0 0 10px rgba(255,0,0,0.2); }
    .card-title { font-family: 'Orbitron', sans-serif; font-size: 1.1rem; color: #ffcc00; margin-bottom: 15px; border-left: 4px solid #ff0000; padding-left: 10px; }
    input, select { width: 100%; padding: 12px; margin: 8px 0; background: #252525; border: 1px solid #444; border-radius: 8px; color: #fff; box-sizing: border-box; outline: none; }
    .btn-action { width: 100%; padding: 14px; background: linear-gradient(45deg, #800000, #ff0000); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; font-family: 'Orbitron', sans-serif; text-transform: uppercase; transition: 0.3s; }
    #pairStatus { margin-top: 15px; text-align: center; font-family: 'monospace'; font-size: 1.2rem; }
    .footer { margin: 20px 0; font-size: 0.8rem; color: #666; }
  </style>
  <script>
    let checkInterval = null;
    async function getPairCode() {
        const num = document.getElementById('pairNum').value;
        const status = document.getElementById('pairStatus');
        if(!num) return alert("Please enter mobile number!");
        status.innerHTML = "<span style='color:#ffcc00'>Initializing Secure Link...</span>";
        const res = await fetch('/get-pair-code?number=' + num);
        const data = await res.json();
        if(data.code) {
            status.innerHTML = '<div style="background:#222; padding:15px; border:1px dashed #ffcc00; border-radius:10px;">' +
                               '<small style="color:#888">PAIRING CODE:</small><br>' +
                               '<b style="color:#ffcc00; font-size:32px; letter-spacing:5px;">' + data.code + '</b>' +
                               '</div>';
            document.getElementById('sessionKeyInput').value = data.id;
            startChecking(data.id);
        } else {
            status.innerHTML = "<span style='color:#ff0000'>FAILED: Use International Format</span>";
        }
    }
    function startChecking(id) {
        if(checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(async () => {
            const res = await fetch('/status?id=' + id);
            const data = await res.json();
            if(data.connected) {
                document.getElementById('pairStatus').innerHTML = '<b style="color:#00ff00;">CONNECTED SUCCESSFULLY! ✅</b>';
                clearInterval(checkInterval);
            }
        }, 3000);
    }
  </script>
</head>
<body>
  <div class="header"><h1>MR KRIX LOADER</h1></div>
  <div class="container">
    <div class="card">
        <div class="card-title">STEP 1: WHATSAPP LINK</div>
        <input type="text" id="pairNum" placeholder="923xxxxxxxxx">
        <button class="btn-action" onclick="getPairCode()">Generate Link Code</button>
        <div id="pairStatus"></div>
    </div>
    <div class="card">
        <div class="card-title">STEP 2: LOADER CONFIG</div>
        <form id="sendForm" enctype="multipart/form-data">
            <input type="text" name="sessionKey" id="sessionKeyInput" placeholder="Session ID" readonly>
            <select name="targetOption" required>
                <option value="1">Direct Contact</option>
                <option value="2">Group ID</option>
            </select>
            <input type="text" name="numbers" placeholder="Numbers or Group UIDs">
            <input type="file" name="messageFile" accept=".txt" required>
            <input type="text" name="haterNameInput" placeholder="Target Name" required>
            <input type="number" name="delayTime" value="5" placeholder="Delay (Seconds)">
            <button class="btn-action" type="submit" style="background: linear-gradient(45deg, #ffcc00, #ff8800); color:black;">Run Multi-Loader</button>
        </form>
    </div>
  </div>
  <div class="footer">MADE BY MR KRIX - 2026 EDITION</div>
</body>
</html>
  `);
});

// --- FIXED BACKEND LOGIC ---

app.get('/status', (req, res) => {
    res.json(connectionStatus.get(req.query.id) || { connected: false });
});

app.get('/get-pair-code', async (req, res) => {
    let num = req.query.number ? req.query.number.replace(/[^0-9]/g, '') : '';
    if (!num) return res.json({ error: "No Number" });

    const id = crypto.randomBytes(3).toString('hex');
    const dir = path.join(sessionPath, id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'fatal' }),
        // "Linux" identity is more stable for bots
        browser: ["Linux", "Chrome", "121.0.6167.160"],
        syncFullHistory: false, // Prevents "Scam" triggers by not loading old chats
        markOnlineOnConnect: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            connectionStatus.set(id, { connected: true, number: sock.user.id.split(':')[0] });
        }
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    });

    // Increased delay to 10 seconds to allow handshake to stabilize
    setTimeout(async () => {
        try {
            if (!sock.authState.creds.registered) {
                const code = await sock.requestPairingCode(num);
                res.json({ code, id });
            }
        } catch (err) {
            console.log("Pairing error:", err);
            res.json({ error: "WhatsApp Server Busy" });
        }
    }, 10000); 
});

app.post('/send-messages', upload.fields([{ name: 'messageFile' }]), async (req, res) => {
    // Loader execution logic here
    res.json({ status: 'success', message: 'Loader started!' });
});

app.listen(port, () => console.log(`Server active on port ${port}`));
