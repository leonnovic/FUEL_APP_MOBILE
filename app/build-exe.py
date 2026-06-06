#!/usr/bin/env python3
"""
Build script for FuelPro Windows EXE
Run: python3 build-exe.py
"""
import subprocess
import sys
import os
import shutil

# Ensure dist folder exists
if not os.path.exists("dist/index.html"):
    print("ERROR: dist/index.html not found. Run 'npm run build' first.")
    sys.exit(1)

# Build with PyInstaller
cmd = [
    sys.executable, "-m", "PyInstaller",
    "--onefile",              # Single EXE
    "--windowed",             # No console window
    "--name", "FuelPro",
    "--icon", "public/logo-small.png",
    "--add-data", "dist:dist",  # Embed dist files
    "--clean",
    "--noconfirm",
    "python-server.py"
]

print("Building FuelPro Windows EXE...")
print("Command:", " ".join(cmd))
result = subprocess.run(cmd, capture_output=False)
if result.returncode == 0:
    print("\nSUCCESS: EXE built at dist-exe/FuelPro.exe")
else:
    print("\nFAILED: Check errors above")
    sys.exit(1)
