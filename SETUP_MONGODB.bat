@echo off
REM MongoDB Setup Script for Windows
REM Run this to set up your database

echo.
echo ====================================
echo MongoDB Setup for Carbon Bazaar
echo ====================================
echo.

REM Step 1: Check if MongoDB is installed
echo Step 1: Checking MongoDB installation...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: MongoDB is not installed or not in PATH
    echo.
    echo Please install MongoDB from: https://www.mongodb.com/try/download/community
    echo.
    echo After installation, add MongoDB to your PATH or use WSL:
    echo   - Windows (WSL): sudo apt-get install mongodb
    echo   - Windows (Git Bash): mongod --dbpath "C:\data\db"
    echo.
    pause
    exit /b 1
)
echo OK - MongoDB is installed
echo.

REM Step 2: Start MongoDB
echo Step 2: Starting MongoDB...
echo.
echo Choose one option:
echo   1. Windows Service: net start MongoDB
echo   2. WSL: sudo service mongod start
echo   3. Git Bash: mongod --dbpath "C:\data\db" (in separate window)
echo   4. Manual: mongod (in separate window)
echo.
echo Please start MongoDB and press Enter to continue...
pause

REM Step 3: Verify Connection
echo.
echo Step 3: Verifying connection...
node scripts/check-db.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Could not connect to MongoDB
    echo.
    echo Make sure MongoDB is running:
    echo   - Check if mongod service is started
    echo   - Or manually run mongod in another terminal
    echo.
    pause
    exit /b 1
)
echo.
echo Connection verified!
echo.

REM Step 4: Initialize Database
echo Step 4: Initializing database...
node scripts/init-db.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Database initialization failed
    pause
    exit /b 1
)
echo.
echo Database initialized!
echo.

REM Step 5: Load Sample Data (Optional)
echo Step 5: Load sample data (optional)?
echo.
set /p load_data="Load sample data? (y/n): "
if /i "%load_data%"=="y" (
    echo.
    echo Loading sample data...
    node scripts/seed-db.js
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Failed to load sample data
        pause
        exit /b 1
    )
    echo.
    echo Sample data loaded!
    echo.
    echo Test Credentials:
    echo   Farmer:   anish@carbenbazaar.in / Farmer@123456
    echo   Company:  company@greenenergy.in / Company@123456
    echo   Admin:    admin@carbenbazaar.in / Admin@123456
    echo.
)

REM Step 6: Ready to start
echo.
echo ====================================
echo All setup complete!
echo ====================================
echo.
echo Next steps:
echo   1. Run: npm run dev
echo   2. Visit: http://localhost:3000
echo.
echo Documentation:
echo   - Quick Reference: MONGODB_QUICK_REFERENCE.md
echo   - Complete Guide: README_MONGODB.md
echo   - Technical Ref: MONGODB_CONFIG.md
echo.
echo To check database status anytime:
echo   node scripts/check-db.js
echo.
pause
