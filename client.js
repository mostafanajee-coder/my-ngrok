const net = require('net');

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = 8086;
const LOCAL_APP_PORT = 3055;
const POOL_SIZE = 15; // عدد الاتصالات الجاهزة دائماً

let activeConnections = 0;

function createTunnelConnection() {
    const tunnelSocket = new net.Socket();

    tunnelSocket.connect(SERVER_PORT, SERVER_HOST, () => {
        // الاتصال جاهز في البركة
    });

    let localSocket = null;
    let isUsed = false;

    // مجرد وصول أي بيانات، يعني أن هذا الاتصال تم استخدامه من قبل مستخدم عام
    tunnelSocket.once('data', (initialData) => {
        isUsed = true;
        activeConnections++;
        console.log(`[Client] Connection activated. Active users: ${activeConnections}`);
        
        // تعويض البركة باتصال جديد فوراً لتبقى دائماً جاهزة (POOL_SIZE)
        createTunnelConnection();

        // الاتصال بتطبيقك المحلي لتوصيل البيانات
        localSocket = new net.Socket();
        localSocket.connect(LOCAL_APP_PORT, '127.0.0.1', () => {
            // إرسال الحزمة الأولى التي وصلتنا
            localSocket.write(initialData);
            
            // ربط القنوات (Piping) للتدفق المباشر للملفات الثقيلة بدون ذاكرة
            tunnelSocket.pipe(localSocket);
            localSocket.pipe(tunnelSocket);
        });

        const cleanup = () => {
            tunnelSocket.destroy();
            if (localSocket) localSocket.destroy();
            activeConnections--;
        };

        localSocket.on('error', cleanup);
        localSocket.on('close', cleanup);
    });

    const cleanupTunnel = () => {
        tunnelSocket.destroy();
        if (localSocket) localSocket.destroy();
        if (!isUsed) {
            // إذا انقطع وهو في البركة (لم يُستخدم)، نحاول إعادته
            setTimeout(createTunnelConnection, 2000);
        }
    };

    tunnelSocket.on('error', cleanupTunnel);
    tunnelSocket.on('close', cleanupTunnel);
}

console.log(`[Pro-Client] Starting Tunnel Pool with ${POOL_SIZE} persistent TCP sockets...`);
for (let i = 0; i < POOL_SIZE; i++) {
    createTunnelConnection();
}
