const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const WebSocket = require('ws');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 20014;

// --- SETTINGS (WAPIS ADDED) ---
const ADMIN_USER = "admin";
const ADMIN_PASS = "adiiw123";
const BG_IMAGE = "https://i.ibb.co/LhqW4Kkp/24c74c75181047d7237a598283849ec3.jpg";

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'adiiw-ultra-key', resave: false, saveUninitialized: true }));

let connectionStatus = "OFFLINE";
let taskInterval = null;

// ================= STABLE WHATSAPP ENGINE =================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
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

client.initialize().catch(e => console.log("Init Error: ", e.message));

// ================= UI (BG IMAGE RESTORED) =================
const loginUI = `<!DOCTYPE html><html><head><title>ADIIW LOGIN</title><style>
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:url("${BG_IMAGE}") center/cover fixed;font-family:sans-serif;}
.card{background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);padding:40px;border-radius:20px;text-align:center;color:white;border:1px solid rgba(255,255,255,0.1);}
input{width:100%;padding:12px;margin:10px 0;border-radius:10px;border:none;background:rgba(255,255,255,0.2);color:white;}
button{width:105%;padding:12px;background:linear-gradient(45deg,#ff416c,#ff4b2b);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold;}
</style></head><body><div class="card"><h2>ADIIW LOGIN</h2><form method="POST" action="/login"><input name="user" placeholder="Username"><input type="password" name="pass" placeholder="Password"><button type="submit">ACCESS PANEL</button></form></div></body></html>`;

const volcanicUI = `<!DOCTYPE html><html><head><title>ADIIW WA PANEL</title>
<style>
body{background:url("${BG_IMAGE}") center/cover fixed;color:#fff;font-family:sans-serif;margin:0;display:flex;flex-direction:column;align-items:center;min-height:100vh;}
body::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: -1; }
.container{width:95%;max-width:480px;margin-top:20px;position:relative;z-index:1;}
.glass{background:rgba(255,255,255,0.1);backdrop-filter:blur(15px);border-radius:15px;border:1px solid rgba(255,255,255,0.1);padding:20px;margin-bottom:15px;}
.stat-box{text-align:center;font-weight:bold;padding:10px;border-radius:10px;background:rgba(0,0,0,0.5);margin-bottom:15px;color:#00d2ff;border:1px solid #00d2ff;}
input{width:100%;padding:12px;margin-bottom:10px;border-radius:8px;border:1px solid #444;background:rgba(0,0,0,0.5);color:#fff;box-sizing:border-box;}
.btn{width:100%;padding:12px;border-radius:8px;font-weight:bold;cursor:pointer;border:none;margin-bottom:8px;}
.btn-pair{background:#00d2ff;color:#000;}
.btn-start{background:#25d366;color:#fff;}
.btn-stop{background:#ff4b2b;color:#fff;}
.btn-file{background:#555;color:#fff;}
#pairDisplay{font-size:22px;color:#ffcc00;text-align:center;margin:15px 0;padding:10px;border:1px dashed #ffcc00;background:rgba(0,0,0,0.5); display:none;}
.logs{height:150px;overflow-y:auto;background:rgba(0,0,0,0.7);padding:10px;border-radius:10px;font-size:12px;color:#0f0;border:1px solid #333;}
</style></head><body>
<div class="container">
    <h2 style="text-align:center;text-shadow:2px 2px #000;">🔥 ADIIW CONVO 🔥</h2>
    <div class="glass">
        <div class="stat-box" id="stat">Status: Checking Engine...</div>
        <div id="pairArea">
            <input id="myNum" placeholder="Number (e.g. 92300...)">
            <button class="btn btn-pair" onclick="getPair()">GET PAIRING CODE</button>
            <div id="pairDisplay"></div>
        </div>
    </div>
    <div class="glass">
        <input id="t" placeholder="Target Number (923xxxxxxx)">
        <input id="h" placeholder="Haters Name">
        <input id="l" placeholder="Last Name / Tag">
        <input id="d" value="5" placeholder="Delay (Seconds)">
        <input type="file" id="msgFile" style="display:none" onchange="loadFile(this)">
        <button class="btn btn-file" onclick="document.getElementById('msgFile').click()">📂 UPLOAD MESSAGE FILE</button>
        <button class="btn btn-start" onclick="startBot()">START BOT</button>
        <button class="btn btn-stop" onclick="stopBot()">STOP BOT</button>
    </div>
    <div class="glass"><div class="logs" id="con"></div></div>
</div>
<script>
const ws = new WebSocket((location.protocol==='https:'?'wss':'ws')+'://'+location.host);
let loadedMessages = "";
function loadFile(i){const r=new FileReader();r.onload=()=>{loadedMessages=r.result;alert("File Loaded!")};r.readAsText(i.files[0]);}
function getPair(){ws.send(JSON.stringify({type:'request_pair',phone:document.getElementById('myNum').value}));}
function startBot(){if(!loadedMessages)return alert("Please upload file!");ws.send(JSON.stringify({type:'start',target:document.getElementById('t').value,hatersName:document.getElementById('h').value,lastHereName:document.getElementById('l').value,delay:document.getElementById('d').value,messageContent:loadedMessages}));}
function stopBot(){ws.send(JSON.stringify({type:'stop'}));alert("Stopped!");}
ws.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.type==='pair_code'){const div=document.getElementById('pairDisplay');div.style.display="block";div.innerText=d.code;}
    if(d.type==='status'){document.getElementById('stat').innerText="Status: "+d.msg;if(d.msg==="CONNECTED")document.getElementById('pairArea').style.display="none";}
    if(d.type==='log'){const p=document.createElement('div');p.innerText="> "+d.msg;const con=document.getElementById('con');con.appendChild(p);con.scrollTop=con.scrollHeight;}
};
setInterval(()=>ws.send(JSON.stringify({type:'check_status'})),3000);
</script></body></html>`;

// ================= BACKEND LOGIC =================
app.get('/', (req, res) => req.session.loggedIn ? res.send(volcanicUI) : res.send(loginUI));
app.post('/login', (req, res) => {
    if(req.body.user === ADMIN_USER && req.body.pass === ADMIN_PASS){req.session.loggedIn=true;res.redirect('/');}
    else res.send("Invalid Login!");
});

const server = app.listen(PORT);
const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
    ws.on("message", async msg => {
        const data = JSON.parse(msg);
        if(data.type === 'request_pair'){
            try {
                const code = await client.requestPairingCode(data.phone);
                ws.send(JSON.stringify({type:'pair_code', code: code}));
            } catch(e) { ws.send(JSON.stringify({type:'log', msg: "Wait 15s for engine to start..."})); }
        }
        if(data.type === 'check_status') ws.send(JSON.stringify({type:'status', msg: connectionStatus}));
        if(data.type === 'stop') { if(taskInterval) { clearInterval(taskInterval); taskInterval = null; } }
        if(data.type === 'start') {
            const msgs = data.messageContent.split('\n').filter(Boolean);
            let i = 0; if(taskInterval) clearInterval(taskInterval);
            taskInterval = setInterval(async () => {
                if(i >= msgs.length) i = 0;
                try {
                    const fullMsg = `${data.hatersName} ${msgs[i++]} ${data.lastHereName}`;
                    await client.sendMessage(data.target + "@c.us", fullMsg);
                    ws.send(JSON.stringify({type:'log', msg: "Sent: " + msgs[i-1]}));
                } catch(e) { ws.send(JSON.stringify({type:'log', msg: "Send Error"})); }
            }, parseInt(data.delay) * 1000);
        }
    });
});

