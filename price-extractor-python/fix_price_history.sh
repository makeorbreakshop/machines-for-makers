#!/bin/bash

# Script to run the price history fields migration

echo "Running price history fields migration..."

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Make sure the migration runner is executable
chmod +x migrations/run_migration.py

# Run the migration
python3 migrations/run_migration.py --file fix_price_history_fields.sql

echo "Migration completed." 