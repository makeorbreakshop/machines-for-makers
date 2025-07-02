"""
Monkey patch to fix pyee.asyncio import issue for Playwright.
This creates a compatibility layer for the import path.
"""

import sys
import types

# Create a fake pyee.asyncio module that redirects to pyee._asyncio
try:
    import pyee._asyncio as _asyncio_module
    
    # Create a module object for pyee.asyncio
    asyncio_module = types.ModuleType('pyee.asyncio')
    
    # Copy all attributes from _asyncio to the fake asyncio module
    for attr_name in dir(_asyncio_module):
        if not attr_name.startswith('__'):
            setattr(asyncio_module, attr_name, getattr(_asyncio_module, attr_name))
    
    # Add the fake module to sys.modules
    sys.modules['pyee.asyncio'] = asyncio_module
    
    print("✅ Successfully patched pyee.asyncio import")
    
except ImportError as e:
    print(f"❌ Failed to patch pyee import: {e}")