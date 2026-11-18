@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title PROMETEI FM - Owner DJ
set "RADIO_DIR=%~dp0"
set "LIBRARY=C:\TRADER_BOT\MUSIC FOR PROMETEI FM\Моя_YouTube_Медиатека"
set "ENGINE=%RADIO_DIR%prometei_fm_dj.py"
if not exist "%ENGINE%" (
  echo PROMETEI FM DJ engine not found: "%ENGINE%"
  echo Please download prometei_fm_dj.py into the same folder.
  pause
  exit /b 1
)
if not exist "%LIBRARY%" (
  echo Music folder is not present:
  echo "%LIBRARY%"
  pause
  exit /b 1
)
:menu
cls
echo ======================================================
echo                   PROMETEI FM - DJ
echo ======================================================
echo  Local music folder:
echo  %LIBRARY%
echo.
echo  1. SCAN music and inspect names/artists [SAFE]
echo  2. Broadcast to YouTube Live (OBS not required)
echo  3. Broadcast to Icecast HTTPS radio endpoint
echo  4. EXIT
echo.
choice /C 1234 /N /M "Choose [1-4]: "
if errorlevel 4 goto done
if errorlevel 3 goto icecast
if errorlevel 2 goto youtube
if errorlevel 1 goto scan
:scan
echo.
echo Checking all files with ffprobe and preparing name correction lists...
python "%ENGINE%" scan --library "%LIBRARY%"
echo.
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
echo PUBLIC BROADCAST RIGHTS CHECK
echo You must have permission to transmit EACH recording on public radio.
echo Saving a video from YouTube does not grant permission to rebroadcast it.
echo Streaming is not activated until you explicitly enter YES.
set "ACCEPT="
set /p "ACCEPT=I confirm public broadcast rights for all selected tracks [YES to continue]: "
if /I not "%ACCEPT%"=="YES" goto menu
echo.
echo Stream keys and DJ access token will be requested privately.
echo The PC must remain on for the live broadcast.
python "%ENGINE%" broadcast --mode "%FM_MODE%" --rights-confirmed --library "%LIBRARY%"
echo.
pause
goto menu
:done
endlocal
exit /b 0
