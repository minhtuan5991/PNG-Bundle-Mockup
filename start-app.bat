@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Chua co thu vien can thiet. Hay chay: npm.cmd install
  pause
  exit /b 1
)
call npm.cmd start
if errorlevel 1 pause
