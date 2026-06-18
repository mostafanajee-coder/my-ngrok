import subprocess
import time
import sys
import os

print("🚀 Starting my-ngrok environment...\n")

# Current directory path
cwd = os.path.dirname(os.path.abspath(__file__))

# Start the Local Dummy App
print("📦 Starting Dummy App on port 3055...")
dummy_process = subprocess.Popen(["node", "dummy-app.js"], cwd=cwd, stdout=sys.stdout, stderr=sys.stderr)
time.sleep(2) # Wait slightly

# Start the Public Server
print("🌐 Starting Public Server on TCP 8085...")
server_process = subprocess.Popen(["node", "server.js"], cwd=cwd, stdout=sys.stdout, stderr=sys.stderr)
time.sleep(2) # Wait slightly

# Start the Client (Tunnel)
print("🚇 Starting Client to open the tunnel...")
client_process = subprocess.Popen(["node", "client.js"], cwd=cwd, stdout=sys.stdout, stderr=sys.stderr)

print("\n✅ Started successfully! You can now visit: http://localhost:8085")
print("Press (Ctrl+C) to safely shut down all services.")

try:
    # Keep the script running
    dummy_process.wait()
except KeyboardInterrupt:
    print("\n🛑 Shutting down all services...")
    dummy_process.terminate()
    server_process.terminate()
    client_process.terminate()
    print("Goodbye!")
