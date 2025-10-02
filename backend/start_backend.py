#!/usr/bin/env python3
"""
Simple script to start the backend server
"""
import subprocess
import sys
import os

def main():
    print("🚀 Starting Divine Energy Hub Backend Server...")
    print("📍 Backend will be available at: http://localhost:5000")
    print("🔗 API endpoints available at: http://localhost:5000/api/")
    print("=" * 60)
    
    try:
        # Start the Flask app
        subprocess.run([sys.executable, "app.py"], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Backend server stopped by user")
    except Exception as e:
        print(f"❌ Error starting backend: {e}")

if __name__ == "__main__":
    main()
