#!/bin/bash

# Test Review Images Migration Script
# This script runs the migration in test mode to verify functionality

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}  Review Images Migration Test Script  ${NC}"
echo -e "${YELLOW}======================================${NC}"
echo

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found.${NC}"
  echo "Please create a .env file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed.${NC}"
  echo "Please install Node.js to continue."
  exit 1
fi

# Check if required dependencies are installed
echo -e "${YELLOW}Checking dependencies...${NC}"
DEPS_MISSING=0

if ! node -e "try { require('@supabase/supabase-js'); } catch(e) { process.exit(1); }" 2>/dev/null; then
  echo -e "  ${RED}✗ @supabase/supabase-js not installed${NC}"
  DEPS_MISSING=1
else
  echo -e "  ${GREEN}✓ @supabase/supabase-js found${NC}"
fi

if ! node -e "try { require('cheerio'); } catch(e) { process.exit(1); }" 2>/dev/null; then
  echo -e "  ${RED}✗ cheerio not installed${NC}"
  DEPS_MISSING=1
else
  echo -e "  ${GREEN}✓ cheerio found${NC}"
fi

if ! node -e "try { require('sharp'); } catch(e) { process.exit(1); }" 2>/dev/null; then
  echo -e "  ${RED}✗ sharp not installed${NC}"
  DEPS_MISSING=1
else
  echo -e "  ${GREEN}✓ sharp found${NC}"
fi

if ! node -e "try { require('node-fetch'); } catch(e) { process.exit(1); }" 2>/dev/null; then
  echo -e "  ${RED}✗ node-fetch not installed${NC}"
  DEPS_MISSING=1
else
  echo -e "  ${GREEN}✓ node-fetch found${NC}"
fi

if ! node -e "try { require('uuid'); } catch(e) { process.exit(1); }" 2>/dev/null; then
  echo -e "  ${RED}✗ uuid not installed${NC}"
  DEPS_MISSING=1
else
  echo -e "  ${GREEN}✓ uuid found${NC}"
fi

if ! node -e "try { require('dotenv'); } catch(e) { process.exit(1); }" 2>/dev/null; then
  echo -e "  ${RED}✗ dotenv not installed${NC}"
  DEPS_MISSING=1
else
  echo -e "  ${GREEN}✓ dotenv found${NC}"
fi

if [ $DEPS_MISSING -eq 1 ]; then
  echo -e "\n${RED}Some dependencies are missing.${NC}"
  echo "Run the following command to install all required dependencies:"
  echo -e "${YELLOW}npm install @supabase/supabase-js cheerio sharp node-fetch uuid dotenv${NC}"
  echo
  read -p "Do you want to install missing dependencies now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install @supabase/supabase-js cheerio sharp node-fetch uuid dotenv
  else
    echo "Please install the missing dependencies and try again."
    exit 1
  fi
fi

echo -e "\n${YELLOW}Checking for the migration script...${NC}"
if [ ! -f "migrate-review-images.js" ]; then
  echo -e "${RED}Error: migrate-review-images.js not found.${NC}"
  echo "Please make sure the script exists in the current directory."
  exit 1
fi

# Ask if the user wants to test with a specific machine ID
echo -e "\n${YELLOW}Do you want to test with a specific machine ID?${NC}"
read -p "Enter machine ID (or press Enter to use the first machine found): " MACHINE_ID

echo -e "\n${YELLOW}Running migration in test mode...${NC}"
if [ -z "$MACHINE_ID" ]; then
  echo "Using the first machine with images in the review content."
  node migrate-review-images.js --test --verbose
else
  echo "Testing with machine ID: $MACHINE_ID"
  node migrate-review-images.js --test --machine-id "$MACHINE_ID" --verbose
fi

echo -e "\n${YELLOW}Test complete.${NC}"
echo "If the test was successful, you can run the full migration with:"
echo -e "${GREEN}node migrate-review-images.js${NC}" 