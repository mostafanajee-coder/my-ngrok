<div align="center">
  <h1>🚇 My-Ngrok Alternative</h1>
  <p>A lightweight, open-source alternative to Ngrok built with <b>Node.js</b> and <b>WebSockets</b>.</p>
</div>

بديل خفيف ومجاني ومفتوح المصدر لأداة Ngrok، مبني باستخدام **Node.js** و **WebSockets**. تتيح لك هذه الأداة مشاركة خادمك المحلي (Localhost) عبر الإنترنت من خلال نفق آمن، دون الحاجة إلى إعدادات معقدة في الراوتر أو اشتراكات مدفوعة.

## ✨ Features (المميزات)
- 🚀 **Fast & Real-time**: Powered by WebSockets for instant data transfer.
- 📦 **All-in-One**: Contains the Client, Server, and a test Dummy App all together.
- 💻 **Cross-Platform**: Runs perfectly on Windows, Linux, and macOS.
- 🔌 **Easy to Use**: Run it as a single script or compile it into a standalone executable (`.exe`).

## 🛠️ Architecture (كيف يعمل؟)
1. **Server (`server.js`)**: Runs on a public port and handles incoming HTTP requests from the outside world. It forwards these requests to the connected client via WebSockets.
2. **Client (`client.js`)**: Connects to the server, receives the forwarded requests, and executes them against your local application.
3. **Local App (`dummy-app.js`)**: A simple testing app to demonstrate the tunneling capabilities.

## 🚀 Getting Started (طريقة التشغيل)

### Prerequisites (المتطلبات)
- [Node.js](https://nodejs.org/) installed on your machine.

### Installation (التثبيت)
```bash
git clone https://github.com/mostafanajee-coder/my-ngrok.git
cd my-ngrok
npm install
```

### Running the Project (التشغيل)

**Option 1: Using the Python Launcher (Easiest Method) 🐍**
This single script will start the Server, Client, and the Dummy App all at once:
```bash
python launcher.py
```

**Option 2: Standalone Executable (Windows) 🪟**
You can compile the entire project into a single `.exe` file without needing Node.js installed in the future!
```bash
npx pkg index.js -t node18-win-x64 -o my-ngrok.exe
```
Then simply double-click `my-ngrok.exe`!

**Option 3: Manual Execution ⚙️**
Run these commands in separate terminal windows:
```bash
node dummy-app.js   # Starts the local app on port 3055
node server.js      # Starts the public HTTP server (8085) & WS server (8086)
node client.js      # Connects the tunnel between 8086 and 3055
```

## 🌐 Testing (التجربة)
Once everything is running, open your browser and navigate to the public server port:
👉 `http://localhost:8085`

You should see the welcome message from your local application! 🎉

## 📝 License (الرخصة)
This project is open-source and available under the [MIT License](LICENSE).
