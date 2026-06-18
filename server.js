require('dotenv').config();
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const forge = require('node-forge');

const HTTP_PORT = process.env.HTTP_PORT || 8085;
const TUNNEL_PORT = process.env.TUNNEL_PORT || 8086;
const AUTH_TOKEN = process.env.AUTH_TOKEN || "DEFAULT_SECRET";
const MAX_WAITING_CLIENTS = 50; 
const WAIT_TIMEOUT_MS = 10000; 

const tunnelPool = []; 
const waitingClients = []; 

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

// Generate SHA256 Fingerprint for Certificate Pinning (MITM Protection)
const x509 = new crypto.X509Certificate(pemCert);
const fingerprint = x509.fingerprint256;
process.env.GENERATED_FINGERPRINT = fingerprint; // Expose to client if running in the same process
console.log(`[Security] Ephemeral certificate generated.`);
console.log(`[Security] 📌 CERTIFICATE FINGERPRINT (SHA256): ${fingerprint}`);
console.log(`[Security] Make sure the client expects this fingerprint to prevent MITM attacks!`);

const tunnelServer = tls.createServer({ key: pemKey, cert: pemCert }, (socket) => {
    socket.setKeepAlive(true, 10000);
    
    // Slowloris Protection on the tunnel auth phase (Disconnects if auth is too slow)
    socket.setTimeout(5000, () => {
        console.warn("[Security] Tunnel Auth Timeout (Slowloris protection).");
        socket.destroy();
    });
    
    let authenticated = false;
    let authBuffer = '';

    const onData = (data) => {
        if (authenticated) return; 
        
        authBuffer += data.toString();
        if (authBuffer.includes('\n')) {
            const token = authBuffer.split('\n')[0].trim();
            if (token === AUTH_TOKEN) {
                authenticated = true;
                socket.setTimeout(0); // Remove timeout once authenticated successfully
                socket.removeListener('data', onData);
                
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

const publicServer = net.createServer((publicSocket) => {
    publicSocket.setKeepAlive(true, 10000);
    
    // Slowloris Protection on the public HTTP side (Disconnects idle HTTP connections)
    publicSocket.setTimeout(60000, () => {
        console.warn("[Anti-DoS] Public connection idle timeout (Slowloris protection).");
        publicSocket.destroy();
    });
    
    if (tunnelPool.length > 0) {
        const tunnelSocket = tunnelPool.shift();
        pipeSockets(publicSocket, tunnelSocket);
    } else {
        if (waitingClients.length >= MAX_WAITING_CLIENTS) {
            console.warn("[Anti-DoS] Max waiting clients reached. Dropping new connection.");
            publicSocket.destroy();
            return;
        }

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

function removeFromArray(arr, item) {
    const idx = arr.indexOf(item);
    if (idx !== -1) arr.splice(idx, 1);
}
function removeBySocket(arr, socket) {
    const idx = arr.findIndex(obj => obj.socket === socket);
    if (idx !== -1) arr.splice(idx, 1);
}

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
