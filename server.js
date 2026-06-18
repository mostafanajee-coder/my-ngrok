const net = require('net');

const HTTP_PORT = 8085;
const TUNNEL_PORT = 8086;

const tunnelPool = []; // Pool of idle tunnel sockets
const waitingClients = []; // Public requests waiting for an available tunnel connection

// 1. Tunnel Server (Receives connections from the local client to build the pool)
const tunnelServer = net.createServer((socket) => {
    socket.setKeepAlive(true, 10000);
    
    if (waitingClients.length > 0) {
        // If a public client is waiting, connect immediately
        const publicSocket = waitingClients.shift();
        pipeSockets(publicSocket, socket);
    } else {
        // Otherwise, add to the idle pool
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

// 2. Public Server (Receives requests from public users/browsers)
const publicServer = net.createServer((publicSocket) => {
    publicSocket.setKeepAlive(true, 10000);
    
    if (tunnelPool.length > 0) {
        // Grab an idle connection from the pool and pipe them
        const tunnelSocket = tunnelPool.shift();
        pipeSockets(publicSocket, tunnelSocket);
    } else {
        // If no connections are available, put the user in the waiting list
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
    console.log(`[Pro-Server] Tunnel Manager listening on TCP ${TUNNEL_PORT}`);
});

publicServer.listen(HTTP_PORT, () => {
    console.log(`[Pro-Server] Public HTTP Gateway listening on TCP ${HTTP_PORT}`);
});
