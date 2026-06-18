const net = require('net');
const tls = require('tls');

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = 8086;
const LOCAL_APP_PORT = 3055;
const POOL_SIZE = 15; 
const AUTH_TOKEN = "SUPER_SECRET_NGROK_TOKEN_2026"; // Hardcoded for simplicity

let activeConnections = 0;

function createTunnelConnection() {
    // 1. Connect using TLS (ignore self-signed cert verification since it's dynamically generated)
    const tunnelSocket = tls.connect(SERVER_PORT, SERVER_HOST, { rejectUnauthorized: false }, () => {
        // 2. Send authentication token immediately
        tunnelSocket.write(`${AUTH_TOKEN}\n`);
    });

    let localSocket = null;
    let isUsed = false;

    // Upon receiving any data, this connection becomes ACTIVE
    tunnelSocket.once('data', (initialData) => {
        isUsed = true;
        activeConnections++;
        console.log(`[Client] Connection activated. Active users: ${activeConnections}`);
        
        // Immediately replenish the pool
        createTunnelConnection();

        // 3. Local Isolation: Force connection to 127.0.0.1 ONLY to prevent local network scanning
        localSocket = new net.Socket();
        localSocket.connect(LOCAL_APP_PORT, '127.0.0.1', () => {
            // Send the first chunk we received
            localSocket.write(initialData);
            
            // Pipe the streams
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
            setTimeout(createTunnelConnection, 2000);
        }
    };

    tunnelSocket.on('error', cleanupTunnel);
    tunnelSocket.on('close', cleanupTunnel);
}

console.log(`[Pro-Client] Starting SECURE Tunnel Pool with ${POOL_SIZE} persistent TLS sockets...`);
for (let i = 0; i < POOL_SIZE; i++) {
    createTunnelConnection();
}
