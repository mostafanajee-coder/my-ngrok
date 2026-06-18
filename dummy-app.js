const express = require('express');
const app = express();
const port = 3055;

app.get('/', (req, res) => {
  res.send(`
    <html dir="rtl">
    <head>
      <title>تطبيق محلي</title>
      <style>
        body { font-family: Tahoma, sans-serif; text-align: center; margin-top: 50px; background: #f0f8ff; color: #333; }
        h1 { color: #0066cc; }
        .box { background: white; padding: 20px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>🎉 مرحباً بك! 🎉</h1>
        <p>هذا هو التطبيق المحلي الخاص بك يعمل بنجاح.</p>
        <p>الآن أنت تتصفحه عبر النفق (Tunnel) الذي بنيناه معاً.</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/api/data', (req, res) => {
  res.json({ message: 'نجاح!', timestamp: new Date() });
});

app.post('/api/echo', express.json(), (req, res) => {
  res.json({ received_body: req.body });
});

app.listen(port, () => {
  console.log(`Dummy App listening at http://localhost:${port}`);
});
