@echo off
title Schedule Automatic Price Updates
echo ========================================================
echo   UNIVERSAL ACTION FIGURE APPRAISER
echo   Automatic Price Update Scheduler
echo ========================================================
echo.
echo This will register a Windows Scheduled Task to automatically
echo update market prices on a recurring schedule.
echo.
echo Available schedules:
echo   1. Daily   (runs every day at 6:00 AM)
echo   2. Weekly  (runs every Sunday at 6:00 AM)
echo   3. Remove  (unregister the scheduled task)
echo.

set /p CHOICE="Select option (1/2/3): "

set TASK_NAME=UniversalFigureAppraiser_PriceUpdate
set SCRIPT_PATH=%~dp0scripts\update_prices.py

:: Get the Python path
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python first.
    pause
    exit /b
)

for /f "tokens=*" %%i in ('where python') do set PYTHON_PATH=%%i

if "%CHOICE%"=="1" (
    echo.
    echo [*] Registering DAILY scheduled task...
    schtasks /create /tn "%TASK_NAME%" /tr "\"%PYTHON_PATH%\" \"%SCRIPT_PATH%\" --verbose" /sc daily /st 06:00 /f
    if %errorlevel% equ 0 (
        echo [SUCCESS] Daily price update scheduled for 6:00 AM.
    ) else (
        echo [NOTE] If you see an access error, try running this script as Administrator.
    )
) else if "%CHOICE%"=="2" (
    echo.
    echo [*] Registering WEEKLY scheduled task (Sundays)...
    schtasks /create /tn "%TASK_NAME%" /tr "\"%PYTHON_PATH%\" \"%SCRIPT_PATH%\" --verbose" /sc weekly /d SUN /st 06:00 /f
    if %errorlevel% equ 0 (
        echo [SUCCESS] Weekly price update scheduled for Sundays at 6:00 AM.
    ) else (
        echo [NOTE] If you see an access error, try running this script as Administrator.
    )
) else if "%CHOICE%"=="3" (
    echo.
    echo [*] Removing scheduled task...
    schtasks /delete /tn "%TASK_NAME%" /f
    if %errorlevel% equ 0 (
        echo [SUCCESS] Scheduled task removed.
    ) else (
        echo [NOTE] Task may not exist or may require Administrator access.
    )
) else (
    echo [!] Invalid option. Please run again and select 1, 2, or 3.
)

echo.
pause
