@echo off
chcp 65001 >nul
title 🌐 Autonomous Manual Websites Agent - Curated Directory Suite
cd /d "%~dp0"

echo ===============================================================================
echo 🌐 Autonomous Manual Websites Agent & Curated Hub
echo Directory: %~dp0
echo GitHub: https://github.com/Satyenderparihar/Websites-Scrapes-Manually
echo ===============================================================================
echo.

python "⚡ manual_websites_agent.py"

echo.
echo ===============================================================================
echo [Done] Press any key to exit...
echo ===============================================================================
pause >nul
