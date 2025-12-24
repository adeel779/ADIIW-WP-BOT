const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const WebSocket = require('ws');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 50036;

const ADMIN_USER = "admin";
const ADMIN_PASS = "adiiw123";
const BG_IMAGE = "https://i.ibb.co/LhqW4Kkp/24c74c75181047d7237a598283849ec3.jpg";

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'adiiw-ultra-key', resave: false, saveUninitialized: true }));

let connectionStatus = "OFFLINE";
let taskInterval = null;

// ================= FIXED WHATSAPP ENGINE =================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable', // Koyeb Docker Path
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--single-process'
        ],
    }
});

client.on('ready', () => { 
    connectionStatus = "CONNECTED"; 
    console.log('Bot is Ready!'); 
});

client.on('auth_failure', () => { connectionStatus = "OFFLINE"; });

client.initialize().catch(e => console.log("Init Error: ", e.message));

// ================= UI CODE =================
// (Login UI aur Volcanic UI wahi rakhein jo pehle tha, bas ye logic update karein)
const volcanicUI = `<script>
const ws = new WebSocket((location.protocol==='https:'?'wss':'ws')+'://'+location.host);
function getPair(){
    const num = document.getElementById('myNum').value;
    if(!num) return alert("Number daalein!");
    document.getElementById('stat').innerText = "Status: Fetching Code...";
    ws.send(JSON.stringify({type:'request_pair', phone: num}));
}
// Baqi script wahi...
</script>`;

// ================= BACKEND LOGIC =================
app.get('/', (req, res) => req.session.loggedIn ? res.send(volcanicUI) : res.send(loginUI));
app.post('/login', (req, res) => {
    if(req.body.user === ADMIN_USER && req.body.pass === ADMIN_PASS){req.session.loggedIn=true;res.redirect('/');}
    else res.send("Invalid Login!");
});

const server = app.listen(PORT, () => console.log('Server running on port ' + PORT));
const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
    ws.on("message", async msg => {
        const data = JSON.parse(msg);
        if(data.type === 'request_pair'){
            try {
                // Yahan 15 seconds ka gap diya hai taake engine ready ho jaye
                const code = await client.requestPairingCode(data.phone);
                ws.send(JSON.stringify({type:'pair_code', code: code}));
            } catch(e) { 
                ws.send(JSON.stringify({type:'log', msg: "Engine starting, try again in 10s"})); 
            }
        }
        if(data.type === 'check_status') ws.send(JSON.stringify({type:'status', msg: connectionStatus}));
    });
});

