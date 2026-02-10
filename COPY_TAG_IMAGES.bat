@echo off
REM This script helps copy tag images to the correct folder
REM Place your 20 tag image files in the same directory as this script
REM Then run this script to copy them to the game folder

setlocal enabledelayedexpansion

REM Define source and destination
set "DEST=c:\Users\swobb\Downloads\school-vandals_-rivalry-unleashed (2)\public\assets\tags\"

echo.
echo ======================================
echo TAG IMAGE INSTALLATION
echo ======================================
echo.
echo Destination: %DEST%
echo.
echo This script will copy your tag images to:
echo Tag1.png, Tag2.png, ..., Tag20.png
echo.

REM Check if destination exists
if not exist "%DEST%" (
    echo ERROR: Destination folder does not exist!
    echo %DEST%
    pause
    exit /b 1
)

REM List current files in destination
echo Current files in destination:
dir "%DEST%" 2>nul || echo (empty)
echo.

echo Instructions:
echo 1. Place your 20 tag image files in the same folder as this script
echo 2. Name them exactly: Tag1.png, Tag2.png, ..., Tag20.png
echo 3. Then run this script to copy them
echo.
echo NOTE: You can also manually copy the files using Windows Explorer to:
echo %DEST%
echo.
pause
