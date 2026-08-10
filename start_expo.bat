@echo off

echo ============================================
echo   IronFlow - Expo Tunnel Mode
echo ============================================

docker compose down -v
docker compose up --build