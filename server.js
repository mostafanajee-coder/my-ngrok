const express = require('express');
const { WebSocketServer } = require('ws');

const HTTP_PORT = 8085; // المنفذ العام الذي سيستقبل طلبات المتصفح
const WS_PORT = 8086;   // منفذ خادم الـ WebSocket لربط العميل

const app = express();
const wss = new WebSocketServer({ port: WS_PORT });

let activeTunnel = null;
const pendingRequests = new Map();

// قراءة محتوى الطلبات كنص خام لسهولة التمرير
app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.use((req, res) => {
    if (!activeTunnel) {
        return res.status(502).send('Tunnel is offline. Please connect the client.');
    }

    // توليد مُعرف فريد للطلب
    const reqId = Math.random().toString(36).substring(2, 15);
    
    // حفظ كائن الاستجابة لنتمكن من الرد لاحقاً عند عودة البيانات من النفق
    pendingRequests.set(reqId, res);

    // تجهيز الطلب لإرساله عبر الـ WebSocket
    const tunnelRequest = {
        id: reqId,
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body && Buffer.isBuffer(req.body) && req.body.length > 0 ? req.body.toString('base64') : null
    };

    activeTunnel.send(JSON.stringify(tunnelRequest));
});

wss.on('connection', (ws) => {
    console.log('Tunnel client connected!');
    
    // في هذا المثال المبسط، نسمح بعميل واحد فقط بالاتصال كـ نفق
    if (activeTunnel) {
        activeTunnel.close();
    }
    activeTunnel = ws;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.id && pendingRequests.has(data.id)) {
                const res = pendingRequests.get(data.id);
                
                // إضافة الـ Headers
                if (data.headers) {
                    for (const [key, value] of Object.entries(data.headers)) {
                        // تجنب وضع بعض الترويسات التي قد تتعارض بعد النقل
                        if (key.toLowerCase() !== 'transfer-encoding') {
                            res.setHeader(key, value);
                        }
                    }
                }
                
                res.status(data.status || 200);
                
                if (data.body) {
                    const buffer = Buffer.from(data.body, 'base64');
                    res.send(buffer);
                } else {
                    res.send();
                }
                
                // مسح الطلب المعلق
                pendingRequests.delete(data.id);
            }
        } catch (err) {
            console.error('Error processing message from client:', err);
        }
    });

    ws.on('close', () => {
        console.log('Tunnel client disconnected.');
        if (activeTunnel === ws) {
            activeTunnel = null;
        }
        // إلغاء الطلبات المعلقة في حال انقطاع الاتصال
        for (const [id, res] of pendingRequests.entries()) {
            res.status(502).send('Tunnel disconnected before response.');
            pendingRequests.delete(id);
        }
    });
});

app.listen(HTTP_PORT, () => {
    console.log(`Public Server listening on http://localhost:${HTTP_PORT}`);
    console.log(`Waiting for tunnel client on ws://localhost:${WS_PORT}`);
});
