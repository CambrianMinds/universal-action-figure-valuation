@echo off
title Universal Action Figure Appraiser
echo ========================================================
echo   UNIVERSAL ACTION FIGURE APPRAISER & VALUATOR
echo   Starting local database & valuation engine...
echo ========================================================
echo.

:: Check if Node is installed locally or bundled
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js not found in PATH. Checking for bundled node.exe...
    if not exist "node.exe" (
        echo [ERROR] Please install Node.js or keep node.exe in this folder.
        pause
        exit /b
    )
    set NODE_CMD=node.exe
) else (
    set NODE_CMD=node
)

:: Start Express server silently in background if not already running
netstat -ano | findstr :3001 >nul
if %errorlevel% neq 0 (
    echo [*] Launching database engine on port 3001...
    start /b %NODE_CMD% server.js > app_log.txt 2>&1
    timeout /t 2 >nul
) else (
    echo [*] Database engine is already running on port 3001.
)

:: Launch user's default browser directly to app
echo [*] Opening application in web browser...
start http://localhost:3001

echo.
echo [SUCCESS] Appraiser is running! 
echo Keep this window minimized while using the app.
echo.
pause
