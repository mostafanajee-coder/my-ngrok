const net = require('net');

const HTTP_PORT = 8085;
const TUNNEL_PORT = 8086;

const tunnelPool = []; // بركة الاتصالات الخاملة
const waitingClients = []; // العملاء (المتصفحات) الذين ينتظرون اتصالاً متاحاً

// 1. خادم النفق (يستقبل اتصالات العميل لتكوين بركة الاتصالات)
const tunnelServer = net.createServer((socket) => {
    socket.setKeepAlive(true, 10000);
    
    if (waitingClients.length > 0) {
        // إذا كان هناك متصفح ينتظر، قم بربطه فوراً
        const publicSocket = waitingClients.shift();
        pipeSockets(publicSocket, socket);
    } else {
        // وإلا، ضعه في بركة الاتصالات
        tunnelPool.push(socket);
        
        socket.on('close', () => {
            const idx = tunnelPool.indexOf(socket);
            if (idx !== -1) tunnelPool.splice(idx, 1);
        });
        socket.on('error', (err) => {
            const idx = tunnelPool.indexOf(socket);
            if (idx !== -1) tunnelPool.splice(idx, 1);
        });
    }
});

// 2. الخادم العام (يستقبل طلبات المتصفحات)
const publicServer = net.createServer((publicSocket) => {
    publicSocket.setKeepAlive(true, 10000);
    
    if (tunnelPool.length > 0) {
        // خذ اتصالاً جاهزاً من البركة واربطهما
        const tunnelSocket = tunnelPool.shift();
        pipeSockets(publicSocket, tunnelSocket);
    } else {
        // إذا نفدت الاتصالات، ضعه في قائمة الانتظار
        waitingClients.push(publicSocket);
        
        publicSocket.on('close', () => {
            const idx = waitingClients.indexOf(publicSocket);
            if (idx !== -1) waitingClients.splice(idx, 1);
        });
        publicSocket.on('error', (err) => {
            const idx = waitingClients.indexOf(publicSocket);
            if (idx !== -1) waitingClients.splice(idx, 1);
        });
    }
});

// دالة الربط المباشر (Raw Piping) للسرعة الخارقة
function pipeSockets(publicSocket, tunnelSocket) {
    publicSocket.pipe(tunnelSocket);
    tunnelSocket.pipe(publicSocket);

    const cleanup = () => {
        publicSocket.destroy();
        tunnelSocket.destroy();
    };

    publicSocket.on('error', cleanup);
    tunnelSocket.on('error', cleanup);
    publicSocket.on('close', cleanup);
    tunnelSocket.on('close', cleanup);
}

tunnelServer.listen(TUNNEL_PORT, () => {
    console.log(`[Pro-Server] Tunnel Manager listening on TCP ${TUNNEL_PORT}`);
});

publicServer.listen(HTTP_PORT, () => {
    console.log(`[Pro-Server] Public HTTP Gateway listening on TCP ${HTTP_PORT}`);
});
