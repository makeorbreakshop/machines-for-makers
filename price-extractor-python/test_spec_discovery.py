#!/usr/bin/env python3
"""
Test script to run specification discovery on existing machines
"""
import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scripts.populate_specifications import main

if __name__ == "__main__":
    print("🚀 Starting specification discovery...")
    print("This will analyze existing machines in the database to discover common specifications.")
    print("="*60)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n❌ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)