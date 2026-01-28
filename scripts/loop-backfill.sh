#!/bin/bash

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Backfill Loop (Every 30 minutes)...${NC}"

while true; do
  echo -e "${GREEN}----------------------------------------${NC}"
  echo -e "${GREEN}Running backfill at $(date)${NC}"
  echo -e "${GREEN}----------------------------------------${NC}"
  
  # Run the backfill command
  pnpm translate:backfill
  
  echo -e "${BLUE}Backfill batch completed. Sleeping for 30 minutes...${NC}"
  echo -e "${BLUE}Press Ctrl+C to stop.${NC}"
  
  # Sleep for 3 minutes (1800 seconds)
  sleep 180
done
