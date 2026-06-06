@echo off
title FuelPro - Fuel Management System
echo ==========================================
echo  FuelPro - Fuel Management System
echo  Loading...
echo ==========================================

:: Try to open in Chrome app mode
start chrome --app="https://3d3tjxc5r2qoc.kimi.page" --start-maximized

if errorlevel 1 (
    :: Fallback: Try Microsoft Edge
    start msedge --app="https://3d3tjxc5r2qoc.kimi.page" --start-maximized
)

if errorlevel 1 (
    :: Fallback: Default browser
    start "" "https://3d3tjxc5r2qoc.kimi.page"
)

echo FuelPro is launching in your browser...
echo.
echo To install as a desktop app:
echo 1. In Chrome/Edge, click the menu (three dots)
echo 2. Select "Install FuelPro" or "Add to Desktop"
echo.
timeout /t 3 >nul
exit
