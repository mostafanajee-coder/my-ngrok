const net = require('net');

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = 8086;
const LOCAL_APP_PORT = 3055;
const POOL_SIZE = 15; // Number of persistent idle connections to maintain

let activeConnections = 0;

function createTunnelConnection() {
    const tunnelSocket = new net.Socket();

    tunnelSocket.connect(SERVER_PORT, SERVER_HOST, () => {
        // Connection is ready and in the pool
    });

    let localSocket = null;
    let isUsed = false;

    // Upon receiving any data, this connection becomes ACTIVE (a public user is requesting something)
    tunnelSocket.once('data', (initialData) => {
        isUsed = true;
        activeConnections++;
        console.log(`[Client] Connection activated. Active users: ${activeConnections}`);
        
        // Immediately replenish the pool to ensure it always has POOL_SIZE connections
        createTunnelConnection();

        // Connect to the local application to forward the data
        localSocket = new net.Socket();
        localSocket.connect(LOCAL_APP_PORT, '127.0.0.1', () => {
            // Send the first chunk we received
            localSocket.write(initialData);
            
            // Pipe the streams for high performance (Zero-memory overhead)
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
            // If disconnected while idle in the pool, attempt to reconnect
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
