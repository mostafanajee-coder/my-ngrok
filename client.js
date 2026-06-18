const WebSocket = require('ws');
const axios = require('axios');

// بيانات الاتصال بالخادم و بالتطبيق المحلي
const SERVER_WS_URL = 'ws://localhost:8086';
const LOCAL_APP_URL = 'http://localhost:3055';

function connectTunnel() {
    console.log(`Connecting to tunnel server at ${SERVER_WS_URL}...`);
    const ws = new WebSocket(SERVER_WS_URL);

    ws.on('open', () => {
        console.log(`Connected! Tunneling from ${SERVER_WS_URL} -> ${LOCAL_APP_URL}`);
    });

    ws.on('message', async (message) => {
        const reqData = JSON.parse(message);
        console.log(`[REQUEST] ${reqData.method} ${reqData.url}`);

        try {
            // إعداد طلب axios لتمريره للتطبيق المحلي
            const axiosConfig = {
                method: reqData.method,
                url: `${LOCAL_APP_URL}${reqData.url}`,
                headers: { ...reqData.headers },
                data: reqData.body ? Buffer.from(reqData.body, 'base64') : undefined,
                responseType: 'arraybuffer', // استقبال الرد كـ Buffer 
                validateStatus: () => true // عدم التسبب بخطأ لأي كود حالة
            };

            // إزالة الترويسات التي قد تسبب مشاكل (مثل host لأنه سيتغير للمحلي)
            delete axiosConfig.headers['host'];
            delete axiosConfig.headers['connection'];
            delete axiosConfig.headers['accept-encoding']; // لتجنب ضغط البيانات وصعوبة إعادة توجيهها هنا

            const response = await axios(axiosConfig);

            // تغليف الرد
            const resData = {
                id: reqData.id,
                status: response.status,
                headers: response.headers,
                body: response.data ? Buffer.from(response.data).toString('base64') : null
            };

            // إرسال الرد للخادم عبر النفق
            ws.send(JSON.stringify(resData));
            console.log(`[RESPONSE] ${reqData.method} ${reqData.url} - Status: ${response.status}`);

        } catch (err) {
            console.error(`[ERROR] Failed to process request:`, err.message);
            // إخبار الخادم بفشل التطبيق المحلي
            ws.send(JSON.stringify({
                id: reqData.id,
                status: 502,
                headers: { 'Content-Type': 'text/plain' },
                body: Buffer.from('Local application failed to respond or is unreachable.').toString('base64')
            }));
        }
    });

    ws.on('close', () => {
        console.log('Disconnected from server. Reconnecting in 5 seconds...');
        setTimeout(connectTunnel, 5000);
    });
    
    ws.on('error', (err) => {
        console.error('WebSocket Error:', err.message);
    });
}

connectTunnel();
