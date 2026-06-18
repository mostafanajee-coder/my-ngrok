console.log("🚀 Starting my-ngrok All-in-One Engine...");

// 1. Start the Local Dummy App
require('./dummy-app.js');

// 2. Start the Public Server
require('./server.js');

// 3. Start the Client to connect to the tunnel
setTimeout(() => {
    require('./client.js');
}, 1500); // Slight delay to ensure the server starts first
