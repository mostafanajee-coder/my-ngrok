console.log("🚀 Starting my-ngrok All-in-One Engine...");

// 1. تشغيل التطبيق المحلي
require('./dummy-app.js');

// 2. تشغيل الخادم العام
require('./server.js');

// 3. تشغيل العميل للاتصال بالنفق
setTimeout(() => {
    require('./client.js');
}, 1500); // تأخير بسيط لضمان عمل الخادم أولاً
