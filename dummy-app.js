const express = require('express');
const crypto = require('crypto');
const app = express();
const port = 3055;

app.get('/', (req, res) => {
  res.send('<h1>Pro Engine Works!</h1><p>Try the heavy load test: <a href="/heavy">Download 100MB of random data</a></p>');
});

// Heavy load testing route (Streams 100MB of random data)
app.get('/heavy', (req, res) => {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="100MB_Test.bin"');
    
    const chunkSize = 1024 * 1024; // 1 MB
    const totalChunks = 100; // 100 MB total
    let chunksSent = 0;

    function sendChunk() {
        if (chunksSent >= totalChunks) {
            res.end();
            return;
        }
        // Send data as a stream to challenge the tunnel's capabilities
        const chunk = crypto.randomBytes(chunkSize);
        res.write(chunk, () => {
            chunksSent++;
            setImmediate(sendChunk); // Avoid blocking the event loop
        });
    }
    
    console.log('[Dummy-App] 🚀 Exporting heavy data stream (100MB)...');
    sendChunk();
});

app.listen(port, () => {
  console.log(`[Dummy-App] App listening at http://localhost:${port}`);
});
