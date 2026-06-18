<div align="center">
  <h1>🚇 My-Ngrok Alternative (Pro Edition)</h1>
  <p>A lightweight, high-performance, and open-source alternative to Ngrok built with <b>Node.js</b> and <b>Raw TCP Sockets</b>.</p>
</div>

A powerful, memory-efficient alternative to Ngrok. This tool allows you to expose your local development server to the internet through a secure tunnel, without the need for port forwarding or paid subscriptions.

## ✨ Features
- 🚀 **High Performance & Raw Piping**: Powered by raw TCP sockets (`net` module) instead of WebSockets, meaning zero memory overhead.
- 🏋️‍♂️ **Heavy-Duty Ready**: Handles massive file streaming (e.g., 100MB+ files) and high traffic seamlessly.
- 📦 **All-in-One**: Contains the Client, Server, and a test Dummy App all together.
- 💻 **Cross-Platform**: Runs perfectly on Windows, Linux, and macOS.
- 🔌 **Easy to Use**: Run it as a single script or compile it into a standalone executable (`.exe`).

## 🛠️ Architecture
This project uses a **TCP Connection Pool** architecture (similar to how the real Ngrok works under the hood):
1. **Connection Pool**: The Client pre-establishes a pool of idle TCP connections with the Server.
2. **Server (`server.js`)**: Runs on a public port and handles incoming HTTP requests. When a request arrives, it grabs an idle socket from the pool and pipes the data directly.
3. **Client (`client.js`)**: Once it receives data on a tunnel socket, it immediately opens a new connection to your local application and pipes the data. It simultaneously spins up a new socket to replenish the pool.
4. **Local App (`dummy-app.js`)**: A simple testing app equipped with a heavy streaming route (`/heavy`) to test load capabilities.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.

### Installation
```bash
git clone https://github.com/mostafanajee-coder/my-ngrok.git
cd my-ngrok
npm install
```

### Running the Project

**Option 1: Using the Python Launcher (Easiest Method) 🐍**
This single script will start the Server, Client, and the Dummy App all at once:
```bash
python launcher.py
```

**Option 2: Standalone Executable (Windows) 🪟**
You can compile the entire project into a single `.exe` file!
```bash
npx pkg index.js -t node18-win-x64 -o my-ngrok.exe
```
Then simply double-click `my-ngrok.exe`.

**Option 3: Manual Execution ⚙️**
Run these commands in separate terminal windows:
```bash
node dummy-app.js   # Starts the local app on port 3055
node server.js      # Starts the TCP Server (8085) & Tunnel Server (8086)
node client.js      # Connects the tunnel between 8086 and 3055
```

## 🌐 Testing
Once everything is running, open your browser and navigate to the public server port:
👉 `http://localhost:8085`

You can also test the heavy streaming capability by navigating to:
👉 `http://localhost:8085/heavy`

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
