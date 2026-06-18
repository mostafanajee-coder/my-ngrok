import subprocess
import time
import sys
import os

print("🚀 جاري تشغيل بيئة النفق (my-ngrok) بالكامل...\n")

# مسار المجلد الحالي
cwd = os.path.dirname(os.path.abspath(__file__))

# تشغيل التطبيق المحلي
print("📦 بدء تشغيل التطبيق المحلي (Dummy App) على المنفذ 3000...")
dummy_process = subprocess.Popen(["node", "dummy-app.js"], cwd=cwd, stdout=sys.stdout, stderr=sys.stderr)
time.sleep(2) # انتظار قليل حتى يعمل التطبيق

# تشغيل الخادم العام
print("🌐 بدء تشغيل الخادم العام (Server) على المنفذ 8080...")
server_process = subprocess.Popen(["node", "server.js"], cwd=cwd, stdout=sys.stdout, stderr=sys.stderr)
time.sleep(2) # انتظار قليل حتى يعمل الخادم

# تشغيل العميل (النفق)
print("🚇 بدء تشغيل العميل (Client) لفتح النفق...")
client_process = subprocess.Popen(["node", "client.js"], cwd=cwd, stdout=sys.stdout, stderr=sys.stderr)

print("\n✅ تم التشغيل بنجاح! يمكنك الآن زيارة الرابط: http://localhost:8080")
print("اضغط على (Ctrl+C) لإغلاق كل شيء.")

try:
    # إبقاء السكربت قيد التشغيل
    dummy_process.wait()
except KeyboardInterrupt:
    print("\n🛑 جاري إغلاق جميع الخدمات...")
    dummy_process.terminate()
    server_process.terminate()
    client_process.terminate()
    print("تم الإغلاق. وداعاً!")
