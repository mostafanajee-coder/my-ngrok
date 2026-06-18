const net = require('net');
const tls = require('tls');
const forge = require('node-forge');

const HTTP_PORT = 8085;
const TUNNEL_PORT = 8086;
const AUTH_TOKEN = "SUPER_SECRET_NGROK_TOKEN_2026"; // Hardcoded for simplicity
const MAX_WAITING_CLIENTS = 50; // Anti-DoS Queue Limit
const WAIT_TIMEOUT_MS = 10000; // Anti-DoS Timeout (10 seconds)

const tunnelPool = []; // Pool of idle tunnel sockets
const waitingClients = []; // Public requests waiting for an available tunnel connection

// --- Dynamic Certificate Generation (In-Memory) ---
console.log("[Security] Generating ephemeral RSA keypair and certificate...");
const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
const attrs = [{ name: 'commonName', value: 'my-ngrok-secure-tunnel' }];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey);

const pemCert = forge.pki.certificateToPem(cert);
const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
console.log("[Security] Ephemeral certificate generated. Tunnel is fully encrypted.");

// --- Secure Tunnel Server (TLS) ---
const tunnelServer = tls.createServer({ key: pemKey, cert: pemCert }, (socket) => {
    socket.setKeepAlive(true, 10000);
    
    let authenticated = false;
    let authBuffer = '';

    // Timeout for authentication (2 seconds)
    const authTimeout = setTimeout(() => {
        if (!authenticated) {
            console.warn("[Security] Dropping connection: Authentication timeout.");
            socket.destroy();
        }
    }, 2000);

    const onData = (data) => {
        if (authenticated) return; // Ignore once authenticated
        
        authBuffer += data.toString();
        if (authBuffer.includes('\n')) {
            const token = authBuffer.split('\n')[0].trim();
            if (token === AUTH_TOKEN) {
                authenticated = true;
                clearTimeout(authTimeout);
                socket.removeListener('data', onData); // Stop listening to raw auth data
                
                // Connection authorized! Add to pool or serve a waiting client
                if (waitingClients.length > 0) {
                    const publicSocketObj = waitingClients.shift();
                    clearTimeout(publicSocketObj.timeout);
                    pipeSockets(publicSocketObj.socket, socket);
                } else {
                    tunnelPool.push(socket);
                    socket.on('close', () => removeFromArray(tunnelPool, socket));
                    socket.on('error', () => removeFromArray(tunnelPool, socket));
                }
            } else {
                console.warn("[Security] Unauthorized connection attempt detected! Intruder dropped.");
                socket.destroy();
            }
        }
    };
    
    socket.on('data', onData);
});

// --- Public Server (Raw HTTP) ---
const publicServer = net.createServer((publicSocket) => {
    publicSocket.setKeepAlive(true, 10000);
    
    if (tunnelPool.length > 0) {
        // Grab an idle connection from the pool and pipe them
        const tunnelSocket = tunnelPool.shift();
        pipeSockets(publicSocket, tunnelSocket);
    } else {
        // Anti-DoS: Check queue size
        if (waitingClients.length >= MAX_WAITING_CLIENTS) {
            console.warn("[Anti-DoS] Max waiting clients reached. Dropping new connection.");
            publicSocket.destroy();
            return;
        }

        // Anti-DoS: Queue Timeout
        const timeout = setTimeout(() => {
            console.warn("[Anti-DoS] Public request timed out. No available tunnels.");
            publicSocket.destroy();
            removeBySocket(waitingClients, publicSocket);
        }, WAIT_TIMEOUT_MS);

        waitingClients.push({ socket: publicSocket, timeout });
        
        publicSocket.on('close', () => {
            clearTimeout(timeout);
            removeBySocket(waitingClients, publicSocket);
        });
        publicSocket.on('error', () => {
            clearTimeout(timeout);
            removeBySocket(waitingClients, publicSocket);
        });
    }
});

// --- Utilities ---
function removeFromArray(arr, item) {
    const idx = arr.indexOf(item);
    if (idx !== -1) arr.splice(idx, 1);
}
function removeBySocket(arr, socket) {
    const idx = arr.findIndex(obj => obj.socket === socket);
    if (idx !== -1) arr.splice(idx, 1);
}

// Direct Pipe Function (Raw Piping for High Performance)
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
    console.log(`[Pro-Server] SECURE Tunnel Manager listening on TLS ${TUNNEL_PORT}`);
});

publicServer.listen(HTTP_PORT, () => {
    console.log(`[Pro-Server] Public HTTP Gateway listening on TCP ${HTTP_PORT}`);
});
