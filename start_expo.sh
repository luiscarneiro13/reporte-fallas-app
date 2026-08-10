#!/bin/bash

echo "============================================"
echo "  IronFlow - Expo Tunnel Mode"
echo "============================================"

docker compose down -v
docker compose up --build
