#!/usr/bin/env python3
"""
Fix bad learned selectors using the database service.
"""

import asyncio
import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database import DatabaseService

async def main():
    """Fix bad learned selectors."""
    db_service = DatabaseService()
    fixed_count = await db_service.fix_bad_learned_selectors()
    print(f"\n🎯 COMPLETED: Fixed {fixed_count} machines")
    return fixed_count

if __name__ == "__main__":
    asyncio.run(main())