@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title PROMETEI FM - Owner DJ
set "ENGINE=%~dp0prometei_fm_dj.py"
if not exist "%ENGINE%" (
  echo DJ Python script not found next to this CMD file.
  echo Put prometei_fm_dj.py in the same directory.
  pause
  exit /b 1
)
set "PYTHON=python.exe"
if exist "C:\Python314\python.exe" set "PYTHON=C:\Python314\python.exe"
:menu
cls
echo ========================================
echo         PROMETEI FM - OWNER DJ
echo ========================================
echo 1. SCAN tags and create correction CSV
echo 2. Broadcast via YouTube Live
echo 3. Broadcast via Icecast
echo 4. EXIT
echo.
choice /C 1234 /N /M "Choose 1-4: "
if errorlevel 4 goto done
if errorlevel 3 goto icecast
if errorlevel 2 goto youtube
if errorlevel 1 goto scan
:scan
"%PYTHON%" "%ENGINE%" scan
if errorlevel 1 echo Scan failed. Check Python, FFmpeg, and music directory.
pause
goto menu
:youtube
set "FM_MODE=youtube"
goto rights
:icecast
set "FM_MODE=icecast"
goto rights
:rights
echo.
echo PUBLIC STREAMING RIGHTS REQUIRED FOR EVERY RECORDING.
echo Downloading music does not grant broadcasting rights.
set "ACCEPT="
set /p "ACCEPT=Type YES to confirm rights and start: "
if /I not "%ACCEPT%"=="YES" goto menu
"%PYTHON%" "%ENGINE%" broadcast --mode "%FM_MODE%" --rights-confirmed
if errorlevel 1 echo Broadcast failed. Check Python, FFmpeg, and stream settings.
pause
goto menu
:done
endlocal
exit /b 0
