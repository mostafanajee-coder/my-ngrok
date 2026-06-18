const express = require('express');
const crypto = require('crypto');
const app = express();
const port = 3055;

app.get('/', (req, res) => {
  res.send('<h1>المحرك الاحترافي يعمل!</h1><p>جرب تحميل ملف ضخم: <a href="/heavy">تحميل 100 ميجابايت عشوائية</a></p>');
});

// مسار لاختبار التحمل (تحميل ملف 100 ميجابايت من البيانات العشوائية Stream)
app.get('/heavy', (req, res) => {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="100MB_Test.bin"');
    
    const chunkSize = 1024 * 1024; // 1 ميجا
    const totalChunks = 100; // 100 ميجا إجمالاً
    let chunksSent = 0;

    function sendChunk() {
        if (chunksSent >= totalChunks) {
            res.end();
            return;
        }
        // إرسال البيانات كتدفق (Stream) لتحدي قدرة النفق
        const chunk = crypto.randomBytes(chunkSize);
        res.write(chunk, () => {
            chunksSent++;
            setImmediate(sendChunk); // عدم حظر معالج العقدة
        });
    }
    
    console.log('[Dummy-App] 🚀 بدء تصدير تيار بيانات ثقيل (100MB)...');
    sendChunk();
});

app.listen(port, () => {
  console.log(`[Dummy-App] App listening at http://localhost:${port}`);
});
