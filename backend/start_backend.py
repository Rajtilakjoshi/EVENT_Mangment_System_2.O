#!/usr/bin/env python3
"""Start the Flask API (default port 8080)."""
import os
import subprocess
import sys

def main():
    port = os.environ.get("PORT", "8080")
    print(f"Starting Divine Energy Hub API on http://localhost:{port}")
    print(f"Health: http://localhost:{port}/api/health")
    try:
        subprocess.run([sys.executable, "app.py"], check=True)
    except KeyboardInterrupt:
        print("\nBackend stopped")
    except Exception as e:
        print(f"Error starting backend: {e}")

if __name__ == "__main__":
    main()
