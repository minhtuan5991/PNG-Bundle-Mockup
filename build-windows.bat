@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron-builder\out\cli\cli.js" (
  echo Chua co thu vien can thiet. Dang cai dat...
  call npm.cmd install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm.cmd test
if errorlevel 1 (
  pause
  exit /b 1
)
call npm.cmd run build:installer
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Da tao bo cai Windows trong thu muc release.
echo File can gui cho nguoi dung: PNG-Bundle-Mockup-Setup-*.exe
echo latest.yml va *.blockmap dung cho cap nhat tu GitHub Releases.
pause
