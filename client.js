require('dotenv').config();
const net = require('net');
const tls = require('tls');

const SERVER_HOST = process.env.SERVER_HOST || '127.0.0.1';
const SERVER_PORT = process.env.TUNNEL_PORT || 8086;
const LOCAL_APP_PORT = process.env.LOCAL_APP_PORT || 3055;
const AUTH_TOKEN = process.env.AUTH_TOKEN || "DEFAULT_SECRET";
const POOL_SIZE = 15; 

let activeConnections = 0;

function createTunnelConnection() {
    // Check fingerprint directly from process.env if injected by server, or from .env
    const expectedFingerprint = process.env.EXPECTED_FINGERPRINT || process.env.GENERATED_FINGERPRINT || null;

    const options = {
        rejectUnauthorized: false, // We use self-signed certs, so we disable default CA checks
        checkServerIdentity: (hostname, cert) => {
            // Certificate Pinning Implementation (Defeats MITM Attacks)
            if (expectedFingerprint && cert.fingerprint256 !== expectedFingerprint) {
                return new Error(`[Security FATAL] Certificate fingerprint mismatch! Possible MITM attack.\nExpected: ${expectedFingerprint}\nGot: ${cert.fingerprint256}`);
            }
            return undefined; // Valid identity
        }
    };

    const tunnelSocket = tls.connect(SERVER_PORT, SERVER_HOST, options, () => {
        tunnelSocket.write(`${AUTH_TOKEN}\n`);
    });

    let localSocket = null;
    let isUsed = false;

    tunnelSocket.once('data', (initialData) => {
        isUsed = true;
        activeConnections++;
        console.log(`[Client] Connection activated. Active users: ${activeConnections}`);
        
        createTunnelConnection();

        localSocket = new net.Socket();
        localSocket.connect(LOCAL_APP_PORT, '127.0.0.1', () => {
            localSocket.write(initialData);
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

    const cleanupTunnel = (err) => {
        if (err && err.message) {
            console.error(err.message);
        }
        tunnelSocket.destroy();
        if (localSocket) localSocket.destroy();
        if (!isUsed) {
            setTimeout(createTunnelConnection, 2000);
        }
    };

    tunnelSocket.on('error', cleanupTunnel);
    tunnelSocket.on('close', cleanupTunnel);
}

// Delay client startup slightly to allow the server to generate the fingerprint (if running in the same process via index.js)
setTimeout(() => {
    console.log(`[Pro-Client] Starting SECURE Tunnel Pool with ${POOL_SIZE} persistent TLS sockets...`);
    const fingerprint = process.env.EXPECTED_FINGERPRINT || process.env.GENERATED_FINGERPRINT || null;
    if (fingerprint) {
        console.log(`[Security] Client enforces Certificate Pinning: ${fingerprint}`);
    } else {
        console.warn(`[Security WARNING] No certificate fingerprint provided! Vulnerable to MITM.`);
    }
    
    for (let i = 0; i < POOL_SIZE; i++) {
        createTunnelConnection();
    }
}, 500);
