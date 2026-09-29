@echo off
title Universal Action Figure Appraiser - Price Update
echo ========================================================
echo   UNIVERSAL ACTION FIGURE APPRAISER
echo   Market Price Database Update
echo ========================================================
echo.

:: Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo         Install Python from https://www.python.org/downloads/
    pause
    exit /b
)

:: Check for required packages
python -c "import requests; import bs4" >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Installing required Python packages...
    pip install requests beautifulsoup4 lxml
    echo.
)

:: Parse arguments - default to full update
set EXTRA_ARGS=
if "%1"=="--franchise" (
    set EXTRA_ARGS=--franchise %2
    echo [*] Updating prices for franchise: %2
) else if "%1"=="--dry-run" (
    set EXTRA_ARGS=--dry-run --verbose
    echo [*] Running in DRY RUN mode (no changes will be saved)
) else (
    echo [*] Updating prices for ALL franchises...
)

echo [*] Scraping latest market data from ActionFigure411...
echo.

:: Run the price update script
python "%~dp0scripts\update_prices.py" --verbose %EXTRA_ARGS%

echo.
echo [*] Price update complete!
echo     Run LAUNCH_APPRAISER.bat to see updated prices in the app.
echo.
pause
