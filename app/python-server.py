#!/usr/bin/env python3
"""
FuelPro Standalone Server - Embedded in Windows EXE
Serves the bundled web files and opens the browser automatically.
"""
import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time

# Get the dist directory (bundled or adjacent)
def get_dist_dir():
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        base_path = sys._MEIPASS
    else:
        # Running as script
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    dist_path = os.path.join(base_path, 'dist')
    if os.path.exists(os.path.join(dist_path, 'index.html')):
        return dist_path
    
    # Fallback: check parent directory
    dist_path = os.path.join(base_path, '..', 'dist')
    if os.path.exists(os.path.join(dist_path, 'index.html')):
        return os.path.abspath(dist_path)
    
    raise FileNotFoundError(f"dist/index.html not found in {base_path}")

DIST_DIR = get_dist_dir()
PORT = 0  # Random available port

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)
    
    def do_GET(self):
        # Try to serve the file
        file_path = os.path.join(DIST_DIR, self.path.lstrip('/'))
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return super().do_GET()
        # SPA fallback: serve index.html
        self.path = '/index.html'
        return super().do_GET()
    
    def log_message(self, format, *args):
        pass  # Suppress logs

def open_browser(url):
    time.sleep(1.5)
    webbrowser.open(url)

def main():
    with socketserver.TCPServer(("127.0.0.1", PORT), SPAHandler) as httpd:
        port = httpd.server_address[1]
        url = f"http://127.0.0.1:{port}"
        
        print("=" * 50)
        print("     FuelPro v1.0.0 - Starting")
        print("=" * 50)
        print(f"  Server: {url}")
        print("  Status: Online (Working Offline)")
        print("  Data:   Stored locally on your device")
        print("=" * 50)
        print("")
        
        # Open browser in background
        threading.Thread(target=open_browser, args=(url,), daemon=True).start()
        
        print("FuelPro is running! Your browser will open shortly.")
        print("Press Ctrl+C to stop")
        print("")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down FuelPro...")
            httpd.shutdown()

if __name__ == '__main__':
    main()
